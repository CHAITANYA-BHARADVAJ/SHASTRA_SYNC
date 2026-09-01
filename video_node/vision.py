"""
vision.py
---------
Main entry point for the Video Perception Node (Teammate 5).

Opens the webcam, runs fall detection and emotion detection every frame,
draws a preview window with landmarks, and POSTs SensorEvents to the Hub
whenever a fall or sustained emotional distress is detected.

Usage:
    python vision.py

Set environment variables to override defaults (see config.py).
Press 'q' in the preview window to quit.
"""

# --- Must run before TensorFlow/DeepFace are imported anywhere ----------
import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")   # silence TF info/warn spam
os.environ.setdefault("GLOG_minloglevel", "2")       # silence MediaPipe glog spam

from console import enable_utf8
enable_utf8()  # DeepFace logs emoji; Windows cp1252 would crash on them
# -----------------------------------------------------------------------

import argparse
import sys
import time

import cv2
import mediapipe as mp
import numpy as np

import config
from fall_detector import FallDetector
from emotion_detector import EmotionDetector
from hub_client import HubClient

# MediaPipe drawing utilities for the live preview.
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose


def draw_overlay(frame: np.ndarray, fall_det: FallDetector, fall_result, emo_result):
    """Draw pose landmarks and status text onto the preview frame."""
    h, w, _ = frame.shape

    # Draw pose landmarks when available.
    if fall_det.last_landmarks:
        mp_drawing.draw_landmarks(
            frame,
            fall_det.last_landmarks,
            mp_pose.POSE_CONNECTIONS,
            mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
            mp_drawing.DrawingSpec(color=(0, 200, 0), thickness=2),
        )

    # Status bar at the top.
    y_off = 30
    cv2.putText(
        frame,
        f"Torso: {fall_result.torso_angle_deg:.0f}deg  "
        f"Drop: {fall_result.drop_velocity:.2f}/s",
        (10, y_off),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2,
    )

    if fall_result.fell:
        cv2.putText(
            frame, "** FALL DETECTED **", (10, y_off + 35),
            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3,
        )

    if emo_result.dominant_emotion:
        label = f"Emotion: {emo_result.dominant_emotion} ({emo_result.confidence:.0%})"
        color = (0, 0, 255) if emo_result.distress else (200, 200, 200)
        cv2.putText(
            frame, label, (10, h - 20),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2,
        )

    if emo_result.distress:
        cv2.putText(
            frame, "** DISTRESS DETECTED **", (10, h - 55),
            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3,
        )

    return frame


def parse_args():
    p = argparse.ArgumentParser(
        description="SHASTRA SYNC - Video Perception Node (Teammate 5)"
    )
    p.add_argument(
        "--headless", action="store_true",
        help="run without a preview window (for servers, demos, CI)",
    )
    p.add_argument(
        "--duration", type=float, default=0.0,
        help="stop automatically after N seconds (0 = run until quit)",
    )
    return p.parse_args()


def main():
    args = parse_args()

    print("=" * 60)
    print("  SHASTRA SYNC - Video Perception Node (Teammate 5)")
    print(f"  Camera index : {config.CAMERA_INDEX}")
    print(f"  Hub endpoint : {config.EVENTS_ENDPOINT}")
    print(f"  Elder ID     : {config.ELDER_ID}")
    print(f"  Cooldown     : {config.EVENT_COOLDOWN_SECONDS}s")
    print(f"  Preview      : {'off (headless)' if args.headless else 'on'}")
    if args.duration:
        print(f"  Duration     : {args.duration}s")
    print("=" * 60)

    cap = cv2.VideoCapture(config.CAMERA_INDEX)
    if not cap.isOpened():
        print("[FATAL] Cannot open webcam. Check CAMERA_INDEX or device.")
        sys.exit(1)

    fall_det = FallDetector()
    emo_det = EmotionDetector()
    hub = HubClient()

    if args.headless:
        print("[INFO] Streaming headless... Ctrl+C to quit.\n")
    else:
        print("[INFO] Streaming... Press 'q' in the preview window to quit.\n")

    started = time.monotonic()
    frames = 0

    try:
        while True:
            if args.duration and (time.monotonic() - started) >= args.duration:
                print(f"[INFO] Duration reached ({args.duration}s). Stopping.")
                break
            ret, frame = cap.read()
            if not ret:
                print("[WARN] Failed to grab frame, retrying...")
                continue

            # MediaPipe expects RGB input; OpenCV reads BGR.
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # ---- Fall detection (every frame) ---------------------------
            fall_result = fall_det.process(rgb)
            if fall_result.fell:
                hub.send_event(
                    event_type="fall",
                    confidence=fall_result.confidence,
                )

            # ---- Emotion detection (every Nth frame) --------------------
            emo_result = emo_det.process(frame)  # DeepFace wants BGR
            if emo_result.distress:
                hub.send_event(
                    event_type="emotion_detected",
                    confidence=emo_result.confidence,
                    emotion=emo_result.dominant_emotion,
                )

            frames += 1

            # ---- Live preview -------------------------------------------
            if not args.headless:
                preview = draw_overlay(frame, fall_det, fall_result, emo_result)
                cv2.imshow("SHASTRA SYNC - Vision Node", preview)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    print("[INFO] Quit signal received. Shutting down.")
                    break

    except KeyboardInterrupt:
        print("\n[INFO] Interrupted. Shutting down.")
    finally:
        # Give any in-flight event POSTs a chance to land before we exit --
        # dropping a fall on shutdown would defeat the point of the system.
        elapsed = time.monotonic() - started
        fps = frames / elapsed if elapsed > 0 else 0.0
        print(f"[INFO] Processed {frames} frames in {elapsed:.1f}s ({fps:.1f} fps)")
        print("[INFO] Flushing pending events to the Hub...")
        hub.close()
        fall_det.close()
        cap.release()
        cv2.destroyAllWindows()
        print("[INFO] Shutdown complete.")


if __name__ == "__main__":
    main()
