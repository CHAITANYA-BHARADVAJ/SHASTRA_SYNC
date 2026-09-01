"""
app.py
------
Demo application for the Video Perception Node (Teammate 5).

Serves a small local web UI so the node can be presented in a browser:
live camera feed with skeleton overlay, current detection readouts, the raw
Schema A JSON being sent to the Hub, manual trigger buttons, and live
threshold sliders.

Usage:
    python app.py
    python app.py --port 8080

Security note: there is NO authentication here. It binds to loopback by
default so only this machine can reach it. Binding to all interfaces would
expose the camera feed to anyone on the network.
"""

import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

from console import enable_utf8
enable_utf8()

import argparse
import logging
import time

import requests
from flask import Flask, Response, jsonify, render_template, request

import config
from camera_worker import PerceptionWorker

# When frozen by PyInstaller, templates live in the extraction dir, not next
# to this file, so point Flask at the resolved bundle location.
app = Flask(__name__, template_folder=str(config.bundle_dir() / "templates"))
worker = PerceptionWorker()

logging.getLogger("werkzeug").setLevel(logging.WARNING)


@app.route("/")
def index():
    return render_template(
        "index.html",
        hub_endpoint=config.EVENTS_ENDPOINT,
        elder_id=config.ELDER_ID,
    )


def mjpeg_stream():
    """Yield frames as multipart MJPEG for an <img> tag."""
    while True:
        jpeg = worker.jpeg()
        if jpeg is None:
            time.sleep(0.05)
            continue
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n"
               + f"Content-Length: {len(jpeg)}\r\n\r\n".encode()
               + jpeg + b"\r\n")
        time.sleep(1 / 30)


@app.route("/video_feed")
def video_feed():
    return Response(
        mjpeg_stream(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@app.route("/api/status")
def api_status():
    return jsonify(worker.snapshot())


@app.route("/api/log")
def api_log():
    return jsonify(worker.log())


@app.route("/api/trigger", methods=["POST"])
def api_trigger():
    body = request.get_json(silent=True) or {}
    event_type = body.get("event_type", "fall")
    try:
        entry = worker.manual_trigger(event_type)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(entry)


@app.route("/api/thresholds", methods=["POST"])
def api_thresholds():
    body = request.get_json(silent=True) or {}
    return jsonify(worker.set_thresholds(body))


@app.route("/api/hub_check")
def api_hub_check():
    """Ping the Hub so the presenter can prove connectivity on demand."""
    base = config.API_URL.rstrip("/")
    started = time.monotonic()
    try:
        resp = requests.get(f"{base}/api/events/pending", timeout=60)
        ms = int((time.monotonic() - started) * 1000)
        pending = resp.json()
        if isinstance(pending, dict):
            for key in ("events", "data", "items", "pending"):
                if isinstance(pending.get(key), list):
                    pending = pending[key]
                    break
        count = len(pending) if isinstance(pending, list) else 0
        return jsonify({
            "ok": resp.ok,
            "status_code": resp.status_code,
            "latency_ms": ms,
            "pending_events": count,
            "hub": base,
        })
    except requests.RequestException as exc:
        return jsonify({
            "ok": False,
            "error": f"{type(exc).__name__}: {str(exc)[:180]}",
            "hub": base,
        }), 502


def main():
    parser = argparse.ArgumentParser(description="Video Perception Node demo")
    parser.add_argument("--bind", default="127.0.0.1",
                        help="bind address (default loopback, local only)")
    parser.add_argument("--port", type=int, default=5000, help="listen port")
    args = parser.parse_args()

    worker.start()

    shown = "127.0.0.1" if args.bind == "0.0.0.0" else args.bind
    print("=" * 66)
    print("  SHASTRA SYNC - Video Perception Node (Teammate 5)")
    print("  Demo application")
    print("=" * 66)
    print(f"  Open in your browser : http://{shown}:{args.port}")
    print(f"  Camera index         : {config.CAMERA_INDEX}")
    print(f"  Hub endpoint         : {config.EVENTS_ENDPOINT}")
    print(f"  Elder ID             : {config.ELDER_ID}")
    if args.bind == "0.0.0.0":
        print()
        print("  WARNING: bound to all interfaces with no authentication.")
        print("  Anyone on this network can view the camera feed.")
    print()
    print("  Ctrl+C to stop.")
    print("=" * 66)

    try:
        app.run(host=args.bind, port=args.port, threaded=True,
                debug=False, use_reloader=False)
    finally:
        print("\n[INFO] Stopping perception worker...")
        worker.stop()
        print("[INFO] Shutdown complete.")


if __name__ == "__main__":
    main()
