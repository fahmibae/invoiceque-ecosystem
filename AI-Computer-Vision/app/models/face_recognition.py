from typing import Any

import numpy as np

from app.config import Settings


class FaceRecognitionProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.available = False
        self.reason = "disabled"
        self._app = None

        if not settings.insightface_enabled:
            return

        try:
            from insightface.app import FaceAnalysis

            app = FaceAnalysis(
                name=settings.insightface_model_name,
                providers=["CPUExecutionProvider"],
            )
            app.prepare(
                ctx_id=settings.insightface_ctx_id,
                det_size=(settings.insightface_det_size, settings.insightface_det_size),
            )
            self._app = app
            self.available = True
            self.reason = "available"
        except Exception as exc:  # pragma: no cover - optional model dependency
            self.reason = f"insightface_unavailable: {exc}"

    def analyze(self, image: np.ndarray) -> dict[str, Any] | None:
        if not self.available or self._app is None:
            return None

        rgb = image[:, :, ::-1]
        faces = self._app.get(rgb)
        parsed = []
        for face in faces:
            x1, y1, x2, y2 = face.bbox.astype(int).tolist()
            embedding = getattr(face, "normed_embedding", None)
            if embedding is None:
                embedding = getattr(face, "embedding", None)
            if embedding is None:
                continue

            parsed.append(
                {
                    "box": {
                        "x": int(x1),
                        "y": int(y1),
                        "w": int(max(0, x2 - x1)),
                        "h": int(max(0, y2 - y1)),
                    },
                    "embedding": normalize_vector(
                        np.asarray(embedding, dtype=np.float32)
                    ),
                    "confidence": float(getattr(face, "det_score", 0.0)),
                }
            )

        if not parsed:
            return None

        parsed.sort(key=lambda item: item["box"]["w"] * item["box"]["h"], reverse=True)
        return {
            "provider": "insightface",
            "faces": [item["box"] for item in parsed],
            "embedding": parsed[0]["embedding"],
            "detection_confidence": parsed[0]["confidence"],
        }

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.settings.insightface_enabled,
            "available": self.available,
            "provider": "insightface",
            "model": self.settings.insightface_model_name,
            "reason": self.reason,
        }


def normalize_vector(vector: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vector))
    if norm == 0:
        return vector
    return vector / norm
