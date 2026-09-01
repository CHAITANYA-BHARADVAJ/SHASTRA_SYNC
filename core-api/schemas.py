"""
Pydantic schemas matching the Universal JSON Contracts from the God Document.
These define the exact shape of data flowing between modules.

DO NOT MODIFY the field names/values — other teammates rely on these contracts.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def _now_iso() -> str:
    """Return the current UTC time as an ISO8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _new_uuid() -> str:
    return str(uuid4())


# --------------------------------------------------------------------------- #
# Schema A: SensorEvent  (Simulator / Vision / Elder App  ->  Core API)
# --------------------------------------------------------------------------- #
EventType = Literal[
    "fall",
    "inactivity",
    "medication_missed",
    "manual_panic",
    "voice_input",
    "emotion_detected",
    "normal",
]

Emotion = Literal["sad", "fear", "happy", "neutral"]


class SensorEvent(BaseModel):
    type: Literal["SensorEvent"] = "SensorEvent"
    event_id: str = Field(default_factory=_new_uuid)
    elder_id: str
    event_type: EventType
    confidence: float = 1.0
    voice_transcript: Optional[str] = None
    emotion: Optional[Emotion] = None
    timestamp: str = Field(default_factory=_now_iso)


# --------------------------------------------------------------------------- #
# Schema B: AgentDecision  (Agent  ->  Core API)
# --------------------------------------------------------------------------- #
Severity = Literal["low", "medium", "high", "critical"]
Action = Literal["monitor", "voice_check", "notify_family", "call_emergency"]


class AgentDecision(BaseModel):
    type: Literal["AgentDecision"] = "AgentDecision"
    decision_id: str = Field(default_factory=_new_uuid)
    event_id: str
    severity: Severity
    action: Action
    reasoning_trace: str
    voice_message_to_elder: Optional[str] = None
    language_code: Optional[str] = None
    family_message: Optional[str] = None


# --------------------------------------------------------------------------- #
# Schema C: FamilyAlert  (Core API  ->  Family Dashboard via WebSocket)
# --------------------------------------------------------------------------- #
class FamilyAlert(BaseModel):
    type: Literal["FamilyAlert"] = "FamilyAlert"
    alert_id: str = Field(default_factory=_new_uuid)
    decision_id: str
    message: str
    severity: Severity
    reasoning_trace: str
    timestamp: str = Field(default_factory=_now_iso)


# --------------------------------------------------------------------------- #
# Helper response models
# --------------------------------------------------------------------------- #
class PendingEventsResponse(BaseModel):
    events: List[SensorEvent]
