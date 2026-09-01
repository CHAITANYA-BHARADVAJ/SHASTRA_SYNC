"""
test_logic.py
-------------
Unit tests for the detection + dispatch logic that do NOT require a webcam,
a Hub, or real model inference. These verify the parts we actually wrote:
Schema A conformance, the fall geometry math, the sustained-emotion timer,
and the cooldown gate.

Usage:
    python test_logic.py
"""

import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

from console import enable_utf8
enable_utf8()

import sys
import time
import uuid
from datetime import datetime

PASS, FAIL = 0, 0


def check(label, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [PASS] {label}")
    else:
        FAIL += 1
        print(f"  [FAIL] {label} {detail}")


# ---------------------------------------------------------------- Schema A
def test_schema():
    print("\n-- Schema A (SensorEvent) contract --")
    from schema import build_sensor_event

    ev = build_sensor_event("elder_001", "fall", 0.9234)
    expected = {
        "type", "event_id", "elder_id", "event_type",
        "confidence", "voice_transcript", "emotion", "timestamp",
    }
    check("has exactly the 8 contract fields", set(ev) == expected, set(ev) ^ expected)
    check("type == 'SensorEvent'", ev["type"] == "SensorEvent")
    check("event_id is a valid UUID", _is_uuid(ev["event_id"]))
    check("timestamp is valid ISO8601", _is_iso(ev["timestamp"]))
    check("confidence rounded to 2dp", ev["confidence"] == 0.92, ev["confidence"])
    check("emotion defaults to None", ev["emotion"] is None)
    check("voice_transcript defaults to None", ev["voice_transcript"] is None)

    ev2 = build_sensor_event("e1", "emotion_detected", 0.8, emotion="sad")
    check("emotion event carries emotion field", ev2["emotion"] == "sad")
    check("emotion event_type correct", ev2["event_type"] == "emotion_detected")


def _is_uuid(s):
    try:
        uuid.UUID(s); return True
    except Exception:
        return False


def _is_iso(s):
    try:
        datetime.fromisoformat(s); return True
    except Exception:
        return False


# ------------------------------------------------------------ Fall geometry
def test_fall_geometry():
    print("\n-- Fall geometry (torso angle from vertical) --")
    from fall_detector import FallDetector
    ang = FallDetector._torso_angle_from_vertical

    # Standing: shoulders directly above hips -> ~0 deg from vertical.
    upright = ang((0.5, 0.30), (0.5, 0.60))
    check("upright torso ~0 deg", upright < 10, f"got {upright:.1f}")

    # Lying down: shoulders beside hips at same height -> ~90 deg.
    lying = ang((0.20, 0.80), (0.55, 0.80))
    check("horizontal torso ~90 deg", lying > 80, f"got {lying:.1f}")

    # Leaning: diagonal -> intermediate angle.
    leaning = ang((0.40, 0.50), (0.50, 0.60))
    check("leaning torso is intermediate", 30 < leaning < 60, f"got {leaning:.1f}")

    # Threshold sanity: default is 55 deg.
    import config
    check("upright is below fall threshold", upright < config.FALL_TORSO_ANGLE_DEG)
    check("horizontal exceeds fall threshold", lying >= config.FALL_TORSO_ANGLE_DEG)


# ------------------------------------------------------ Emotion refinements
def _emotion_env(scripted):
    """Install a stubbed DeepFace whose output is driven by `scripted`."""
    import types, sys as _sys

    fake = types.ModuleType("deepface")

    class _DF:
        @staticmethod
        def analyze(frame, *a, **k):
            emo = scripted["emotion"]
            conf = scripted["confidence"]
            face = scripted["face"]
            h, w = (frame.shape[0], frame.shape[1]) if hasattr(frame, "shape") else (100, 100)
            if face:
                region = {"x": 10, "y": 10, "w": 40, "h": 40}
                fc = 0.99
            else:
                # No real face: DeepFace returns the whole frame, ~0 confidence.
                region = {"x": 0, "y": 0, "w": w, "h": h}
                fc = 0.0
            return [{
                "dominant_emotion": emo,
                "emotion": {emo: conf * 100},
                "region": region,
                "face_confidence": fc,
            }]

    fake.DeepFace = _DF
    _sys.modules["deepface"] = fake


def test_emotion_window_and_sustain():
    print("\n-- Emotion: rolling window + sustained fire --")
    import numpy as np
    scripted = {"emotion": "sad", "confidence": 0.9, "face": True}
    _emotion_env(scripted)
    from emotion_detector import EmotionDetector

    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    # window=3 so 3 agreeing frames fill it; 0.3s sustain.
    det = EmotionDetector(analyze_every_n=1, window=3, vote_ratio=0.6,
                          sustained_seconds=0.3, min_confidence=0.45,
                          min_face_confidence=0.55)

    r1 = det.process(frame)
    check("first sad frame: window not full, no fire", r1.distress is False)
    det.process(frame)                       # window still filling (2/3)
    r3 = det.process(frame)                  # window now full; sustain timer starts here
    check("window just filled: not yet sustained", r3.distress is False, r3)
    time.sleep(0.35)
    r4 = det.process(frame)                  # window full AND sustained past 0.3s
    check("full window of sad, sustained: FIRES", r4.distress is True, r4)
    check("fired result carries emotion sad", r4.dominant_emotion == "sad")


def test_emotion_requires_face():
    print("\n-- Emotion: face-presence gating --")
    import numpy as np
    scripted = {"emotion": "sad", "confidence": 0.9, "face": False}
    _emotion_env(scripted)
    from emotion_detector import EmotionDetector

    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    det = EmotionDetector(analyze_every_n=1, window=3, vote_ratio=0.6,
                          sustained_seconds=0.0, require_face=True,
                          min_confidence=0.45)
    fired = any(det.process(frame).distress for _ in range(8))
    check("sad with NO face never fires (gated out)", fired is False)

    # Same stream, but face-gating disabled -> it should fire.
    scripted["face"] = False
    det2 = EmotionDetector(analyze_every_n=1, window=3, vote_ratio=0.6,
                           sustained_seconds=0.0, require_face=False,
                           min_confidence=0.45)
    fired2 = any(det2.process(frame).distress for _ in range(8))
    check("with face-gating off, same stream DOES fire", fired2 is True)


def test_emotion_confidence_floor():
    print("\n-- Emotion: confidence floor --")
    import numpy as np
    scripted = {"emotion": "sad", "confidence": 0.20, "face": True}
    _emotion_env(scripted)
    from emotion_detector import EmotionDetector

    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    det = EmotionDetector(analyze_every_n=1, window=3, vote_ratio=0.6,
                          sustained_seconds=0.0, min_confidence=0.45,
                          require_face=True)
    fired = any(det.process(frame).distress for _ in range(8))
    check("low-confidence sad (0.20) never fires", fired is False)


def test_emotion_tolerates_flicker():
    print("\n-- Emotion: tolerates a single flicker frame --")
    import numpy as np
    scripted = {"emotion": "sad", "confidence": 0.9, "face": True}
    _emotion_env(scripted)
    from emotion_detector import EmotionDetector

    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    det = EmotionDetector(analyze_every_n=1, window=5, vote_ratio=0.6,
                          sustained_seconds=0.0, min_confidence=0.45,
                          require_face=True)
    # Prime with sustained distress.
    for _ in range(5):
        det.process(frame)
    fired_before = det.process(frame).distress
    check("steady distress fires", fired_before is True)

    # One neutral flicker: 4/5 still distress >= 0.6 ratio, should hold.
    scripted["emotion"] = "neutral"
    held = det.process(frame).distress
    scripted["emotion"] = "sad"
    check("single flicker frame does NOT drop the alert", held is True)


def test_emotion_frame_skipping():
    print("\n-- Emotion: frame skipping to save CPU --")
    import numpy as np
    scripted = {"emotion": "happy", "confidence": 0.9, "face": True}
    _emotion_env(scripted)
    from emotion_detector import EmotionDetector

    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    det = EmotionDetector(analyze_every_n=3)
    a = det.process(frame); b = det.process(frame); c = det.process(frame)
    check("frames 1,2 skipped (every-3rd analysis)",
          (a.analyzed, b.analyzed) == (False, False))
    check("frame 3 analyzed", c.analyzed is True)

# ------------------------------------------------------------ Cooldown gate
class _Resp:
    def __init__(self, code=200, text="ok"):
        self.status_code = code
        self.text = text

    def raise_for_status(self):
        if self.status_code >= 500:
            import requests
            raise requests.HTTPError(f"HTTP {self.status_code}")


def _stub_session(hub, recorder, code=200):
    """Replace the client's HTTP session with a recording stub."""
    class _S:
        def post(self, url, json=None, timeout=None):
            recorder.append(json)
            return _Resp(code)

        def close(self):
            pass

    hub._session = _S()


def test_cooldown():
    print("\n-- Cooldown gate --")
    from hub_client import HubClient

    sent = []
    # blocking=True so delivery is synchronous and assertions are deterministic.
    hub = HubClient(cooldown_seconds=0.6, blocking=True)
    _stub_session(hub, sent)

    r1 = hub.send_event("fall", 0.9)
    check("first fall event is sent", r1 is not None)
    r2 = hub.send_event("fall", 0.95)
    check("immediate duplicate fall suppressed", r2 is None)
    r3 = hub.send_event("emotion_detected", 0.8, emotion="sad")
    check("different event type NOT suppressed", r3 is not None)

    time.sleep(0.65)
    r4 = hub.send_event("fall", 0.9)
    check("fall allowed again after cooldown expires", r4 is not None)
    check("exactly 3 payloads reached the wire", len(sent) == 3, len(sent))
    check("payloads all conform to Schema A",
          all(p.get("type") == "SensorEvent" for p in sent))


def test_retry_and_rollback():
    print("\n-- Retry with backoff, then cooldown rollback --")
    from hub_client import HubClient
    import requests as _rq

    attempts = {"n": 0}

    class _FailingSession:
        def post(self, url, json=None, timeout=None):
            attempts["n"] += 1
            raise _rq.ConnectionError("hub unreachable")

        def close(self):
            pass

    hub = HubClient(cooldown_seconds=30, blocking=True,
                    max_retries=3, retry_backoff=0.01)
    hub._session = _FailingSession()

    r = hub.send_event("fall", 0.9)
    check("failed delivery returns None", r is None)
    check("retried up to max_retries (3 attempts)", attempts["n"] == 3, attempts["n"])
    check("cooldown rolled back so retry is possible",
          hub._in_cooldown("fall") is False)


def test_transient_then_success():
    print("\n-- Recovers from a transient failure --")
    from hub_client import HubClient
    import requests as _rq

    state = {"n": 0}
    delivered = []

    class _FlakySession:
        def post(self, url, json=None, timeout=None):
            state["n"] += 1
            if state["n"] == 1:
                raise _rq.ConnectionError("cold start timeout")
            delivered.append(json)
            return _Resp(201)

        def close(self):
            pass

    hub = HubClient(cooldown_seconds=30, blocking=True,
                    max_retries=3, retry_backoff=0.01)
    hub._session = _FlakySession()

    r = hub.send_event("fall", 0.9)
    check("event delivered on retry after cold start", r is not None)
    check("exactly one payload landed", len(delivered) == 1, len(delivered))
    check("cooldown retained after success", hub._in_cooldown("fall") is True)


def test_no_retry_on_rejection():
    print("\n-- 4xx rejection is not retried --")
    from hub_client import HubClient

    attempts = {"n": 0}

    class _RejectSession:
        def post(self, url, json=None, timeout=None):
            attempts["n"] += 1
            return _Resp(422, "validation error")

        def close(self):
            pass

    hub = HubClient(cooldown_seconds=30, blocking=True,
                    max_retries=3, retry_backoff=0.01)
    hub._session = _RejectSession()

    r = hub.send_event("fall", 0.9)
    check("rejected event returns None", r is None)
    check("4xx tried only once (no pointless retries)", attempts["n"] == 1, attempts["n"])


def test_contract_guards():
    print("\n-- Contract guards --")
    from schema import build_sensor_event

    # Emotions outside the Hub's enum must be dropped, not sent.
    ev = build_sensor_event("e1", "emotion_detected", 0.8, emotion="angry")
    check("out-of-contract emotion 'angry' dropped to None", ev["emotion"] is None)
    ev = build_sensor_event("e1", "emotion_detected", 0.8, emotion="SAD")
    check("emotion case-normalized to 'sad'", ev["emotion"] == "sad")

    # Confidence clamped to 0..1.
    check("confidence clamped at 1.0",
          build_sensor_event("e1", "fall", 5.0)["confidence"] == 1.0)
    check("confidence clamped at 0.0",
          build_sensor_event("e1", "fall", -3.0)["confidence"] == 0.0)

    # Invalid event_type must raise rather than reach the Hub.
    try:
        build_sensor_event("e1", "not_a_real_type", 0.5)
        check("invalid event_type rejected", False, "no exception raised")
    except ValueError:
        check("invalid event_type rejected", True)

def main():
    print("=" * 62)
    print("  Video Perception Node - Logic Tests")
    print("=" * 62)
    test_schema()
    test_fall_geometry()
    test_emotion_window_and_sustain()
    test_emotion_requires_face()
    test_emotion_confidence_floor()
    test_emotion_tolerates_flicker()
    test_emotion_frame_skipping()
    test_cooldown()
    test_retry_and_rollback()
    test_transient_then_success()
    test_no_retry_on_rejection()
    test_contract_guards()
    print("\n" + "=" * 62)
    print(f"  {PASS} passed, {FAIL} failed")
    print("=" * 62)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
