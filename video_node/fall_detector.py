"""
fall_detector.py
----------------
MediaPipe-pose-based fall detection.

Strategy (from the God Document "Fall Math"):
  * Track the elder's skeletal pose with MediaPipe.
  * A fall has two signatures we look for together:
      1. The torso becomes horizontal (spine angle from vertical is large).
      2. The shoulders drop rapidly relative to their recent position
         (a fast collapse, not slowly lying down).
  * When both the torso is horizontal AND the recent shoulder drop was fast,
    we report a fall.
"""

import math
import time
from dataclasses import dataclass
from typing import Optional

import numpy as np
import mediapipe as mp

import config

mp_pose = mp.solutions.pose

# Landmark indices we care about.
L_SHOULDER = mp_pose.PoseLandmark.LEFT_SHOULDER.value
R_SHOULDER = mp_pose.PoseLandmark.RIGHT_SHOULDER.value
L_HIP = mp_pose.PoseLandmark.LEFT_HIP.value
R_HIP = mp_pose.PoseLandmark.RIGHT_HIP.value


@dataclass
class FallResult:
    fell: bool
    confidence: float
    torso_angle_deg: float
    drop_velocity: float


class FallDetector:
    def __init__(
        self,
        min_visibility: float = config.POSE_MIN_VISIBILITY,
        torso_angle_deg: float = config.FALL_TORSO_ANGLE_DEG,
        drop_velocity: float = config.FALL_DROP_VELOCITY,
    ):
        self.min_visibility = min_visibility
        self.torso_angle_threshold = torso_angle_deg
        self.drop_velocity_threshold = drop_velocity

        self.pose = mp_pose.Pose(
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # Rolling memory of the shoulder height for velocity estimation.
        self._prev_shoulder_y: Optional[float] = None
        self._prev_time: Optional[float] = None

        # Keep the last raw landmarks so a caller can draw them if desired.
        self.last_landmarks = None

    @staticmethod
    def _midpoint(a, b):
        return ((a.x + b.x) / 2.0, (a.y + b.y) / 2.0)

    @staticmethod
    def _torso_angle_from_vertical(shoulder_xy, hip_xy) -> float:
        """
        Angle of the torso vector (hip -> shoulder) measured from the
        vertical axis, in degrees. 0 = upright, 90 = fully horizontal.
        """
        dx = shoulder_xy[0] - hip_xy[0]
        dy = shoulder_xy[1] - hip_xy[1]
        # In image coordinates y grows downward; use magnitudes for the angle.
        angle = math.degrees(math.atan2(abs(dx), abs(dy) + 1e-6))
        return angle

    def process(self, rgb_frame: np.ndarray) -> FallResult:
        """Run pose estimation on an RGB frame and evaluate for a fall."""
        results = self.pose.process(rgb_frame)
        self.last_landmarks = results.pose_landmarks

        now = time.monotonic()

        if not results.pose_landmarks:
            self._prev_shoulder_y = None
            self._prev_time = None
            return FallResult(False, 0.0, 0.0, 0.0)

        lm = results.pose_landmarks.landmark

        # Require the key landmarks to be reasonably visible.
        key_pts = [lm[L_SHOULDER], lm[R_SHOULDER], lm[L_HIP], lm[R_HIP]]
        if any(p.visibility < self.min_visibility for p in key_pts):
            self._prev_shoulder_y = None
            self._prev_time = None
            return FallResult(False, 0.0, 0.0, 0.0)

        shoulder = self._midpoint(lm[L_SHOULDER], lm[R_SHOULDER])
        hip = self._midpoint(lm[L_HIP], lm[R_HIP])

        torso_angle = self._torso_angle_from_vertical(shoulder, hip)

        # Estimate vertical velocity of the shoulders (normalized units/sec).
        drop_velocity = 0.0
        if self._prev_shoulder_y is not None and self._prev_time is not None:
            dt = now - self._prev_time
            if dt > 1e-3:
                # Positive when shoulders move DOWN the image (y increases).
                drop_velocity = (shoulder[1] - self._prev_shoulder_y) / dt

        self._prev_shoulder_y = shoulder[1]
        self._prev_time = now

        is_horizontal = torso_angle >= self.torso_angle_threshold
        is_rapid_drop = drop_velocity >= self.drop_velocity_threshold

        fell = is_horizontal and is_rapid_drop

        # Confidence blends how far past each threshold we are.
        if fell:
            angle_score = min(torso_angle / 90.0, 1.0)
            vel_score = min(drop_velocity / (self.drop_velocity_threshold * 2), 1.0)
            confidence = max(0.7, 0.5 * angle_score + 0.5 * vel_score)
            confidence = min(confidence, 0.99)
        else:
            confidence = 0.0

        return FallResult(fell, confidence, torso_angle, drop_velocity)

    def close(self):
        self.pose.close()
