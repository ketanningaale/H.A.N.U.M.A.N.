import datetime
import logging
import numpy as np
import yaml

logger = logging.getLogger(__name__)

_face_bbox_height: float = 0.0   # updated by awareness/face_recognition.py
_noise_db: float = 50.0          # updated by awareness/noise_monitor.py


def update_face_distance(bbox_height_px: float):
    global _face_bbox_height
    _face_bbox_height = bbox_height_px


def update_noise_level(db: float):
    global _noise_db
    _noise_db = db


def _load_cfg() -> dict:
    with open("config/settings.yaml") as f:
        return yaml.safe_load(f)["volume"]


def _noise_multiplier(cfg: dict) -> float:
    for entry in cfg["noise_map"]:
        if _noise_db <= entry["max_db"]:
            return entry["multiplier"]
    return 1.0


def _time_multiplier(cfg: dict) -> float:
    hour = datetime.datetime.now().hour
    for entry in cfg["time_map"]:
        if entry["start"] <= hour < entry["end"]:
            return entry["multiplier"]
    return 1.0


def _distance_multiplier(cfg: dict) -> float:
    if _face_bbox_height <= 0:
        return 1.0  # no face detected — use baseline
    for entry in sorted(cfg["distance_map"], key=lambda e: e["min_px"], reverse=True):
        if _face_bbox_height >= entry["min_px"]:
            return entry["multiplier"]
    return 1.0


def get_volume() -> float:
    """Compute final playback volume from noise, time, and distance."""
    cfg = _load_cfg()
    base = cfg.get("base", 0.85)
    vol = base * _noise_multiplier(cfg) * _time_multiplier(cfg) * _distance_multiplier(cfg)
    clamped = max(cfg.get("min", 0.25), min(cfg.get("max", 1.0), vol))
    logger.debug(
        f"Volume: base={base:.2f} noise×{_noise_multiplier(cfg):.2f} "
        f"time×{_time_multiplier(cfg):.2f} distance×{_distance_multiplier(cfg):.2f} "
        f"→ {clamped:.2f}"
    )
    return clamped
