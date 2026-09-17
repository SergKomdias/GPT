import hashlib
import hmac
import os
import re
import secrets
import time
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from .config import ROOT, load_config
from .service import Service
from .cloud import CloudError

class Login(BaseModel):
    token: str = Field(min_length=1, max_length=256)

class Message(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    camera: str | None = None
    minutes: int = Field(default=60, ge=1, le=1440)

class Pause(BaseModel):
    paused: bool

def create_app(config=None, data=None, workers=True):
    config = config or load_config()
    service = Service(config, data or ROOT / "data")
    token = os.environ.get("VARTA_OPERATOR_TOKEN", "")
    if token and len(token) < 16:
        raise ValueError("VARTA_OPERATOR_TOKEN must contain at least 16 characters")
    cookie = hmac.new(secrets.token_bytes(32), token.encode(), hashlib.sha256).hexdigest()

    @asynccontextmanager
    async def lifespan(app):
        if workers:
            service.start()
        yield
        service.stop()

    app = FastAPI(title="Варта", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.service = service

    @app.middleware("http")
    async def security(request: Request, call_next):
        path = request.url.path
        host = (request.client.host if request.client else "")
        if path.startswith("/api/"):
            # Without an operator token the server is loopback-only, even if accidentally bound to 0.0.0.0.
            if not token and host not in {"127.0.0.1", "::1", "testclient"}:
                return JSONResponse({"detail":"Для доступу з ноутбука задайте VARTA_OPERATOR_TOKEN на міні-ПК."}, status_code=403)
            if request.method not in {"GET", "HEAD"}:
                origin = request.headers.get("origin")
                if origin and urlsplit(origin).netloc != request.headers.get("host"):
                    return JSONResponse({"detail":"Недозволене джерело запиту"}, status_code=403)
            if token and path not in {"/api/login", "/api/session"}:
                supplied = request.cookies.get("varta_session", "")
                if not secrets.compare_digest(supplied, cookie):
                    return JSONResponse({"detail":"Увійдіть із паролем оператора"}, status_code=401)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/api/session")
    def session(request: Request):
        return {"authenticated":not token or secrets.compare_digest(request.cookies.get("varta_session", ""), cookie)}

    @app.post("/api/login")
    def login(body: Login, response: Response):
        if token and not secrets.compare_digest(body.token, token):
            time.sleep(0.3)
            raise HTTPException(401, "Невірний пароль оператора")
        response.set_cookie("varta_session", cookie, httponly=True, samesite="strict", max_age=43200,
                            secure=os.environ.get("VARTA_SECURE_COOKIE") == "1")
        return {"ok":True}

    @app.post("/api/logout")
    def logout(response: Response):
        response.delete_cookie("varta_session")
        return {"ok":True}

    @app.get("/api/status")
    def status():
        return service.status()

    @app.get("/api/events")
    def events(camera: str | None = None, minutes: int = 1440):
        if camera and camera not in service.cameras:
            raise HTTPException(404, "Камеру не знайдено")
        return service.store.events(camera, time.time()-max(1, min(10080, minutes))*60, 300)

    @app.post("/api/events/demo")
    def demo():
        if not config.demo:
            raise HTTPException(409, "Тестові події доступні лише в демонстраційному режимі")
        event_id = service.emit(next(iter(service.cameras)), "test", "Тестова подія для перевірки журналу. Камера не передавала цей запис.", demo=True)
        return service.store.get(event_id)

    @app.post("/api/events/{event_id}/review")
    def review(event_id: str):
        if not service.store.get(event_id):
            raise HTTPException(404, "Подію не знайдено")
        service.store.update(event_id, reviewed=1)
        return {"ok":True}

    @app.get("/api/events/{event_id}/snapshot")
    def snapshot(event_id: str):
        event = service.store.get(event_id)
        if not event or not event["image"]:
            raise HTTPException(404, "Кадру немає")
        path = service.data / "snapshots" / event["image"]
        if not path.exists():
            raise HTTPException(404, "Кадр уже видалено за терміном зберігання")
        return FileResponse(path, media_type="image/jpeg")

    @app.get("/api/cameras/{camera_id}/frame")
    def frame(camera_id: str):
        worker = service.cameras.get(camera_id)
        if not worker:
            raise HTTPException(404, "Камеру не знайдено")
        with worker.lock:
            if not worker.frame or not worker.last_frame or time.time()-worker.last_frame > 10:
                raise HTTPException(503, "Свіжого кадру немає")
            return Response(worker.frame, media_type="image/jpeg")

    @app.post("/api/monitoring")
    def monitoring(body: Pause):
        service.paused = body.paused
        service.store.set_state("paused", body.paused)
        return {"paused":body.paused}

    @app.post("/api/chat")
    def chat(body: Message):
        if body.camera and body.camera not in service.cameras:
            raise HTTPException(404, "Камеру не знайдено")
        try:
            return service.chat(body.message, body.camera, body.minutes)
        except CloudError as exc:
            raise HTTPException(503, str(exc)) from None

    @app.get("/api/recordings")
    def recordings(camera: str | None = None):
        if camera and camera not in service.cameras:
            raise HTTPException(404, "Камеру не знайдено")
        root = service.data / "recordings"
        paths = root.glob(f"{camera or 'cam[1-3]'}/*.mkv") if root.exists() else []
        result = []
        for path in paths:
            stat = path.stat()
            if time.time()-stat.st_mtime >= 180:
                result.append({"camera":path.parent.name, "name":path.name, "bytes":stat.st_size, "ts":stat.st_mtime})
        return sorted(result, key=lambda r:r["ts"], reverse=True)[:300]

    @app.get("/api/recordings/{camera}/{name}")
    def recording(camera: str, name: str):
        if camera not in service.cameras or not re.fullmatch(r"\d{8}_\d{6}\.mkv", name):
            raise HTTPException(404)
        path = service.data / "recordings" / camera / name
        if not path.exists() or time.time()-path.stat().st_mtime < 180:
            raise HTTPException(404, "Фрагмент ще записується або відсутній")
        return FileResponse(path, filename=name, media_type="video/x-matroska")

    if (ROOT / "dist").exists():
        app.mount("/", StaticFiles(directory=ROOT / "dist", html=True), name="ui")
    return app
