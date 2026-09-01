"""
emotion_detector.py
-------------------
DeepFace-based emotional distress detection.

Faithful to the God Document rule -- "if DeepFace returns sad or fear,
trigger an emotion_detected event" -- but hardened against the three things
that make that rule fire falsely in practice:

  1. No face in frame. With enforce_detection=False DeepFace still returns a
     low-confidence guess (often "sad"/"neutral") when nobody is looking at
     the camera. We gate on the detector actually finding a face.
  2. Weak reads. A 26%-confident "sad" is noise. We require a minimum
     emotion score before a distress label counts.
  3. Single-frame flicker. Instead of resetting a timer on every stray
     frame, we keep a rolling window of recent analyses and fire only when a
     majority of them agree it is distress AND the run has been sustained.

The emitted event and the Schema A payload are unchanged: this only reduces
false positives.
"""

import time
from collections import deque
from dataclasses import dataclass
from typing import Deque, Optional, Tuple

import numpy as np

import config


@dataclass
class EmotionResult:
    distress: bool          # True only when sustained distress is confirmed
    dominant_emotion: Optional[str]
    confidence: float
    analyzed: bool          # True if DeepFace actually ran on this frame
    face_present: bool = False   # whether a face was located this analysis


class EmotionDetector:
    def __init__(
        self,
        analyze_every_n: int = config.EMOTION_ANALYZE_EVERY_N_FRAMES,
        distress_emotions=config.DISTRESS_EMOTIONS,
        sustained_seconds: float = config.EMOTION_SUSTAINED_SECONDS,
        require_face: bool = bool(config.EMOTION_REQUIRE_FACE),
        min_face_confidence: float = config.EMOTION_MIN_FACE_CONFIDENCE,
        min_confidence: float = config.EMOTION_MIN_CONFIDENCE,
        window: int = config.EMOTION_WINDOW,
        vote_ratio: float = config.EMOTION_VOTE_RATIO,
    ):
        self.analyze_every_n = max(1, analyze_every_n)
        self.distress_emotions = tuple(e.lower() for e in distress_emotions)
        self.sustained_seconds = sustained_seconds
        self.require_face = require_face
        self.min_face_confidence = min_face_confidence
        self.min_confidence = min_confidence
        self.window = max(1, window)
        self.vote_ratio = vote_ratio

        self._frame_counter = 0
        # Rolling record of recent analyses: True == counted as distress.
        self._votes: Deque[bool] = deque(maxlen=self.window)
        # When the current unbroken run of majority-distress began.
        self._distress_since: Optional[float] = None

        # Import DeepFace lazily so the rest of the app can be imported and
        # unit-tested without the heavy TensorFlow stack being present.
        from deepface import DeepFace  # noqa: WPS433
        self._DeepFace = DeepFace

    def _analyze(self, bgr_frame: np.ndarray) -> Tuple[Optional[str], float, bool]:
        """Run DeepFace; return (dominant_emotion, confidence, face_present)."""
        try:
            result = self._DeepFace.analyze(
                bgr_frame,
                actions=["emotion"],
                enforce_detection=False,  # never raise; we gate on the score
                silent=True,
            )
            if isinstance(result, list):
                if not result:
                    return None, 0.0, False
                result = result[0]

            dominant = str(result.get("dominant_emotion", "")).lower()
            scores = result.get("emotion", {}) or {}
            confidence = float(scores.get(dominant, 0.0)) / 100.0

            # DeepFace reports the region it analyzed. When no real face is
            # found it returns the whole frame (x=y=0, full width/height) and
            # a face_confidence near 0. Use both signals to decide presence.
            region = result.get("region", {}) or {}
            face_conf = float(result.get("face_confidence", 0.0) or 0.0)
            h, w = bgr_frame.shape[:2]
            covers_whole = (
                int(region.get("w", 0)) >= w and int(region.get("h", 0)) >= h
            )
            face_present = face_conf >= self.min_face_confidence and not covers_whole
            return dominant, confidence, face_present
        except Exception as exc:  # DeepFace throws various runtime errors
            print(f"[EMOTION][WARN] DeepFace analyze failed: {exc}")
            return None, 0.0, False

    def _record(self, is_distress: bool) -> bool:
        """Add a vote and return whether the window now says distress."""
        self._votes.append(is_distress)
        if not self._votes:
            return False
        ratio = sum(self._votes) / len(self._votes)
        # Require a full window before a verdict, so we do not fire on the
        # very first distress frame purely because the window is tiny.
        if len(self._votes) < self.window:
            return False
        return ratio >= self.vote_ratio

    def process(self, bgr_frame: np.ndarray) -> EmotionResult:
        """
        Feed a BGR frame (as read from OpenCV). Only every Nth frame is
        actually analyzed; other frames are cheap no-ops.
        """
        self._frame_counter += 1
        if self._frame_counter % self.analyze_every_n != 0:
            return EmotionResult(False, None, 0.0, analyzed=False)

        dominant, confidence, face_present = self._analyze(bgr_frame)
        now = time.monotonic()

        # Decide whether THIS analysis counts as a distress vote.
        is_distress_frame = dominant in self.distress_emotions
        if self.require_face and not face_present:
            is_distress_frame = False
        if confidence < self.min_confidence:
            is_distress_frame = False

        window_says_distress = self._record(is_distress_frame)

        if window_says_distress:
            if self._distress_since is None:
                self._distress_since = now
            elapsed = now - self._distress_since
            fired = elapsed >= self.sustained_seconds
            return EmotionResult(fired, dominant, confidence,
                                 analyzed=True, face_present=face_present)

        # Window no longer agrees on distress -> reset the sustained timer.
        self._distress_since = None
        return EmotionResult(False, dominant, confidence,
                             analyzed=True, face_present=face_present)
