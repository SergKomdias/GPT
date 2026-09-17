import datetime
import json
import threading
import time
from .store import Store
from .cloud import Cloud, CloudError
from .cameras import CameraWorker, clean_recordings

class Service:
    def __init__(self, config, data):
        self.config, self.data = config, data
        self.store = Store(data)
        self.cloud = Cloud(config)
        self.stop_event = threading.Event()
        self.paused = self.store.get_state("paused", False)
        self.storage_ok = True
        self.storage_bytes = 0
        self.started = time.time()
        self.cameras = {c.id: CameraWorker(c, self) for c in config.cameras}
        self.threads = []

    def start(self):
        self.maintenance()
        for camera in self.cameras.values():
            camera.start()
        for target in (self.cloud_loop, self.maintenance_loop):
            thread = threading.Thread(target=target, daemon=True)
            thread.start()
            self.threads.append(thread)

    def stop(self):
        self.stop_event.set()
        for camera in self.cameras.values():
            camera.stop()
        for thread in self.threads:
            thread.join(timeout=30)
        self.store.close()

    def emit(self, camera, kind, description, image=None, demo=False):
        return self.store.add(camera, kind, description, image, pending=bool(image) and self.cloud.ready, demo=demo)

    def cloud_loop(self):
        while not self.stop_event.wait(1):
            if not self.cloud.ready or self.paused:
                continue
            event = self.store.next_pending()
            if not event:
                continue
            if not self.store.reserve_call(self.config.cloud_calls_per_hour):
                self.stop_event.wait(10)
                continue
            attempts = event["attempts"] + 1
            self.store.update(event["id"], cloud_status="processing", attempts=attempts)
            try:
                image = (self.data / "snapshots" / event["image"]).read_bytes()
                when = datetime.datetime.fromtimestamp(event["ts"], datetime.timezone.utc).isoformat()
                answer = self.cloud.request(f"Подія {event['kind']}; камера {event['camera']}; UTC {when}. Опиши кадр у 1–3 реченнях. Не вигадуй причину спрацювання.", image)
                self.store.update(event["id"], description=answer, cloud_status="done")
            except (CloudError, OSError):
                self.store.update(event["id"], cloud_status="retry" if attempts < 3 else "error", next_try=time.time()+30*2**attempts)

    def maintenance(self):
        try:
            self.storage_bytes, self.storage_ok = clean_recordings(self.data, self.config.retention_days,
                int(self.config.max_recording_gb*1e9), int(self.config.min_free_gb*1e9))
            self.store.prune(time.time()-self.config.retention_days*86400)
        except OSError:
            self.storage_ok = False

    def maintenance_loop(self):
        while not self.stop_event.wait(30):
            self.maintenance()

    def status(self):
        return {"demo":self.config.demo, "paused":self.paused, "cameras":[c.public() for c in self.cameras.values()],
                "cloud":{"configured":self.cloud.ready, "error":self.cloud.last_error,
                         "calls":self.store.calls_last_hour(), "limit":self.config.cloud_calls_per_hour,
                         "model":self.config.model},
                "recording":{"enabled":self.config.recording and not self.config.demo,
                             "active":sum(c.recording for c in self.cameras.values()),
                             "storage_ok":self.storage_ok, "bytes":self.storage_bytes,
                             "retention_days":self.config.retention_days}, "uptime":int(time.time()-self.started)}

    def chat(self, question, camera=None, minutes=60):
        events = self.store.events(camera, time.time()-minutes*60, 100)
        entries = [{"time_utc":datetime.datetime.fromtimestamp(e["ts"], datetime.timezone.utc).isoformat(),
                    "camera":e["camera"], "description":e["description"], "demo":bool(e["demo"]),
                    "source":"AI" if e["cloud_status"] == "done" else "local"} for e in events]
        if not self.cloud.ready:
            if not entries:
                answer = f"За останні {minutes} хв у вибраній частині журналу подій немає. Це не підтверджує відсутність активності: перевірте стан камер. Хмарний ШІ не підключено."
            else:
                lines = []
                for e in events[:5]:
                    when = datetime.datetime.fromtimestamp(e["ts"]).strftime("%H:%M:%S")
                    lines.append(f"• {when}, {self.cameras[e['camera']].camera.name}: {e['description']}")
                answer = f"Локальна вибірка за {minutes} хв. Кількість подій: {len(entries)} (до 100). Останні записи:\n" + "\n".join(lines) + "\nХмарний ШІ не підключено; це вибірка журналу, а не відповідь мовної моделі."
            return {"answer":answer, "source":"local", "event_ids":[e["id"] for e in events[:5]]}
        if not self.store.reserve_call(self.config.cloud_calls_per_hour):
            raise CloudError("Вичерпано ліміт запитів за годину. Запис камер продовжується.")
        answer = self.cloud.request(f"Запит оператора: {question}\nВибірка: до 100 останніх подій за {minutes} хв; камера: {camera or 'усі'}. Це не повний відеоархів. Дані JSON:\n" + json.dumps(entries, ensure_ascii=False))
        return {"answer":answer, "source":"cloud", "event_ids":[e["id"] for e in events]}
