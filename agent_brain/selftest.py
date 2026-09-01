"""
selftest.py - Offline verification that does NOT call the network or the LLM.

Checks:
  - schemas import & validate the God Document contracts
  - business-rule enforcement (fall->high/voice_check, panic->critical/call_emergency)
  - prompt building works for representative events

Run:  python selftest.py
"""

from __future__ import annotations

from llm_client import LLMClient
from prompt import build_user_prompt
from schemas import AgentDecision, SensorEvent


def _sample(event_type, **kw) -> SensorEvent:
    return SensorEvent(
        event_id=f"evt-{event_type}",
        elder_id="kamala",
        event_type=event_type,
        **kw,
    )


def _base_decision(event_id: str) -> AgentDecision:
    # A deliberately "wrong" decision to prove the safety net corrects it.
    return AgentDecision(
        event_id=event_id,
        severity="low",
        action="monitor",
        reasoning_trace="placeholder",
        voice_message_to_elder="ok",
        language_code="en-US",
        family_message="ok",
    )


def test_fall_rule():
    ev = _sample("fall", emotion="fear", confidence=0.97)
    fixed = LLMClient._enforce_business_rules(ev, _base_decision(ev.event_id))
    assert fixed.severity == "high", fixed.severity
    assert fixed.action == "voice_check", fixed.action
    print("PASS  fall -> severity=high, action=voice_check")


def test_panic_rule():
    ev = _sample("manual_panic")
    fixed = LLMClient._enforce_business_rules(ev, _base_decision(ev.event_id))
    assert fixed.severity == "critical", fixed.severity
    assert fixed.action == "call_emergency", fixed.action
    print("PASS  manual_panic -> severity=critical, action=call_emergency")


def test_normal_rule():
    ev = _sample("normal")
    fixed = LLMClient._enforce_business_rules(ev, _base_decision(ev.event_id))
    assert fixed.severity == "low" and fixed.action == "monitor"
    print("PASS  normal -> severity=low, action=monitor")


def test_empty_fields_backfilled():
    ev = _sample("emotion_detected", emotion="sad")
    d = _base_decision(ev.event_id)
    d.voice_message_to_elder = "   "
    d.language_code = ""
    d.family_message = ""
    fixed = LLMClient._enforce_business_rules(ev, d)
    assert fixed.voice_message_to_elder.strip()
    assert fixed.language_code.strip()
    assert fixed.family_message.strip()
    print("PASS  empty required strings are backfilled")


def test_prompt_building():
    ev = _sample("voice_input", voice_transcript="Mujhe madad chahiye")
    prompt = build_user_prompt(ev)
    assert "Mujhe madad chahiye" in prompt
    assert "voice_input" in prompt
    print("PASS  prompt building includes event data")


def test_schema_roundtrip():
    ev = _sample("fall", emotion="fear")
    dumped = ev.model_dump()
    assert dumped["type"] == "SensorEvent"
    reparsed = SensorEvent.model_validate(dumped)
    assert reparsed.event_id == ev.event_id
    print("PASS  SensorEvent round-trips through JSON")


if __name__ == "__main__":
    print("Running offline self-tests for the AI Brain...\n")
    test_schema_roundtrip()
    test_fall_rule()
    test_panic_rule()
    test_normal_rule()
    test_empty_fields_backfilled()
    test_prompt_building()
    print("\nAll offline self-tests passed. ✅")
