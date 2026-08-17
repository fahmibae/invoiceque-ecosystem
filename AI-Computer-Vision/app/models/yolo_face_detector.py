"""YOLO-based face detection module.

Uses Ultralytics YOLO with a face-specific model for accurate face detection.
This provides a middle tier between InsightFace (heavy) and OpenCV Haar (light).

Requires:
    - ultralytics package (in requirements-full.txt)
    - A YOLO model trained for face detection (e.g. yolov8n-face.pt)
    - Set YOLO_FACE_MODEL_PATH to the model weight file
"""

from pathlib import Path
from typing import Any

import numpy as np

from app.config import Settings


class YOLOFaceDetector:
    """Face detector using YOLO model trained specifically for face detection.

    Unlike the ObjectDetector (which detects fraud objects like phones/screens),
    this module uses YOLO specifically for detecting FACES in images.
    It provides much higher accuracy than Haar Cascade while being lighter
    than full InsightFace.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.available = False
        self.reason = "disabled"
        self._model = None

        if not settings.yolo_face_enabled:
            return
        if not settings.yolo_face_model_path:
            self.reason = "YOLO_FACE_MODEL_PATH is not set"
            return
        if not Path(settings.yolo_face_model_path).exists():
            self.reason = f"YOLO face model not found: {settings.yolo_face_model_path}"
            return

        try:
            from ultralytics import YOLO

            self._model = YOLO(settings.yolo_face_model_path)
            self.available = True
            self.reason = "available"
        except Exception as exc:  # pragma: no cover - optional model dependency
            self.reason = f"yolo_face_unavailable: {exc}"

    def detect(self, image: np.ndarray) -> dict[str, Any] | None:
        """Detect faces in an image using YOLO.

        Returns a dict with 'faces' list compatible with the VisionEngine
        face format: [{"x": int, "y": int, "w": int, "h": int}, ...]

        Returns None if YOLO face detection is not available.
        """
        if not self.available or self._model is None:
            return None

        results = self._model.predict(
            source=image[:, :, ::-1],
            conf=self.settings.yolo_face_confidence,
            verbose=False,
        )

        faces: list[dict[str, Any]] = []
        for result in results:
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            for box in boxes:
                xyxy = [float(v) for v in box.xyxy[0].tolist()]
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = xyxy
                w = max(0, x2 - x1)
                h = max(0, y2 - y1)

                # Skip detections that are too small to be valid faces
                if w < self.settings.min_face_size or h < self.settings.min_face_size:
                    continue

                faces.append({
                    "x": int(x1),
                    "y": int(y1),
                    "w": int(w),
                    "h": int(h),
                    "confidence": round(confidence, 4),
                })

        if not faces:
            return None

        # Sort by area (largest first) for consistency with other detectors
        faces.sort(key=lambda f: f["w"] * f["h"], reverse=True)

        return {
            "provider": "yolo-face",
            "model": self.settings.yolo_face_model_path,
            "faces": [
                {"x": f["x"], "y": f["y"], "w": f["w"], "h": f["h"]}
                for f in faces
            ],
            "confidences": [f["confidence"] for f in faces],
        }

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.settings.yolo_face_enabled,
            "available": self.available,
            "provider": "yolo-face",
            "model": self.settings.yolo_face_model_path,
            "reason": self.reason,
        }
