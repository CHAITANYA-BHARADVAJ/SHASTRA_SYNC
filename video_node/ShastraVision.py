"""
ShastraVision.py
----------------
Double-clickable desktop launcher for the Video Perception Node demo.

Starts the local web server, waits until it answers, then opens the default
browser on the dashboard. Closing the console window stops everything.

This is the PyInstaller entry point. Run directly during development:
    python ShastraVision.py
"""

import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")
# mediapipe's drawing_utils imports matplotlib.pyplot. Force the headless Agg
# backend so it never tries to load a GUI toolkit we deliberately excluded.
os.environ.setdefault("MPLBACKEND", "Agg")

import socket
import sys
import threading
import time
import webbrowser


def _free_slot(preferred=5000):
    """Return an available TCP slot, preferring 5000."""
    for candidate in (preferred, 5001, 5002, 5050, 8081, 0):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(("127.0.0.1", candidate))
            chosen = s.getsockname()[1]
            s.close()
            return chosen
        except OSError:
            continue
    return preferred


def _wait_then_open(url, probe_url, timeout=180.0):
    """Open the browser once the server actually answers."""
    import urllib.error
    import urllib.request

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(probe_url, timeout=3):
                pass
            print(f"  Dashboard ready. Opening {url}")
            webbrowser.open(url)
            return
        except urllib.error.URLError:
            time.sleep(0.7)
        except Exception:
            time.sleep(0.7)
    print("  Server did not become ready in time.")
    print(f"  Try opening {url} manually.")


def main():
    print("=" * 66)
    print("  SHASTRA SYNC - Video Perception Node (Teammate 5)")
    print("  Loading vision models, please wait...")
    print("=" * 66)

    # Imported here so the banner appears before the slow TensorFlow load.
    import config
    from app import app, worker

    slot = _free_slot()
    base = f"http://127.0.0.1:{slot}"

    print(f"  Camera index : {config.CAMERA_INDEX}")
    print(f"  Hub endpoint : {config.EVENTS_ENDPOINT}")
    print(f"  Elder ID     : {config.ELDER_ID}")
    print(f"  Dashboard    : {base}")
    print()
    print("  Starting camera...")

    worker.start()

    threading.Thread(
        target=_wait_then_open,
        args=(base, base + "/api/status"),
        daemon=True,
    ).start()

    print("  Close this window (or press Ctrl+C) to stop.")
    print("=" * 66)

    try:
        app.run(host="127.0.0.1", port=slot, threaded=True,
                debug=False, use_reloader=False)
    except KeyboardInterrupt:
        pass
    finally:
        print("\n  Stopping...")
        worker.stop()
        print("  Stopped.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # A packaged app that vanishes on error is impossible to debug, so
        # surface the failure and hold the window open.
        import traceback
        print("\n" + "=" * 66)
        print("  STARTUP FAILED")
        print("=" * 66)
        traceback.print_exc()
        print()
        try:
            input("  Press Enter to close...")
        except EOFError:
            time.sleep(30)
        sys.exit(1)
