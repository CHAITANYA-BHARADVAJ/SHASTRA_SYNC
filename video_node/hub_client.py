"""
hub_client.py
-------------
Sends SensorEvents to Teammate 1's Core API (the Hub).

Two responsibilities beyond "just POST":

1. Cooldown -- after an event of a given type fires, further events of that
   same type are suppressed for a window, so we never spam the Hub ~30x/sec
   while the elder is on the floor.

2. Reliable delivery without blocking the camera. A hosted Hub on a free tier
   can cold-start for 50s+. We must not freeze the vision loop waiting for it,
   and we must not silently drop a fall. So each event is dispatched on a
   background thread that retries with exponential backoff.
"""

import threading
import time
from typing import Any, Dict, Optional

import requests

import config
from schema import build_sensor_event


class HubClient:
    """Posts SensorEvents to the Hub: cooldown-gated, retrying, non-blocking."""

    def __init__(
        self,
        endpoint: str = config.EVENTS_ENDPOINT,
        elder_id: str = config.ELDER_ID,
        cooldown_seconds: float = config.EVENT_COOLDOWN_SECONDS,
        timeout: float = config.HTTP_TIMEOUT,
        max_retries: int = config.EVENT_MAX_RETRIES,
        retry_backoff: float = config.EVENT_RETRY_BACKOFF,
        blocking: bool = False,
    ):
        self.endpoint = endpoint
        self.elder_id = elder_id
        self.cooldown_seconds = cooldown_seconds
        self.timeout = timeout
        self.max_retries = max(1, max_retries)
        self.retry_backoff = retry_backoff
        # blocking=True makes send_event wait for the result (used by tests).
        self.blocking = blocking

        self._last_sent: Dict[str, float] = {}
        self._lock = threading.Lock()
        self._threads: list[threading.Thread] = []

        # Reuse one session: keep-alive avoids a fresh TLS handshake per event.
        self._session = requests.Session()

    # ------------------------------------------------------------- cooldown
    def _in_cooldown(self, event_type: str) -> bool:
        last = self._last_sent.get(event_type)
        if last is None:
            return False
        return (time.monotonic() - last) < self.cooldown_seconds

    # ---------------------------------------------------------------- send
    def send_event(
        self,
        event_type: str,
        confidence: float,
        emotion: Optional[str] = None,
        voice_transcript: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Build a SensorEvent and dispatch it to the Hub.

        Returns the payload that was queued for delivery, or None if the event
        was suppressed by the cooldown. Delivery itself happens on a background
        thread (unless blocking=True), so the caller is never stalled by a slow
        or cold-starting Hub.
        """
        with self._lock:
            if self._in_cooldown(event_type):
                return None
            # Reserve the slot before dispatching so two detectors cannot both
            # slip through the cooldown gate.
            self._last_sent[event_type] = time.monotonic()

        payload = build_sensor_event(
            elder_id=self.elder_id,
            event_type=event_type,
            confidence=confidence,
            emotion=emotion,
            voice_transcript=voice_transcript,
        )

        if self.blocking:
            ok = self._deliver(payload)
            return payload if ok else None

        thread = threading.Thread(
            target=self._deliver, args=(payload,), daemon=True,
            name=f"hub-post-{event_type}",
        )
        thread.start()
        self._threads = [t for t in self._threads if t.is_alive()]
        self._threads.append(thread)
        return payload

    # ------------------------------------------------------------- delivery
    def _deliver(self, payload: Dict[str, Any]) -> bool:
        """POST with retries and exponential backoff. Returns True on success."""
        event_type = payload["event_type"]

        for attempt in range(1, self.max_retries + 1):
            try:
                resp = self._session.post(
                    self.endpoint, json=payload, timeout=self.timeout
                )
                # 4xx means the Hub rejected the payload itself. Retrying an
                # identical body will not help, so surface it and stop.
                if 400 <= resp.status_code < 500:
                    print(
                        f"[HUB][REJECTED] {event_type} -> HTTP {resp.status_code}: "
                        f"{resp.text[:200]}"
                    )
                    return False
                resp.raise_for_status()
                suffix = "" if attempt == 1 else f" (attempt {attempt})"
                print(
                    f"[HUB] Sent {event_type} "
                    f"(emotion={payload.get('emotion')}, "
                    f"confidence={payload['confidence']}) "
                    f"-> {resp.status_code}{suffix}"
                )
                return True

            except requests.RequestException as exc:
                if attempt < self.max_retries:
                    delay = self.retry_backoff * (2 ** (attempt - 1))
                    print(
                        f"[HUB][RETRY] {event_type} attempt {attempt}/"
                        f"{self.max_retries} failed ({type(exc).__name__}); "
                        f"retrying in {delay:.0f}s"
                    )
                    time.sleep(delay)
                else:
                    print(
                        f"[HUB][ERROR] {event_type} failed after "
                        f"{self.max_retries} attempts: {str(exc)[:160]}"
                    )
                    # Roll back the cooldown so an ongoing emergency can be
                    # re-reported by the next detection instead of being
                    # suppressed for the full window.
                    with self._lock:
                        self._last_sent.pop(event_type, None)
                    return False

        return False

    # -------------------------------------------------------------- cleanup
    def flush(self, timeout: float = 10.0) -> None:
        """Wait briefly for in-flight deliveries. Call on shutdown."""
        deadline = time.monotonic() + timeout
        for t in list(self._threads):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            t.join(timeout=remaining)

    def close(self) -> None:
        self.flush()
        self._session.close()
