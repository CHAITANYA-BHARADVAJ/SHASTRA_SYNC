"""
show_events.py
--------------
Shows the SensorEvents this node has delivered to the Hub.

Usage:
    python show_events.py           # summary table
    python show_events.py --raw     # full raw JSON
"""

import json
import sys

import requests

import config

BASE = config.API_URL.rstrip("/")


def fetch():
    r = requests.get(f"{BASE}/api/events/pending", timeout=60)
    r.raise_for_status()
    data = r.json()
    if isinstance(data, dict):
        for key in ("events", "data", "items", "pending"):
            if isinstance(data.get(key), list):
                return data[key]
        return [data]
    return data if isinstance(data, list) else []


def main():
    raw = "--raw" in sys.argv
    print("=" * 78)
    print(f"  Events in the Hub: {BASE}/api/events/pending")
    print("=" * 78)

    try:
        events = fetch()
    except Exception as exc:
        print(f"  Could not reach the Hub: {type(exc).__name__}: {str(exc)[:150]}")
        sys.exit(1)

    if not events:
        print("\n  No pending events.")
        print("  Note: events disappear from /pending once Teammate 2's Agent")
        print("  processes them and posts a matching decision.\n")
        return

    if raw:
        print(json.dumps(events, indent=2))
        return

    print(f"\n  {len(events)} event(s) currently pending:\n")
    hdr = f"  {'#':<4}{'event_type':<20}{'elder':<12}{'conf':<7}{'emotion':<10}timestamp"
    print(hdr)
    print("  " + "-" * 74)
    for i, e in enumerate(events, 1):
        if not isinstance(e, dict):
            print(f"  {i:<4}{e}")
            continue
        print(
            f"  {i:<4}"
            f"{str(e.get('event_type', '?')):<20}"
            f"{str(e.get('elder_id', '?')):<12}"
            f"{str(e.get('confidence', '-')):<7}"
            f"{str(e.get('emotion') or '-'):<10}"
            f"{str(e.get('timestamp', ''))[:19]}"
        )

    mine = [e for e in events if isinstance(e, dict)
            and e.get("event_type") in ("fall", "emotion_detected")]
    print(f"\n  {len(mine)} of these came from this vision node "
          f"(fall / emotion_detected).")
    print("\n  Run with --raw to see the full JSON payloads.")
    print("=" * 78)


if __name__ == "__main__":
    main()
