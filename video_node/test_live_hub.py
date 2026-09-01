"""
test_live_hub.py
----------------
Live integration test against Teammate 1's REAL Core API.

Sends genuine Schema A SensorEvents through the node's own HubClient and
confirms the Hub accepts them and surfaces them on /api/events/pending.

Usage:
    python test_live_hub.py
"""

import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

from console import enable_utf8
enable_utf8()

import sys
import time
import requests

import config
from hub_client import HubClient

NOPROXY = {"http": None, "https": None}
failures = []


def check(label, cond, detail=""):
    if cond:
        print(f"  [PASS] {label}")
    else:
        print(f"  [FAIL] {label} {detail}")
        failures.append(label)


def pending():
    """Fetch the Hub's pending-events list."""
    url = f"{config.API_URL.rstrip('/')}/api/events/pending"
    r = requests.get(url, timeout=8, proxies=NOPROXY)
    r.raise_for_status()
    data = r.json()
    if isinstance(data, dict):
        for key in ("events", "data", "items", "pending"):
            if isinstance(data.get(key), list):
                return data[key]
        return []
    return data if isinstance(data, list) else []


def ids(events):
    out = set()
    for e in events:
        if isinstance(e, dict):
            v = e.get("event_id") or e.get("eventId") or e.get("id")
            if v:
                out.add(str(v))
    return out


def main():
    print("=" * 62)
    print("  LIVE Hub Integration Test")
    print("=" * 62)
    print(f"  Hub      : {config.API_URL}")
    print(f"  Endpoint : {config.EVENTS_ENDPOINT}")
    print(f"  Elder ID : {config.ELDER_ID}\n")

    # 0. Hub reachable?
    try:
        before = pending()
        check("Hub is reachable (GET /api/events/pending)", True)
        print(f"         {len(before)} event(s) already pending")
    except Exception as exc:
        check("Hub is reachable (GET /api/events/pending)", False,
              f"{type(exc).__name__}: {str(exc)[:120]}")
        print("\n  Cannot continue without the Hub. Is it running?")
        sys.exit(1)

    before_ids = ids(before)

    # 1. Send a real fall event through our own client.
    print("\n-- POST a real 'fall' SensorEvent --")
    hub = HubClient(cooldown_seconds=0.5)
    fall = hub.send_event("fall", 0.94)
    check("Hub accepted the fall event", fall is not None)

    # 2. Send a real emotion event.
    time.sleep(0.6)
    print("\n-- POST a real 'emotion_detected' SensorEvent --")
    emo = hub.send_event("emotion_detected", 0.83, emotion="sad")
    check("Hub accepted the emotion event", emo is not None)

    if not (fall and emo):
        print("\n  RESULT: FAILED - Hub rejected our payloads.")
        sys.exit(1)

    # 3. Confirm both surface on /api/events/pending.
    print("\n-- Verify events landed in the Hub --")
    sent_ids = {fall["event_id"], emo["event_id"]}
    found = set()
    for attempt in range(10):
        time.sleep(0.6)
        try:
            now_ids = ids(pending())
        except Exception:
            continue
        found = sent_ids & (now_ids - before_ids) or sent_ids & now_ids
        if sent_ids <= now_ids:
            break

    check("fall event_id present in Hub", fall["event_id"] in found or len(found) > 0,
          f"looked for {fall['event_id']}")
    check("both sent events visible in Hub", len(found) == 2,
          f"found {len(found)} of 2")

    # 4. Cooldown must still hold against the live Hub.
    print("\n-- Cooldown behaviour against the live Hub --")
    hub2 = HubClient(cooldown_seconds=30)
    first = hub2.send_event("fall", 0.9)
    second = hub2.send_event("fall", 0.99)
    check("first fall accepted", first is not None)
    check("immediate duplicate suppressed (Hub not spammed)", second is None)

    print("\n" + "=" * 62)
    if failures:
        print(f"  RESULT: FAILED -> {', '.join(failures)}")
        sys.exit(1)
    print("  RESULT: LIVE INTEGRATION OK")
    print("  The node is wired to Teammate 1's Hub correctly.")
    print("=" * 62)


if __name__ == "__main__":
    main()
