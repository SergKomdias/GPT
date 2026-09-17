"""Run on the base station: python -m backend.diagnose. No raw URLs are printed."""
import os
from pathlib import Path
import subprocess
import tempfile
import cv2
import numpy as np
import imageio_ffmpeg
from .config import ROOT, load_config
from .cameras import valid_rtsp
from .diagnostics import explain_error

def main():
    preexisting = {f"VARTA_CAM{i}_RTSP" for i in range(1,4) if os.environ.get(f"VARTA_CAM{i}_RTSP")}
    config = load_config()
    lines = []
    def report(line):
        lines.append(line)
        print(line, flush=True)
    report("ВАРТА: перевірка RTSP. Адреси, логіни й паролі у звіт не включаються.")
    report(f"Режим demo: {config.demo}. Камер у конфігурації: {len(config.cameras)}.")
    for key in sorted(preexisting):
        report(f"ENV_OVERRIDE: {key} задано у середовищі — це значення має пріоритет над файлом .env.")
    data = ROOT / "data"
    try:
        data.mkdir(exist_ok=True)
        with tempfile.TemporaryFile(dir=data) as f:
            f.write(b"varta disk test"); f.flush()
        report("DISK_WRITE: OK")
    except OSError:
        report("DISK_WRITE: ERROR — папка data недоступна для запису.")
    exe = os.environ.get("VARTA_FFMPEG") or imageio_ffmpeg.get_ffmpeg_exe()
    for camera in config.cameras:
        url = os.environ.get(camera.rtsp_env, "")
        if not url or not valid_rtsp(url):
            report(f"{camera.id}: NOT_CONFIGURED — немає коректної RTSP-адреси.")
            continue
        for transport in ("tcp", "udp"):
            report(f"{camera.id}: перевіряю {transport.upper()}, до 20 секунд…")
            command = [exe, "-hide_banner", "-loglevel", "error", "-nostdin", "-rtsp_transport", transport,
                       "-timeout", "10000000", "-i", url, "-map", "0:v:0", "-an", "-frames:v", "1",
                       "-vf", "scale=640:-2", "-c:v", "mjpeg", "-q:v", "5", "-f", "image2pipe", "pipe:1"]
            try:
                r = subprocess.run(command, capture_output=True, timeout=20,
                                   creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
                image = cv2.imdecode(np.frombuffer(r.stdout,np.uint8),cv2.IMREAD_COLOR) if r.stdout else None
                if image is not None:
                    report(f"{camera.id} {transport.upper()}: FRAME_OK — відео отримано й декодовано.")
                    break
                code, message = explain_error(r.stderr.decode("utf-8",errors="replace"))
                report(f"{camera.id} {transport.upper()}: {code} — {message}")
            except subprocess.TimeoutExpired:
                report(f"{camera.id} {transport.upper()}: TIMEOUT — за 20 секунд кадр не отримано.")
            except (OSError, ValueError, cv2.error):
                report(f"{camera.id} {transport.upper()}: PROCESS_OR_FRAME — не вдалося запустити процес або прочитати кадр.")
    try:
        (data / "diagnostics.txt").write_text("\n".join(lines),encoding="utf-8")
        report("Звіт збережено: data/diagnostics.txt. Надішліть його текст для перевірки.")
    except OSError:
        report("Не вдалося зберегти звіт. Скопіюйте повідомлення з цього вікна.")

if __name__ == "__main__":
    main()
