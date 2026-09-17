import json
import sqlite3
import threading
import time
import uuid
from pathlib import Path

class Store:
    def __init__(self, directory: Path):
        self.directory = directory
        directory.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.db = sqlite3.connect(directory / "events.sqlite3", check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY, ts REAL NOT NULL, camera TEXT NOT NULL,
                kind TEXT NOT NULL, description TEXT NOT NULL, image TEXT,
                cloud_status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
                next_try REAL NOT NULL DEFAULT 0, reviewed INTEGER NOT NULL DEFAULT 0,
                demo INTEGER NOT NULL DEFAULT 0);
            CREATE INDEX IF NOT EXISTS events_time ON events(ts);
            CREATE TABLE IF NOT EXISTS calls (ts REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        """)
        self.db.commit()
        # A crash may leave a request in flight; do not resubmit it automatically.
        self.db.execute("UPDATE events SET cloud_status='error' WHERE cloud_status='processing'")
        self.db.commit()

    def add(self, camera, kind, description, image=None, pending=False, demo=False):
        event_id = uuid.uuid4().hex
        image_name = None
        if image:
            folder = self.directory / "snapshots"
            folder.mkdir(exist_ok=True)
            image_name = event_id + ".jpg"
            (folder / image_name).write_bytes(image)
        with self.lock, self.db:
            self.db.execute("INSERT INTO events(id,ts,camera,kind,description,image,cloud_status,demo) VALUES(?,?,?,?,?,?,?,?)",
                            (event_id, time.time(), camera, kind, description, image_name,
                             "pending" if pending and not demo else "disabled", int(demo)))
        return event_id

    def events(self, camera=None, since=0, limit=100):
        with self.lock:
            rows = self.db.execute("SELECT * FROM events WHERE ts>=? AND (? IS NULL OR camera=?) ORDER BY ts DESC LIMIT ?",
                                   (since, camera, camera, min(500, limit))).fetchall()
        return [dict(row) for row in rows]

    def get(self, event_id):
        with self.lock:
            row = self.db.execute("SELECT * FROM events WHERE id=?", (event_id,)).fetchone()
        return dict(row) if row else None

    def update(self, event_id, **fields):
        allowed = {"description", "cloud_status", "attempts", "next_try", "reviewed"}
        if not fields or not set(fields).issubset(allowed):
            raise ValueError("Unsupported event fields")
        with self.lock, self.db:
            self.db.execute("UPDATE events SET " + ",".join(f"{k}=?" for k in fields) + " WHERE id=?",
                            (*fields.values(), event_id))

    def next_pending(self):
        with self.lock:
            row = self.db.execute("SELECT * FROM events WHERE cloud_status IN ('pending','retry') AND next_try<=? AND attempts<3 AND demo=0 ORDER BY ts LIMIT 1", (time.time(),)).fetchone()
        return dict(row) if row else None

    def reserve_call(self, limit, now=None):
        now = time.time() if now is None else now
        with self.lock, self.db:
            self.db.execute("DELETE FROM calls WHERE ts<?", (now - 3600,))
            count = self.db.execute("SELECT COUNT(*) FROM calls").fetchone()[0]
            if count >= limit:
                return False
            self.db.execute("INSERT INTO calls VALUES(?)", (now,))
        return True

    def calls_last_hour(self):
        with self.lock:
            return self.db.execute("SELECT COUNT(*) FROM calls WHERE ts>=?", (time.time()-3600,)).fetchone()[0]

    def get_state(self, key, default=None):
        with self.lock:
            row = self.db.execute("SELECT value FROM state WHERE key=?", (key,)).fetchone()
        return json.loads(row[0]) if row else default

    def set_state(self, key, value):
        with self.lock, self.db:
            self.db.execute("INSERT OR REPLACE INTO state VALUES(?,?)", (key, json.dumps(value)))

    def prune(self, cutoff):
        with self.lock, self.db:
            rows = self.db.execute("SELECT image FROM events WHERE ts<? AND cloud_status!='processing'", (cutoff,)).fetchall()
            self.db.execute("DELETE FROM events WHERE ts<? AND cloud_status!='processing'", (cutoff,))
        for row in rows:
            if row[0]:
                (self.directory / "snapshots" / row[0]).unlink(missing_ok=True)

    def close(self):
        self.db.close()
