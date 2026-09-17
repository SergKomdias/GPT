"""Local configuration. Credentials never enter public configuration responses."""
import json
import os
from pathlib import Path
from pydantic import BaseModel, Field, model_validator

ROOT = Path(__file__).resolve().parents[1]

def load_env(path: Path):
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))

class CameraConfig(BaseModel):
    id: str = Field(pattern=r"^cam[1-3]$")
    name: str = Field(min_length=1, max_length=60)
    rtsp_env: str = Field(pattern=r"^VARTA_CAM[1-3]_RTSP$")
    roi: tuple[float, float, float, float] = (0, 0, 1, 1)
    motion_threshold: float = Field(default=0.06, ge=0.005, le=0.9)
    cooldown_seconds: int = Field(default=60, ge=10, le=3600)

    @model_validator(mode="after")
    def valid_roi(self):
        x1, y1, x2, y2 = self.roi
        if not (0 <= x1 < x2 <= 1 and 0 <= y1 < y2 <= 1):
            raise ValueError("ROI must be normalized x1,y1,x2,y2")
        return self

class Config(BaseModel):
    demo: bool = True
    cloud_enabled: bool = False
    model: str = Field(default="gpt-4.1-mini", min_length=1, max_length=100)
    cloud_calls_per_hour: int = Field(default=30, ge=1, le=300)
    recording: bool = True
    retention_days: int = Field(default=7, ge=1, le=90)
    max_recording_gb: float = Field(default=100, ge=0.1, le=4000)
    min_free_gb: float = Field(default=5, ge=0, le=100)
    cameras: list[CameraConfig] = Field(min_length=1, max_length=3)

    @model_validator(mode="after")
    def unique_ids(self):
        if len({c.id for c in self.cameras}) != len(self.cameras):
            raise ValueError("Duplicate camera IDs")
        return self

def load_config():
    load_env(ROOT / ".env")
    path = Path(os.environ.get("VARTA_CONFIG", str(ROOT / "config.local.json")))
    if not path.exists():
        path = ROOT / "config.example.json"
    return Config.model_validate(json.loads(path.read_text(encoding="utf-8-sig")))
