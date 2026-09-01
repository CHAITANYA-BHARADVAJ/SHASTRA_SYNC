"""
mock_hub.py
-----------
A THROWAWAY local stand-in for Teammate 1's Core API, so Teammate 5 can
develop and demo the Video Perception Node before the real Hub exists.

This is NOT the real Hub and is NOT part of the deliverable. It implements
just enough to accept our events and show them:

    POST /api/events        accepts a SensorEvent (Schema A), validates it,
                            pretty-prints it to the console
    GET  /api/events        returns everything received so far (as JSON)
    GET  /                  a tiny live HTML view of incoming events

Delete this file once Teammate 1's Hub is running -- then just point
API_URL at the real one.

Usage:
    python mock_hub.py            # listens on port 8000
    python mock_hub.py 9000       # listens on a custom port
"""

import json
import sys
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Every field required by Schema A.
REQUIRED = {
    "type", "event_id", "elder_id", "event_type",
    "confidence", "voice_transcript", "emotion", "timestamp",
}

VALID_EVENT_TYPES = {
    "fall", "inactivity", "medication_missed", "manual_panic",
    "voice_input", "emotion_detected", "normal",
}

RECEIVED = []

PAGE = """<!doctype html>
<html><head><title>Mock Hub - SHASTRA SYNC</title>
<meta http-equiv="refresh" content="2">
<style>
 body{font-family:system-ui,sans-serif;background:#0f1115;color:#e6e6e6;padding:24px}
 h1{font-size:18px;color:#9ad;margin:0 0 4px}
 p.sub{color:#889;font-size:13px;margin:0 0 18px}
 table{border-collapse:collapse;width:100%%;font-size:13px}
 th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #242833}
 th{color:#889;font-weight:600;font-size:11px;text-transform:uppercase}
 .fall{color:#ff6b6b;font-weight:600}
 .emotion_detected{color:#ffd166;font-weight:600}
 .empty{color:#667;padding:24px 0}
</style></head><body>
<h1>Mock Hub &mdash; receiving SensorEvents</h1>
<p class="sub">Stand-in for Teammate 1's Core API. Auto-refreshes every 2s.
Total received: <b>%(count)d</b></p>
%(body)s
</body></html>
"""


class Handler(BaseHTTPRequestHandler):
    server_version = "MockHub/1.0"

    # ---------------------------------------------------------------- POST
    def do_POST(self):
        if self.path.rstrip("/") != "/api/events":
            self._json(404, {"detail": f"No route for POST {self.path}"})
            return

        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length)

        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            print(f"  [REJECTED] invalid JSON: {exc}")
            self._json(400, {"detail": "invalid JSON"})
            return

        problems = self._validate(payload)
        RECEIVED.append(payload)
        self._print_event(payload, problems)

        if problems:
            self._json(422, {"detail": problems})
            return
        self._json(201, {"status": "accepted", "event_id": payload["event_id"]})

    # ----------------------------------------------------------------- GET
    def do_GET(self):
        route = self.path.rstrip("/") or "/"
        if route == "/api/events":
            self._json(200, RECEIVED)
        elif route == "/":
            self._html()
        else:
            self._json(404, {"detail": f"No route for GET {self.path}"})

    # ------------------------------------------------------------ helpers
    @staticmethod
    def _validate(p):
        problems = []
        missing = REQUIRED - set(p)
        extra = set(p) - REQUIRED
        if missing:
            problems.append(f"missing fields: {sorted(missing)}")
        if extra:
            problems.append(f"unexpected fields: {sorted(extra)}")
        if p.get("type") != "SensorEvent":
            problems.append(f"type should be 'SensorEvent', got {p.get('type')!r}")
        if p.get("event_type") not in VALID_EVENT_TYPES:
            problems.append(f"invalid event_type {p.get('event_type')!r}")
        conf = p.get("confidence")
        if not isinstance(conf, (int, float)) or not 0.0 <= float(conf) <= 1.0:
            problems.append(f"confidence must be 0..1, got {conf!r}")
        return problems

    def _print_event(self, p, problems):
        stamp = datetime.now().strftime("%H:%M:%S")
        et = p.get("event_type", "?")
        line = (
            f"[{stamp}] #{len(RECEIVED):<3} {et:<18} "
            f"elder={p.get('elder_id')} "
            f"conf={p.get('confidence')} "
            f"emotion={p.get('emotion')}"
        )
        print(line)
        if problems:
            print("            !! CONTRACT VIOLATION:")
            for issue in problems:
                print(f"               - {issue}")
        else:
            print("            Schema A valid.")

    def _json(self, code, body):
        data = json.dumps(body, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def _html(self):
        if RECEIVED:
            rows = []
            for i, p in enumerate(reversed(RECEIVED), 1):
                et = str(p.get("event_type", "?"))
                rows.append(
                    "<tr>"
                    f"<td>{len(RECEIVED) - i + 1}</td>"
                    f"<td class='{et}'>{et}</td>"
                    f"<td>{p.get('elder_id','')}</td>"
                    f"<td>{p.get('confidence','')}</td>"
                    f"<td>{p.get('emotion') or '-'}</td>"
                    f"<td>{p.get('timestamp','')}</td>"
                    "</tr>"
                )
            body = (
                "<table><tr><th>#</th><th>event_type</th><th>elder</th>"
                "<th>conf</th><th>emotion</th><th>timestamp</th></tr>"
                + "".join(rows) + "</table>"
            )
        else:
            body = ("<p class='empty'>No events yet. Run "
                    "<code>python vision.py</code> and trigger a detection.</p>")

        html = (PAGE % {"count": len(RECEIVED), "body": body}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html)))
        self.end_headers()
        self.wfile.write(html)

    def log_message(self, *args):
        pass  # suppress default access logging; we print our own


def main():
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port {sys.argv[1]!r}")
            sys.exit(1)

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("=" * 62)
    print("  MOCK HUB - stand-in for Teammate 1's Core API")
    print("=" * 62)
    print(f"  POST events -> http://127.0.0.1:{port}/api/events")
    print(f"  Live view   -> http://127.0.0.1:{port}/")
    print(f"  Raw JSON    -> http://127.0.0.1:{port}/api/events")
    print()
    print("  Point the node at it:")
    print(f'    $env:API_URL = "http://127.0.0.1:{port}"')
    print()
    print("  Ctrl+C to stop.")
    print("=" * 62)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n  Stopped. {len(RECEIVED)} event(s) received this session.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
