"""
verify_install.py
-----------------
Verifies the full Video Perception Node dependency stack is installed and
functional WITHOUT needing a webcam or a running Hub.

Usage:
    python verify_install.py
"""

import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

from console import enable_utf8
enable_utf8()

import sys

FAILURES = []


def check(label, fn):
    try:
        result = fn()
        print(f"  [OK]   {label}: {result}")
        return True
    except Exception as exc:
        print(f"  [FAIL] {label}: {type(exc).__name__}: {exc}")
        FAILURES.append(label)
        return False


def main():
    print("=" * 62)
    print("  Video Perception Node - Dependency Verification")
    print("=" * 62)
    print(f"  Python: {sys.version.split()[0]}")
    print("\n-- Library versions --")

    def _numpy():
        import numpy
        return numpy.__version__

    def _cv2():
        import cv2
        return cv2.__version__

    def _mediapipe():
        import mediapipe as mp
        assert hasattr(mp, "solutions"), "legacy mp.solutions API missing"
        return f"{mp.__version__} (solutions API present)"

    def _tf():
        import tensorflow as tf
        return tf.__version__

    def _protobuf():
        import google.protobuf as pb
        return pb.__version__

    check("numpy", _numpy)
    check("opencv-python", _cv2)
    check("mediapipe", _mediapipe)
    check("tensorflow", _tf)
    check("protobuf", _protobuf)

    print("\n-- Functional tests --")

    def _pose_runs():
        import numpy as np
        import mediapipe as mp
        pose = mp.solutions.pose.Pose(
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        pose.process(frame)
        pose.close()
        return "MediaPipe Pose processed a frame"

    def _deepface_runs():
        import numpy as np
        from deepface import DeepFace
        # Synthetic frame; enforce_detection=False so no face is required.
        frame = np.full((224, 224, 3), 128, dtype=np.uint8)
        res = DeepFace.analyze(
            frame, actions=["emotion"], enforce_detection=False, silent=True
        )
        if isinstance(res, list):
            res = res[0]
        return f"DeepFace returned dominant_emotion={res.get('dominant_emotion')}"

    def _our_modules():
        import config
        from schema import build_sensor_event
        from fall_detector import FallDetector
        from emotion_detector import EmotionDetector
        from hub_client import HubClient
        ev = build_sensor_event(config.ELDER_ID, "fall", 0.9)
        assert ev["type"] == "SensorEvent"
        return "config, schema, fall_detector, emotion_detector, hub_client"

    def _camera():
        import cv2
        import config
        cap = cv2.VideoCapture(config.CAMERA_INDEX)
        ok = cap.isOpened()
        if ok:
            ret, frame = cap.read()
            cap.release()
            if ret:
                return f"camera {config.CAMERA_INDEX} opened, frame {frame.shape}"
            return f"camera {config.CAMERA_INDEX} opened but no frame read"
        cap.release()
        raise RuntimeError(f"camera index {config.CAMERA_INDEX} not available")

    check("MediaPipe pose inference", _pose_runs)
    check("DeepFace emotion inference", _deepface_runs)
    check("Project modules import", _our_modules)

    print("\n-- Hardware (optional) --")
    check("Webcam", _camera)

    print("\n" + "=" * 62)
    if FAILURES:
        hard = [f for f in FAILURES if f != "Webcam"]
        if hard:
            print(f"  RESULT: FAILED -> {', '.join(hard)}")
            sys.exit(1)
        print("  RESULT: DEPENDENCIES OK (webcam unavailable in this environment)")
    else:
        print("  RESULT: ALL CHECKS PASSED - ready to run 'python vision.py'")
    print("=" * 62)


if __name__ == "__main__":
    main()
