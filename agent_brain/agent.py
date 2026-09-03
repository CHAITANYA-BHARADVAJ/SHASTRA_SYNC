"""
agent.py - The Shastra Sync AI Brain (Teammate 2).

A continuous background loop:
  1. Every POLL_INTERVAL_SECONDS, ask the Hub for pending events.
  2. For each new SensorEvent, ask the LLM to make an empathetic decision
     (structured output -> AgentDecision).
  3. POST the AgentDecision back to the Hub, which stores + broadcasts it.

Run locally:  python agent.py

Deployment note:
  The core brain is the polling loop below. Cloud hosts that only offer FREE
  *web* services (e.g. Render free tier) require a process that listens on a
  port. So when a PORT env var is present, we ALSO start a tiny health-check
  HTTP server and run the polling loop in a background thread. On hosts that
  support background workers (Railway), PORT is absent and we just run the
  loop directly. Either way the decision logic is identical.
"""

from __future__ import annotations

import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import requests

from config import Config
from hub_client import HubClient
from llm_client import LLMClient
from schemas import SensorEvent

# Simple shared state so the health endpoint can report liveness.
_STATE = {"polls": 0, "decisions": 0, "started_at": time.time(), "last_error": None}


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
        print("  NOTE: gpt-4o is a PAID model. Ensure your account has credits.")
    elif config.provider == "groq":
        print("  Using Groq (fast). Free tier: https://console.groq.com/keys")
    else:
        print("  Using OpenRouter free tier: https://openrouter.ai/keys")
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
        _STATE["decisions"] += 1
        print(f"[hub] decision {decision.decision_id} sent.\n")
    except Exception as exc:  # noqa: BLE001
        print(f"[hub] failed to post decision: {exc}")
        seen.discard(event.event_id)  # retry next poll


def run_agent_loop() -> None:
    """The core brain: poll the Hub, decide, and post back, forever."""
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
            _STATE["polls"] += 1
            _STATE["last_error"] = None
            for event in events:
                process_event(event, llm, hub, seen)
        except requests.exceptions.ConnectionError:
            _STATE["last_error"] = "cannot reach hub"
            print(f"[hub] cannot reach {config.api_url} - is Teammate 1 running?")
        except Exception as exc:  # noqa: BLE001
            _STATE["last_error"] = str(exc)
            print(f"[loop] unexpected error: {exc}")

        time.sleep(config.poll_interval)


# --------------------------------------------------------------------------- #
# Tiny health-check web server (only used when a PORT is provided by the host)
# --------------------------------------------------------------------------- #
class _HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 - http.server API
        uptime = int(time.time() - _STATE["started_at"])
        body = (
            '{"service":"shastra-sync-brain","status":"alive",'
            f'"uptime_seconds":{uptime},'
            f'"polls":{_STATE["polls"]},'
            f'"decisions":{_STATE["decisions"]},'
            f'"last_error":{_json_str(_STATE["last_error"])}}}'
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):  # silence per-request logging noise
        return


def _json_str(value) -> str:
    if value is None:
        return "null"
    escaped = str(value).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _serve_health(port: int) -> None:
    server = ThreadingHTTPServer(("0.0.0.0", port), _HealthHandler)
    print(f"[health] listening on 0.0.0.0:{port} (GET / -> status JSON)")
    server.serve_forever()


def main() -> None:
    port = os.getenv("PORT")
    if port:
        # Web-service mode (e.g. Render free tier): run the brain in a
        # background thread and serve the health endpoint on the main thread.
        loop = threading.Thread(target=run_agent_loop, daemon=True)
        loop.start()
        _serve_health(int(port))
    else:
        # Worker mode (local / Railway): just run the brain.
        run_agent_loop()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[agent] shutting down. Stay safe. 🙏")
