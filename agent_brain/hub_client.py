"""
hub_client.py - Thin HTTP client for talking to the Hub (Teammate 1).

Endpoints used (from the God Document):
  GET  /api/events/pending -> list of SensorEvent JSONs awaiting a decision
  POST /api/decisions      -> submit an AgentDecision (Schema B)
"""

from __future__ import annotations

from typing import List

import requests

from schemas import AgentDecision, SensorEvent


class HubClient:
    def __init__(self, api_url: str, timeout: float = 10.0):
        self.api_url = api_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()

    def get_pending_events(self) -> List[SensorEvent]:
        """Fetch events that don't yet have a matching decision."""
        url = f"{self.api_url}/api/events/pending"
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()

        # Be tolerant of either a bare list or an envelope like {"events": [...]}.
        if isinstance(data, dict):
            data = data.get("events") or data.get("data") or []

        events: List[SensorEvent] = []
        for item in data:
            try:
                events.append(SensorEvent.model_validate(item))
            except Exception as exc:  # noqa: BLE001
                print(f"[hub] skipping malformed event: {exc}")
        return events

    def post_decision(self, decision: AgentDecision) -> None:
        """Send an AgentDecision back to the Hub for storage + broadcast."""
        url = f"{self.api_url}/api/decisions"
        payload = decision.model_dump()
        resp = self.session.post(url, json=payload, timeout=self.timeout)
        resp.raise_for_status()
