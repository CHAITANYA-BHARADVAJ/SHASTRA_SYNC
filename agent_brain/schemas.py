"""
schemas.py - The Universal JSON Contracts for Shastra Sync.

These Pydantic models mirror the schemas in AI_DEVELOPMENT_MASTER_FILE.md EXACTLY.
DO NOT MODIFY the field names or the allowed values, or you will break the
contract with the rest of the team (Hub, Tablet, Dashboard, Simulator).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field


# --- Allowed value sets (kept as Literals so the LLM & validators enforce them) ---
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

Severity = Literal["low", "medium", "high", "critical"]

Action = Literal["monitor", "voice_check", "notify_family", "call_emergency"]


def _now_iso() -> str:
    """Return the current time as an ISO8601 string (UTC)."""
    return datetime.now(timezone.utc).isoformat()


def _new_uuid() -> str:
    return str(uuid.uuid4())


class SensorEvent(BaseModel):
    """Schema A: Simulator/Tablet -> Core API -> (polled by) this Agent."""

    type: Literal["SensorEvent"] = "SensorEvent"
    event_id: str
    elder_id: str
    event_type: EventType
    confidence: float = 0.95
    voice_transcript: Optional[str] = None
    emotion: Optional[Emotion] = None
    timestamp: str = Field(default_factory=_now_iso)

    # The Hub may send extra/unknown fields; be lenient on input so we never
    # crash on a payload we didn't strictly expect.
    model_config = {"extra": "ignore"}


class AgentDecision(BaseModel):
    """Schema B: This Agent -> Core API.

    This is ALSO the structured-output shape we force the LLM to produce.
    """

    type: Literal["AgentDecision"] = "AgentDecision"
    decision_id: str = Field(default_factory=_new_uuid)
    event_id: str
    severity: Severity
    action: Action
    reasoning_trace: str
    voice_message_to_elder: str
    language_code: str = Field(
        description="BCP-47 language code for TTS, e.g. 'hi-IN', 'en-US', 'ta-IN'."
    )
    family_message: str

    model_config = {"extra": "ignore"}


class LLMDecision(BaseModel):
    """
    The subset of AgentDecision that the LLM is asked to generate.

    We deliberately exclude `type`, `decision_id`, and `event_id` from the
    LLM's job: those are filled in deterministically by our code so they can
    never be hallucinated or malformed. Everything else comes from the model.
    """

    severity: Severity
    action: Action
    reasoning_trace: str = Field(
        description="A short, empathetic explanation of the situation and why "
        "this action/severity was chosen."
    )
    voice_message_to_elder: str = Field(
        description="A warm, comforting message spoken TO the elder, in THEIR "
        "language (matching language_code)."
    )
    language_code: str = Field(
        description="BCP-47 code matching the elder's language, e.g. 'hi-IN'."
    )
    family_message: str = Field(
        description="A concise, calm status update for the family in English."
    )

    model_config = {"extra": "ignore"}

    def to_agent_decision(self, event_id: str) -> AgentDecision:
        """Promote the LLM's partial decision into the full contract object."""
        return AgentDecision(
            event_id=event_id,
            severity=self.severity,
            action=self.action,
            reasoning_trace=self.reasoning_trace,
            voice_message_to_elder=self.voice_message_to_elder,
            language_code=self.language_code,
            family_message=self.family_message,
        )
