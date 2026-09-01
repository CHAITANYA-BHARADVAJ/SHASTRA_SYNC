"""
agent.py - The Shastra Sync AI Brain (Teammate 2).

A continuous background loop:
  1. Every POLL_INTERVAL_SECONDS, ask the Hub for pending events.
  2. For each new SensorEvent, ask the LLM to make an empathetic decision
     (structured output -> AgentDecision).
  3. POST the AgentDecision back to the Hub, which stores + broadcasts it.

Run:  python agent.py
"""

from __future__ import annotations

import time

import requests

from config import Config
from hub_client import HubClient
from llm_client import LLMClient
from schemas import SensorEvent


def _banner(config: Config) -> None:
    print("=" * 68)
    print("  SHASTRA SYNC - AI Brain (Teammate 2)")
    print("=" * 68)
    print(f"  Hub API        : {config.api_url}")
    print(f"  LLM provider   : {config.provider}")
    print(f"  LLM model      : {config.active_model()}")
    print(f"  Poll interval  : {config.poll_interval}s")
    print("=" * 68)
    if config.provider == "openai":
        print("  NOTE: gpt-4o is a PAID model. If you have no credits, set")
        print("        LLM_PROVIDER=openrouter to use a FREE model instead.")
    else:
        print("  Using OpenRouter FREE tier. Get a key at openrouter.ai/keys")
    print()


def process_event(
    event: SensorEvent,
    llm: LLMClient,
    hub: HubClient,
    seen: set,
) -> None:
    if event.event_id in seen:
        return
    seen.add(event.event_id)

    print(
        f"[event] {event.event_type} | elder={event.elder_id} "
        f"| emotion={event.emotion} | transcript={event.voice_transcript!r}"
    )

    try:
        decision = llm.decide(event)
    except Exception as exc:  # noqa: BLE001
        print(f"[llm] decision failed for {event.event_id}: {exc}")
        seen.discard(event.event_id)  # allow a retry on the next poll
        return

    print(
        f"[decision] severity={decision.severity} action={decision.action} "
        f"lang={decision.language_code}"
    )
    print(f"           reasoning: {decision.reasoning_trace}")
    print(f"           to elder : {decision.voice_message_to_elder}")

    try:
        hub.post_decision(decision)
        print(f"[hub] decision {decision.decision_id} sent.\n")
    except Exception as exc:  # noqa: BLE001
        print(f"[hub] failed to post decision: {exc}")
        seen.discard(event.event_id)  # retry next poll


def main() -> None:
    config = Config.load()
    _banner(config)

    llm = LLMClient(config)
    hub = HubClient(config.api_url)

    # Track events we've already acted on. The Hub's /pending endpoint should
    # stop returning an event once its decision is stored, but this guards
    # against overlap during the round-trip.
    seen: set = set()

    while True:
        try:
            events = hub.get_pending_events()
            for event in events:
                process_event(event, llm, hub, seen)
        except requests.exceptions.ConnectionError:
            print(f"[hub] cannot reach {config.api_url} - is Teammate 1 running?")
        except Exception as exc:  # noqa: BLE001
            print(f"[loop] unexpected error: {exc}")

        time.sleep(config.poll_interval)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[agent] shutting down. Stay safe. 🙏")
