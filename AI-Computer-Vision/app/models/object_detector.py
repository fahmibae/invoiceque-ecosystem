from pathlib import Path
from typing import Any

import numpy as np

from app.config import Settings


class ObjectDetector:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.available = False
        self.reason = "disabled"
        self._model = None

        if not settings.yolo_enabled:
            return
        if not settings.yolo_model_path:
            self.reason = "YOLO_MODEL_PATH is not set"
            return
        if not Path(settings.yolo_model_path).exists():
            self.reason = f"YOLO model not found: {settings.yolo_model_path}"
            return

        try:
            from ultralytics import YOLO

            self._model = YOLO(settings.yolo_model_path)
            self.available = True
            self.reason = "available"
        except Exception as exc:  # pragma: no cover - optional model dependency
            self.reason = f"yolo_unavailable: {exc}"

    def detect(self, image: np.ndarray) -> dict[str, Any]:
        if not self.available or self._model is None:
            return {
                "enabled": self.settings.yolo_enabled,
                "available": False,
                "reason": self.reason,
                "objects": [],
                "suspicious": False,
                "suspicious_objects": [],
            }

        results = self._model.predict(
            source=image[:, :, ::-1],
            conf=self.settings.yolo_confidence,
            verbose=False,
        )
        objects = []
        for result in results:
            names = result.names
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            for box in boxes:
                class_id = int(box.cls[0])
                label = str(names.get(class_id, class_id)).lower()
                confidence = float(box.conf[0])
                xyxy = [float(value) for value in box.xyxy[0].tolist()]
                objects.append(
                    {
                        "label": label,
                        "confidence": round(confidence, 4),
                        "box": {
                            "x1": round(xyxy[0], 2),
                            "y1": round(xyxy[1], 2),
                            "x2": round(xyxy[2], 2),
                            "y2": round(xyxy[3], 2),
                        },
                    }
                )

        suspicious_objects = [
            item
            for item in objects
            if item["label"] in self.settings.yolo_suspicious_classes
        ]
        return {
            "enabled": True,
            "available": True,
            "model": self.settings.yolo_model_path,
            "objects": objects,
            "suspicious": bool(suspicious_objects),
            "suspicious_objects": suspicious_objects,
        }

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.settings.yolo_enabled,
            "available": self.available,
            "provider": "ultralytics-yolo",
            "model": self.settings.yolo_model_path,
            "reason": self.reason,
        }
