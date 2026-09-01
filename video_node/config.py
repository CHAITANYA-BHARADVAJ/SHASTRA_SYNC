"""
config.py
---------
Central configuration for the Video Perception Node (Teammate 5).

All network endpoints and tunable thresholds are driven by environment
variables so the node can be pointed at a live deployment without code
changes. The God Document is explicit: DO NOT hardcode localhost:8000.
"""

import os
import sys
from pathlib import Path


def app_dir() -> Path:
    """
    Directory the user thinks the app lives in.

    When packaged with PyInstaller, __file__ points inside a temporary
    extraction folder, so we use the .exe's own location instead. That lets
    someone edit .env next to the .exe without rebuilding.
    """
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def bundle_dir() -> Path:
    """Directory holding bundled read-only resources (templates, etc.)."""
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        return Path(meipass)
    return Path(__file__).resolve().parent


def _load_dotenv() -> None:
    """
    Load KEY=VALUE pairs from a .env file into the environment.

    Real environment variables always win, so an explicitly exported value
    overrides the file. Looks next to the executable first (so a packaged
    build stays configurable), then falls back to the bundled copy.
    """
    candidates = [app_dir() / ".env", bundle_dir() / ".env"]
    for env_path in candidates:
        if not env_path.is_file():
            continue
        try:
            for raw in env_path.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
        except OSError:
            continue  # unreadable .env is not fatal
        break  # first readable .env wins


_load_dotenv()


def _get_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _get_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


# --- Network -------------------------------------------------------------
# Base URL of Teammate 1's Core API (the Hub). Default local value is HTTP.
API_URL = os.environ.get("API_URL", "http://localhost:8000")

# Full events endpoint the node POSTs SensorEvents to.
EVENTS_ENDPOINT = f"{API_URL.rstrip('/')}/api/events"

# HTTP request timeout in seconds.
#
# This is deliberately generous. A hosted Hub on a free tier (e.g. Render)
# spins down when idle and can take 50s+ to cold-start. A short timeout would
# silently drop the first fall event after an idle period -- exactly the moment
# the system matters most.
HTTP_TIMEOUT = _get_float("HTTP_TIMEOUT", 60.0)

# How many times to retry a failed POST before giving up on an event.
EVENT_MAX_RETRIES = _get_int("EVENT_MAX_RETRIES", 3)

# Base seconds for exponential backoff between retries (1s, 2s, 4s, ...).
EVENT_RETRY_BACKOFF = _get_float("EVENT_RETRY_BACKOFF", 1.0)

# --- Identity ------------------------------------------------------------
# Which elder this camera is watching. Included in every SensorEvent.
ELDER_ID = os.environ.get("ELDER_ID", "elder_001")

# --- Camera --------------------------------------------------------------
# Index passed to cv2.VideoCapture(). 0 is the default webcam.
CAMERA_INDEX = _get_int("CAMERA_INDEX", 0)

# --- Cooldown ------------------------------------------------------------
# Seconds to suppress duplicate events of the same type after one fires,
# so we do not spam the Hub ~30x/second while the elder is on the floor.
EVENT_COOLDOWN_SECONDS = _get_float("EVENT_COOLDOWN_SECONDS", 10.0)

# --- Fall detection ------------------------------------------------------
# How "horizontal" the torso must become to count as a fall candidate.
# Torso angle is measured from vertical; >= this many degrees is horizontal.
FALL_TORSO_ANGLE_DEG = _get_float("FALL_TORSO_ANGLE_DEG", 55.0)

# How fast the shoulders must drop (normalized y per second) to count as
# a rapid collapse rather than someone slowly lying down.
FALL_DROP_VELOCITY = _get_float("FALL_DROP_VELOCITY", 0.35)

# Minimum landmark visibility (0..1) for the pose to be trusted.
POSE_MIN_VISIBILITY = _get_float("POSE_MIN_VISIBILITY", 0.5)

# --- Emotion detection ---------------------------------------------------
# Analyze emotion every N frames to save CPU (God Document: every 30 frames).
EMOTION_ANALYZE_EVERY_N_FRAMES = _get_int("EMOTION_ANALYZE_EVERY_N_FRAMES", 30)

# Emotions that indicate distress.
DISTRESS_EMOTIONS = ("sad", "fear")

# The distress emotion must persist at least this many seconds before we fire.
EMOTION_SUSTAINED_SECONDS = _get_float("EMOTION_SUSTAINED_SECONDS", 4.0)

# --- Emotion detection: accuracy refinements ------------------------------
# These make the God Document's "if DeepFace returns sad or fear" rule more
# reliable WITHOUT changing the contract or the emitted event. They only
# reduce false positives.

# Ignore an analysis unless DeepFace actually located a face. When no face is
# in frame, DeepFace still returns a low-confidence guess (often "sad" or
# "neutral"); acting on that causes phantom distress alerts.
EMOTION_REQUIRE_FACE = _get_int("EMOTION_REQUIRE_FACE", 1)  # 1=on, 0=off

# Minimum face-detector confidence (0..1) for a face to count as "present".
EMOTION_MIN_FACE_CONFIDENCE = _get_float("EMOTION_MIN_FACE_CONFIDENCE", 0.55)

# Minimum emotion-score (0..1) for a distress label to be trusted. A 26%
# "sad" is noise; require a clearer read before it counts toward distress.
EMOTION_MIN_CONFIDENCE = _get_float("EMOTION_MIN_CONFIDENCE", 0.45)

# Rolling-window vote: keep the last N analyzed frames and only declare
# distress when at least EMOTION_VOTE_RATIO of them are distress. This
# tolerates the occasional flicker frame instead of resetting on every one.
EMOTION_WINDOW = _get_int("EMOTION_WINDOW", 5)
EMOTION_VOTE_RATIO = _get_float("EMOTION_VOTE_RATIO", 0.6)
