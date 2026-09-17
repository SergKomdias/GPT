"""Read-only camera ingest: FFmpeg recording and sampled previews; no PTZ or actuators."""
import os
import queue
import shutil
import subprocess
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit
import cv2
import numpy as np
import imageio_ffmpeg
from .diagnostics import explain_error, collect_stderr, error_buffer, buffer_text

class MotionDetector:
    def __init__(self, config):
        self.config = config
        self.previous = None
        self.consecutive = 0
        self.last_motion = -float("inf")
        self.dark_frames = 0
        self.dark_reported = False

    def inspect(self, frame, now):
        small = cv2.resize(frame, (320, 180))
        gray = cv2.GaussianBlur(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY), (9, 9), 0)
        x1, y1, x2, y2 = self.config.roi
        region = gray[int(y1*180):max(int(y1*180)+1,int(y2*180)), int(x1*320):max(int(x1*320)+1,int(x2*320))]
        # Deliberately labeled dark frame, not a definitive obstruction diagnosis.
        dark = float(gray.mean()) < 12
        self.dark_frames = self.dark_frames + 1 if dark else 0
        if not dark:
            self.dark_reported = False
        event = None
        if self.dark_frames >= 10 and not self.dark_reported:
            self.dark_reported = True
            event = "dark"
        if self.previous is not None and self.previous.shape == region.shape:
            change = np.mean(cv2.absdiff(region, self.previous) > 25)
            self.consecutive = self.consecutive + 1 if change >= self.config.motion_threshold and not dark else 0
            if self.consecutive >= 2 and now-self.last_motion >= self.config.cooldown_seconds:
                self.last_motion = now
                self.consecutive = 0
                event = "motion"
        self.previous = region.copy()
        return event

def valid_rtsp(value):
    try:
        parsed = urlsplit(value)
        return parsed.scheme in {"rtsp", "rtsps"} and bool(parsed.hostname) and bool(parsed.port or 554)
    except ValueError:
        return False

class CameraWorker:
    def __init__(self, camera, service):
        self.camera, self.service = camera, service
        self.lock = threading.Lock()
        self.status = "demo" if service.config.demo else "unconfigured"
        self.frame = None
        self.last_frame = None
        self.recording = False
        self.thread = None
        self.process = None
        self.last_error = None

    def public(self):
        with self.lock:
            return {"id":self.camera.id, "name":self.camera.name, "status":self.status,
                    "last_frame":self.last_frame, "recording":self.recording,
                    "error":self.last_error,
                    "roi":self.camera.roi, "motion_threshold":self.camera.motion_threshold,
                    "cooldown_seconds":self.camera.cooldown_seconds}

    def start(self):
        if not self.service.config.demo:
            self.thread = threading.Thread(target=self.run, daemon=True)
            self.thread.start()

    def stop(self):
        if self.thread:
            self.thread.join(timeout=8)
        if self.thread and self.thread.is_alive() and self.process and self.process.poll() is None:
            self.process.kill()
            self.thread.join(timeout=5)

    @staticmethod
    def frames_from_pipe(pipe, frames):
        buffer = bytearray()
        try:
            while True:
                part = pipe.read(8192)
                if not part:
                    break
                buffer.extend(part)
                while True:
                    start, end = buffer.find(b"\xff\xd8"), buffer.find(b"\xff\xd9")
                    if start < 0 or end < start:
                        break
                    frame = bytes(buffer[start:end+2])
                    del buffer[:end+2]
                    try:
                        frames.put_nowait(frame)
                    except queue.Full:
                        try:
                            frames.get_nowait()
                        except queue.Empty:
                            pass
                        frames.put_nowait(frame)
                if len(buffer) > 4_000_000:
                    buffer.clear()
        except (OSError, ValueError):
            pass

    def command(self, url, recording):
        executable = os.environ.get("VARTA_FFMPEG") or imageio_ffmpeg.get_ffmpeg_exe()
        command = [executable, "-hide_banner", "-loglevel", "error", "-rtsp_transport", "tcp",
                   "-timeout", "10000000", "-i", url]
        if recording:
            folder = self.service.data / "recordings" / self.camera.id
            folder.mkdir(parents=True, exist_ok=True)
            command += ["-map", "0:v:0", "-an", "-c:v", "copy", "-f", "segment", "-segment_time", "60",
                        "-reset_timestamps", "1", "-strftime", "1", str(folder / "%Y%m%d_%H%M%S.mkv")]
        command += ["-map", "0:v:0", "-an", "-vf", "fps=2,scale=640:-2", "-c:v", "mjpeg", "-q:v", "5",
                    "-f", "image2pipe", "pipe:1"]
        return command

    def run(self):
        url = os.environ.get(self.camera.rtsp_env, "")
        if not url:
            return
        if not valid_rtsp(url):
            self.status = "invalid_config"
            return
        had_connection = False
        offline_reported = False
        previous_error = None
        while not self.service.stop_event.is_set():
            self.status = "connecting"
            frames = queue.Queue(maxsize=2)
            detector = MotionDetector(self.camera)
            record = self.service.config.recording and self.service.storage_ok
            errors = error_buffer()
            error_reader = None
            self.process = None
            try:
                self.process = subprocess.Popen(self.command(url, record), stdout=subprocess.PIPE, stdin=subprocess.PIPE,
                                                stderr=subprocess.PIPE, bufsize=0,
                                                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                error_reader = threading.Thread(target=collect_stderr, args=(self.process.stderr, errors), daemon=True)
                error_reader.start()
                reader = threading.Thread(target=self.frames_from_pipe, args=(self.process.stdout, frames), daemon=True)
                reader.start()
                last_received = time.monotonic()
                while not self.service.stop_event.is_set() and self.process.poll() is None:
                    if record != (self.service.config.recording and self.service.storage_ok):
                        break
                    try:
                        jpeg = frames.get(timeout=1)
                    except queue.Empty:
                        if time.monotonic()-last_received > 20:
                            break
                        continue
                    frame = cv2.imdecode(np.frombuffer(jpeg, np.uint8), cv2.IMREAD_COLOR)
                    if frame is None:
                        continue
                    last_received = time.monotonic()
                    with self.lock:
                        self.frame, self.last_frame = jpeg, time.time()
                        self.status, self.recording = "online", record
                        self.last_error = None
                    if offline_reported:
                        self.service.emit(self.camera.id, "restored", "Відеозв’язок відновлено.")
                        offline_reported = False
                    had_connection = True
                    if not self.service.paused:
                        kind = detector.inspect(frame, time.monotonic())
                        if kind:
                            text = "Зміна зображення в зоні спостереження. Потрібна перевірка оператора." if kind == "motion" else "Кадр тривалий час дуже темний. Перевірте освітлення й огляд камери."
                            self.service.emit(self.camera.id, kind, text, jpeg)
            except (OSError, RuntimeError):
                self.last_error = "PROCESS: Не вдалося запустити FFmpeg або записати дані на диск."
            finally:
                if self.process:
                    if self.process.poll() is None:
                        try:
                            self.process.stdin.write(b"q\n")
                            self.process.stdin.flush()
                        except (OSError, ValueError):
                            pass
                    try:
                        self.process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        self.process.kill()
                        self.process.wait(timeout=5)
                    if self.process.stdout:
                        self.process.stdout.close()
                    if self.process.stdin:
                        self.process.stdin.close()
                    if error_reader:
                        error_reader.join(timeout=2)
                    if self.process.stderr:
                        self.process.stderr.close()
                    code, message = explain_error(buffer_text(errors))
                    self.last_error = f"{code}: {message}"
                with self.lock:
                    self.status, self.recording, self.frame = "offline", False, None
            if not self.service.stop_event.is_set() and (not offline_reported or previous_error != self.last_error):
                description = "Втрачено відеозв’язок." if had_connection else "Не вдалося отримати відео. Перевірте адресу, облікові дані та мережу."
                self.service.emit(self.camera.id, "offline", description + " " + (self.last_error or ""))
                offline_reported = True
                previous_error = self.last_error
            self.service.stop_event.wait(5)

def clean_recordings(data: Path, days: int, max_bytes: int, min_free_bytes: int):
    """Delete only closed, owned recording segments; never touch arbitrary directories."""
    root = (data / "recordings").resolve()
    files = sorted(root.glob("cam[1-3]/*.mkv"), key=lambda p: p.stat().st_mtime) if root.exists() else []
    total = sum(p.stat().st_size for p in files)
    now = time.time()
    for path in files:
        if not path.resolve().is_relative_to(root) or now-path.stat().st_mtime < 180:
            continue
        if now-path.stat().st_mtime > days*86400 or total > max_bytes or shutil.disk_usage(data).free < min_free_bytes:
            size = path.stat().st_size
            path.unlink(missing_ok=True)
            total -= size
    return total, shutil.disk_usage(data).free >= min_free_bytes
