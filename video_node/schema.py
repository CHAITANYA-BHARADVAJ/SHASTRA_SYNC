"""
schema.py
---------
Builder for Schema A: SensorEvent (Video Perception Node -> Core API).

This is the universal JSON contract from the God Document. It MUST NOT be
modified. This module simply guarantees every payload we emit matches it
exactly.

Schema A:
{
  "type": "SensorEvent",
  "event_id": "uuid",
  "elder_id": "string",
  "event_type": "fall | inactivity | medication_missed | manual_panic |
                 voice_input | emotion_detected | normal",
  "confidence": 0.95,
  "voice_transcript": "string or null",
  "emotion": "sad | fear | happy | neutral | null",
  "timestamp": "ISO8601"
}
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any


def _now_iso() -> str:
    """Timezone-aware ISO8601 timestamp (UTC)."""
    return datetime.now(timezone.utc).isoformat()


# The Hub constrains `emotion` to this set (plus null). DeepFace can return
# other labels (angry, disgust, surprise), so anything outside the contract is
# dropped to None rather than risking a 422 rejection of the whole event.
ALLOWED_EMOTIONS = ("sad", "fear", "happy", "neutral")

# The contract's permitted event_type values.
ALLOWED_EVENT_TYPES = (
    "fall", "inactivity", "medication_missed", "manual_panic",
    "voice_input", "emotion_detected", "normal",
)


def build_sensor_event(
    elder_id: str,
    event_type: str,
    confidence: float,
    emotion: Optional[str] = None,
    voice_transcript: Optional[str] = None,
) -> Dict[str, Any]:
    """Construct a SensorEvent dict conforming exactly to Schema A."""
    if event_type not in ALLOWED_EVENT_TYPES:
        raise ValueError(
            f"event_type {event_type!r} is not in the contract: "
            f"{ALLOWED_EVENT_TYPES}"
        )

    # Normalize emotion to the contract's enum, or null.
    if emotion is not None:
        emotion = str(emotion).lower()
        if emotion not in ALLOWED_EMOTIONS:
            emotion = None

    # Clamp confidence into the 0..1 range the Hub validates against.
    confidence = max(0.0, min(1.0, float(confidence)))

    return {
        "type": "SensorEvent",
        "event_id": str(uuid.uuid4()),
        "elder_id": elder_id,
        "event_type": event_type,
        "confidence": round(confidence, 2),
        "voice_transcript": voice_transcript,
        "emotion": emotion,
        "timestamp": _now_iso(),
    }
