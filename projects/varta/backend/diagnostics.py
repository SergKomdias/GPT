"""Only allowlisted diagnoses leave the process; raw FFmpeg stderr stays private."""
from collections import deque
import re

def explain_error(raw):
    text = raw.lower()
    if re.search(r"\boption\b[^\r\n]{0,100}\bnot found\b", text):
        return "FFMPEG_OPTION", "Ця збірка FFmpeg не підтримує параметр запуску."
    checks = [
        (("401 unauthorized", "403 forbidden", "authorization failed"), "AUTH", "Камера відхилила авторизацію RTSP. Перевірте права облікового запису й кодування пароля в URL."),
        (("404 not found",), "STREAM_PATH", "Камера не знайшла запитаний RTSP-потік. Перевірте шлях каналу."),
        (("461 unsupported transport", "unsupported transport"), "TRANSPORT", "Камера не прийняла вибраний транспорт RTSP."),
        (("connection refused",), "REFUSED", "Підключення до RTSP-порту відхилено."),
        (("connection timed out", "operation timed out", "network is unreachable", "no route to host"), "TIMEOUT", "Немає відповіді від камери або мережевого маршруту."),
        (("option not found", "unrecognized option", "error setting option"), "FFMPEG_OPTION", "Ця збірка FFmpeg не підтримує параметр запуску."),
        (("permission denied", "access is denied", "no space left", "error opening output", "could not write header"), "OUTPUT", "Не вдалося відкрити вихід або записати відео. Перевірте папку запису та місце на диску."),
        (("unknown encoder", "encoder not found", "error while opening encoder", "error initializing output stream", "ff_frame_thread_encoder_init failed"), "ENCODER", "Не вдалося запустити кодування кадру попереднього перегляду."),
        (("invalid data found", "could not find codec parameters", "decoder not found"), "CODEC", "Не вдалося розпізнати або декодувати відеопотік."),
    ]
    for needles, code, message in checks:
        if any(word in text for word in needles):
            return code, message
    return "NO_FRAME", "FFmpeg не передав придатного кадру. Запустіть діагностику на базовому ПК."

def collect_stderr(pipe, chunks):
    try:
        while True:
            chunk = pipe.read(4096)
            if not chunk:
                return
            chunks.append(chunk)
    except (OSError, ValueError):
        pass

def error_buffer():
    return deque(maxlen=8)

def buffer_text(chunks):
    return b"".join(list(chunks)).decode("utf-8", errors="replace")
