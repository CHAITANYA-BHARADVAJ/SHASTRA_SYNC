"""
camera_worker.py
----------------
Runs the perception pipeline on a background thread so the Flask request
handlers never block on camera I/O or model inference.

Owns:
  * the webcam capture loop
  * FallDetector + EmotionDetector
  * the annotated JPEG frame the browser streams
  * a rolling log of events dispatched to the Hub
  * live-tunable thresholds and manual demo triggers
"""

import threading
import time
from collections import deque
from typing import Any, Deque, Dict, List, Optional

import cv2
import mediapipe as mp
import numpy as np

import config
from emotion_detector import EmotionDetector
from fall_detector import FallDetector
from hub_client import HubClient

mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

MAX_LOG = 60


class PerceptionWorker:
    """Background webcam + detection loop with a thread-safe snapshot API."""

    def __init__(self):
        self._lock = threading.Lock()
        self._frame_lock = threading.Lock()

        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()

        self._jpeg: Optional[bytes] = None
        self._log: Deque[Dict[str, Any]] = deque(maxlen=MAX_LOG)

        self.hub = HubClient()
        self.fall = FallDetector()
        self.emotion: Optional[EmotionDetector] = None  # built lazily (heavy)

        # Live-tunable thresholds, seeded from config.
        self.thresholds = {
            "fall_torso_angle_deg": config.FALL_TORSO_ANGLE_DEG,
            "fall_drop_velocity": config.FALL_DROP_VELOCITY,
            "emotion_sustained_seconds": config.EMOTION_SUSTAINED_SECONDS,
            "emotion_every_n_frames": config.EMOTION_ANALYZE_EVERY_N_FRAMES,
            "cooldown_seconds": config.EVENT_COOLDOWN_SECONDS,
        }

        # Current perception state, surfaced to the UI.
        self.state: Dict[str, Any] = {
            "running": False,
            "camera_ok": False,
            "person_detected": False,
            "torso_angle": 0.0,
            "drop_velocity": 0.0,
            "emotion": None,
            "emotion_confidence": 0.0,
            "face_present": False,
            "fall_alert": False,
            "distress_alert": False,
            "fps": 0.0,
            "frames": 0,
            "events_sent": 0,
            "events_failed": 0,
            "error": None,
        }
        # Timestamps for briefly holding alert banners on screen.
        self._fall_alert_until = 0.0
        self._distress_alert_until = 0.0

    # ------------------------------------------------------------ lifecycle
    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, daemon=True,
                                        name="perception-worker")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)
        self.hub.close()
        self.fall.close()

    # ----------------------------------------------------------- main loop
    def _run(self) -> None:
        cap = cv2.VideoCapture(config.CAMERA_INDEX)
        if not cap.isOpened():
            with self._lock:
                self.state["error"] = (
                    f"Cannot open camera index {config.CAMERA_INDEX}. "
                    "Is another app using it?"
                )
                self.state["camera_ok"] = False
            return

        # Build the emotion detector here so model load happens off the
        # request path.
        try:
            self.emotion = EmotionDetector(
                analyze_every_n=int(self.thresholds["emotion_every_n_frames"]),
                sustained_seconds=float(self.thresholds["emotion_sustained_seconds"]),
            )
        except Exception as exc:
            with self._lock:
                self.state["error"] = f"Emotion model failed to load: {exc}"

        with self._lock:
            self.state["running"] = True
            self.state["camera_ok"] = True

        frames = 0
        t_start = time.monotonic()
        t_fps = t_start

        while not self._stop.is_set():
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.05)
                continue

            frames += 1
            now = time.monotonic()

            # Keep thresholds live-editable.
            self.fall.torso_angle_threshold = float(
                self.thresholds["fall_torso_angle_deg"])
            self.fall.drop_velocity_threshold = float(
                self.thresholds["fall_drop_velocity"])

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            fr = self.fall.process(rgb)

            if fr.fell:
                self._dispatch("fall", fr.confidence, None,
                               source="auto",
                               detail=f"torso {fr.torso_angle_deg:.0f}deg, "
                                      f"drop {fr.drop_velocity:.2f}/s")
                self._fall_alert_until = now + 4.0

            er = None
            if self.emotion is not None:
                self.emotion.sustained_seconds = float(
                    self.thresholds["emotion_sustained_seconds"])
                self.emotion.analyze_every_n = max(
                    1, int(self.thresholds["emotion_every_n_frames"]))
                try:
                    er = self.emotion.process(frame)
                except Exception:
                    er = None

                if er is not None and er.distress:
                    self._dispatch("emotion_detected", er.confidence,
                                   er.dominant_emotion, source="auto",
                                   detail=f"sustained {er.dominant_emotion}")
                    self._distress_alert_until = now + 4.0

            annotated = self._annotate(frame, fr, er, now)
            ok_enc, buf = cv2.imencode(".jpg", annotated,
                                       [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if ok_enc:
                with self._frame_lock:
                    self._jpeg = buf.tobytes()

            # Refresh state (~5x/sec is plenty for the UI).
            if now - t_fps >= 0.2:
                elapsed = now - t_start
                with self._lock:
                    self.state.update({
                        "person_detected": self.fall.last_landmarks is not None,
                        "torso_angle": round(fr.torso_angle_deg, 1),
                        "drop_velocity": round(fr.drop_velocity, 3),
                        "fall_alert": now < self._fall_alert_until,
                        "distress_alert": now < self._distress_alert_until,
                        "fps": round(frames / elapsed, 1) if elapsed > 0 else 0.0,
                        "frames": frames,
                    })
                    if er is not None and er.analyzed:
                        self.state["emotion"] = er.dominant_emotion
                        self.state["emotion_confidence"] = round(er.confidence, 2)
                        self.state["face_present"] = er.face_present
                t_fps = now

        cap.release()
        with self._lock:
            self.state["running"] = False

    # ------------------------------------------------------------- overlay
    def _annotate(self, frame, fr, er, now) -> np.ndarray:
        out = frame.copy()
        h, w = out.shape[:2]

        if self.fall.last_landmarks:
            mp_drawing.draw_landmarks(
                out, self.fall.last_landmarks, mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(120, 255, 120), thickness=2,
                                       circle_radius=3),
                mp_drawing.DrawingSpec(color=(60, 200, 60), thickness=2),
            )

        # Translucent header strip for readability.
        strip = out[0:34, 0:w].copy()
        out[0:34, 0:w] = cv2.addWeighted(
            strip, 0.35, np.zeros_like(strip), 0.65, 0)

        cv2.putText(out, f"torso {fr.torso_angle_deg:5.1f}deg   "
                         f"drop {fr.drop_velocity:+.2f}/s",
                    (10, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                    (255, 255, 255), 1, cv2.LINE_AA)

        label = self.state.get("emotion")
        if label:
            conf = self.state.get("emotion_confidence", 0.0)
            colour = ((80, 80, 255) if label in config.DISTRESS_EMOTIONS
                      else (200, 200, 200))
            cv2.putText(out, f"{label} {conf:.0%}", (w - 150, 23),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, colour, 1, cv2.LINE_AA)

        if now < self._fall_alert_until:
            self._banner(out, "FALL DETECTED", (0, 0, 220))
        elif now < self._distress_alert_until:
            self._banner(out, "DISTRESS DETECTED", (0, 140, 230))

        if not self.fall.last_landmarks:
            cv2.putText(out, "no person in frame", (10, h - 14),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1,
                        cv2.LINE_AA)
        return out

    @staticmethod
    def _banner(img, text, colour) -> None:
        h, w = img.shape[:2]
        cv2.rectangle(img, (0, 0), (w - 1, h - 1), colour, 8)
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 3)
        x = (w - tw) // 2
        y = h // 2
        cv2.rectangle(img, (x - 16, y - th - 16), (x + tw + 16, y + 16),
                      colour, -1)
        cv2.putText(img, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 1.0,
                    (255, 255, 255), 3, cv2.LINE_AA)

    # ------------------------------------------------------------ dispatch
    def _dispatch(self, event_type, confidence, emotion, source, detail="") -> Dict:
        """Send an event to the Hub and record the outcome for the UI."""
        self.hub.cooldown_seconds = float(self.thresholds["cooldown_seconds"])
        payload = self.hub.send_event(event_type, confidence, emotion=emotion)

        entry = {
            "at": time.strftime("%H:%M:%S"),
            "event_type": event_type,
            "source": source,
            "detail": detail,
            "status": "sent" if payload else "suppressed",
            "payload": payload,
        }
        with self._lock:
            self._log.appendleft(entry)
            if payload:
                self.state["events_sent"] += 1
        return entry

    def manual_trigger(self, event_type: str) -> Dict:
        """Fire an event on demand (demo button)."""
        now = time.monotonic()
        if event_type == "fall":
            self._fall_alert_until = now + 4.0
            return self._dispatch("fall", 0.95, None, source="manual",
                                  detail="manually triggered")
        if event_type == "emotion_detected":
            self._distress_alert_until = now + 4.0
            return self._dispatch("emotion_detected", 0.88, "sad",
                                  source="manual",
                                  detail="manually triggered")
        raise ValueError(f"unsupported manual event_type: {event_type!r}")

    # -------------------------------------------------------------- getters
    def jpeg(self) -> Optional[bytes]:
        with self._frame_lock:
            return self._jpeg

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            s = dict(self.state)
        s["thresholds"] = dict(self.thresholds)
        s["hub_endpoint"] = config.EVENTS_ENDPOINT
        s["elder_id"] = config.ELDER_ID
        return s

    def log(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._log)

    def set_thresholds(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        numeric = {
            "fall_torso_angle_deg": (5.0, 89.0),
            "fall_drop_velocity": (0.01, 3.0),
            "emotion_sustained_seconds": (0.0, 30.0),
            "emotion_every_n_frames": (1, 120),
            "cooldown_seconds": (0.0, 120.0),
        }
        for key, (lo, hi) in numeric.items():
            if key in updates:
                try:
                    val = float(updates[key])
                except (TypeError, ValueError):
                    continue
                self.thresholds[key] = max(lo, min(hi, val))
        return dict(self.thresholds)
