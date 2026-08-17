"""Anti-spoofing module with enhanced heuristic fallback.

When TensorFlow/Keras deep model is available, uses it for prediction.
When not available (lite mode), uses enhanced heuristic analysis:
  - LBP texture variance (flat printed photos have low variance)
  - Color space analysis (HSV/YCbCr for screen/print detection)
  - Moiré pattern detection (screen replay attacks)
  - Frequency domain analysis (spectral energy distribution)
  - Skin color validation in YCbCr space
"""

from pathlib import Path
from typing import Any

import cv2
import numpy as np

from app.config import Settings


class AntiSpoofModel:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.available = False
        self.reason = "disabled"
        self._model = None

        if not settings.anti_spoof_enabled:
            return
        if not settings.anti_spoof_model_path:
            self.reason = "ANTI_SPOOF_MODEL_PATH is not set"
            return
        if not Path(settings.anti_spoof_model_path).exists():
            self.reason = f"anti-spoof model not found: {settings.anti_spoof_model_path}"
            return

        try:
            import tensorflow as tf

            self._model = tf.keras.models.load_model(settings.anti_spoof_model_path)
            self.available = True
            self.reason = "available"
        except Exception as exc:  # pragma: no cover - optional model dependency
            self.reason = f"tensorflow_keras_unavailable: {exc}"

    def predict(
        self,
        image: np.ndarray,
        face: dict[str, int] | None,
        quality: dict[str, Any],
    ) -> dict[str, Any]:
        # Deep model prediction (best accuracy)
        if self.available and self._model is not None:
            return self._predict_deep(image, face)

        # Enhanced heuristic fallback (much better than old simple check)
        return self._predict_heuristic(image, face, quality)

    def _predict_deep(
        self, image: np.ndarray, face: dict[str, int] | None,
    ) -> dict[str, Any]:
        if face is None:
            return {
                "enabled": True,
                "available": True,
                "provider": "tensorflow-keras",
                "score": 0,
                "threshold": self.settings.anti_spoof_threshold,
                "passed": False,
            }

        crop = crop_face(image, face)
        resized = cv2.resize(
            crop,
            (self.settings.anti_spoof_input_size, self.settings.anti_spoof_input_size),
            interpolation=cv2.INTER_AREA,
        )
        rgb = resized[:, :, ::-1].astype(np.float32) / 255.0
        prediction = self._model.predict(np.expand_dims(rgb, axis=0), verbose=0)
        score = extract_live_score(prediction)
        return {
            "enabled": True,
            "available": True,
            "provider": "tensorflow-keras",
            "model": self.settings.anti_spoof_model_path,
            "score": round(score, 4),
            "threshold": self.settings.anti_spoof_threshold,
            "passed": score >= self.settings.anti_spoof_threshold,
        }

    def _predict_heuristic(
        self,
        image: np.ndarray,
        face: dict[str, int] | None,
        quality: dict[str, Any],
    ) -> dict[str, Any]:
        """Enhanced heuristic anti-spoofing analysis.

        Combines multiple signals that distinguish real faces from
        photos/screens without needing a deep learning model.
        """
        base_score = float(quality.get("liveness_score", 0.0))
        base_passed = bool(quality.get("passive_liveness", False))

        if face is None:
            return {
                "enabled": self.settings.anti_spoof_enabled,
                "available": False,
                "provider": "enhanced_heuristic",
                "reason": self.reason,
                "score": round(base_score, 4),
                "threshold": self.settings.min_liveness_score,
                "passed": base_passed,
                "checks": {},
            }

        crop = crop_face(image, face)
        checks: dict[str, Any] = {}

        # 1. LBP texture variance — printed photos are unnaturally smooth
        texture_score = _texture_analysis(crop)
        checks["texture"] = round(texture_score, 4)

        # 2. Color distribution — screens have different color profiles
        color_score = _color_analysis(crop)
        checks["color"] = round(color_score, 4)

        # 3. Moiré pattern detection — screen replay attacks
        moire_score = _moire_detection(crop)
        checks["moire"] = round(moire_score, 4)

        # 4. Skin color validation in YCbCr — real skin has specific ranges
        skin_score = _skin_color_check(crop)
        checks["skin"] = round(skin_score, 4)

        # 5. Frequency analysis — real faces have natural frequency distribution
        freq_score = _frequency_analysis(crop)
        checks["frequency"] = round(freq_score, 4)

        # Weighted combination
        combined = (
            0.20 * base_score
            + 0.25 * texture_score
            + 0.15 * color_score
            + 0.15 * moire_score
            + 0.15 * skin_score
            + 0.10 * freq_score
        )

        passed = combined >= self.settings.min_liveness_score
        return {
            "enabled": self.settings.anti_spoof_enabled,
            "available": False,
            "provider": "enhanced_heuristic",
            "reason": self.reason,
            "score": round(combined, 4),
            "threshold": self.settings.min_liveness_score,
            "passed": passed,
            "checks": checks,
        }

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.settings.anti_spoof_enabled,
            "available": self.available,
            "provider": "tensorflow-keras" if self.available else "enhanced_heuristic",
            "model": self.settings.anti_spoof_model_path,
            "reason": self.reason,
        }


# =====================================================================
# Heuristic analysis helpers
# =====================================================================

def crop_face(image: np.ndarray, face: dict[str, int]) -> np.ndarray:
    x, y, w, h = face["x"], face["y"], face["w"], face["h"]
    margin = int(min(w, h) * 0.18)
    y1 = max(0, y - margin)
    y2 = min(image.shape[0], y + h + margin)
    x1 = max(0, x - margin)
    x2 = min(image.shape[1], x + w + margin)
    return image[y1:y2, x1:x2]


def _texture_analysis(crop: np.ndarray) -> float:
    """LBP-based texture variance analysis.

    Real faces have rich, varied texture (pores, micro-expressions).
    Printed photos and screen replays are smoother / more uniform.
    """
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (64, 64))

    # Simple LBP
    rows, cols = gray.shape
    lbp = np.zeros((rows - 2, cols - 2), dtype=np.uint8)
    center = gray[1:rows - 1, 1:cols - 1]
    for dy, dx, bit in [
        (-1, -1, 0), (-1, 0, 1), (-1, 1, 2), (0, 1, 3),
        (1, 1, 4), (1, 0, 5), (1, -1, 6), (0, -1, 7),
    ]:
        neighbour = gray[1 + dy:rows - 1 + dy, 1 + dx:cols - 1 + dx]
        lbp |= ((neighbour >= center).astype(np.uint8) << bit)

    # High variance = rich texture = more likely real
    variance = float(np.var(lbp.astype(np.float32)))
    # Normalize: typical real face LBP variance is 2000-6000
    score = min(1.0, variance / 4000.0)
    return max(0.0, score)


def _color_analysis(crop: np.ndarray) -> float:
    """HSV color distribution analysis.

    Screens emit specific color profiles (high saturation peaks).
    Printed photos have reduced color gamut.
    Real faces have natural HSV distribution.
    """
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    # Real faces: moderate saturation variance, not too uniform
    s_std = float(np.std(s.astype(np.float32)))
    s_mean = float(np.mean(s.astype(np.float32)))

    # Screens tend to have very high or very uniform saturation
    sat_score = 1.0
    if s_std < 15:  # Too uniform = likely screen/print
        sat_score = s_std / 15.0
    elif s_mean > 200:  # Oversaturated = likely screen
        sat_score = max(0.0, 1.0 - (s_mean - 200) / 55.0)

    # Value channel: real faces have natural brightness variation
    v_std = float(np.std(v.astype(np.float32)))
    val_score = min(1.0, v_std / 40.0)

    return (sat_score + val_score) / 2.0


def _moire_detection(crop: np.ndarray) -> float:
    """Moiré pattern detection for screen replay attacks.

    Screens produce characteristic high-frequency interference patterns
    (Moiré) that are detectable via spectral analysis.
    """
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (128, 128)).astype(np.float32)

    # FFT for frequency analysis
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude = np.log1p(np.abs(fshift))

    # Moiré creates peaks in specific frequency bands
    h, w = magnitude.shape
    cy, cx = h // 2, w // 2

    # High-frequency energy (outer ring of spectrum)
    mask_high = np.zeros_like(magnitude)
    cv2.circle(mask_high, (cx, cy), min(cx, cy), 1, -1)
    mask_inner = np.zeros_like(magnitude)
    cv2.circle(mask_inner, (cx, cy), min(cx, cy) // 3, 1, -1)
    high_freq_mask = mask_high - mask_inner

    total_energy = float(np.sum(magnitude))
    high_energy = float(np.sum(magnitude * high_freq_mask))

    if total_energy < 1e-6:
        return 0.5

    ratio = high_energy / total_energy
    # Real faces: ratio typically 0.3-0.6
    # Screens with moiré: ratio > 0.7
    if ratio > 0.7:
        return max(0.0, 1.0 - (ratio - 0.7) / 0.3)
    return 1.0


def _skin_color_check(crop: np.ndarray) -> float:
    """Skin color validation in YCbCr color space.

    Real skin has well-known ranges in YCbCr space.
    Photos/screens may have shifted or unrealistic skin colors.
    """
    ycrcb = cv2.cvtColor(crop, cv2.COLOR_BGR2YCrCb)
    _, cr, cb = cv2.split(ycrcb)

    # Standard skin color ranges in YCbCr
    # Cr: 133-173, Cb: 77-127
    skin_mask = (
        (cr >= 133) & (cr <= 173) &
        (cb >= 77) & (cb <= 127)
    )
    skin_ratio = float(np.sum(skin_mask)) / max(1, skin_mask.size)

    # Real face crop should have 20-80% skin pixels
    if skin_ratio < 0.10:
        return skin_ratio / 0.10
    if skin_ratio > 0.90:
        return max(0.0, 1.0 - (skin_ratio - 0.90) / 0.10)
    return 1.0


def _frequency_analysis(crop: np.ndarray) -> float:
    """Natural frequency distribution check.

    Real faces have a smooth, natural falloff of frequency energy.
    Printed photos may have sharper edges; screens may have banding.
    """
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (64, 64))

    # Laplacian variance (sharpness / high-frequency content)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # Too low = blurry/flat (print), too high = artificial sharpening
    if laplacian_var < 50:
        return laplacian_var / 50.0
    if laplacian_var > 2000:
        return max(0.0, 1.0 - (laplacian_var - 2000) / 2000.0)
    return 1.0


def extract_live_score(prediction: Any) -> float:
    values = np.asarray(prediction).reshape(-1)
    if values.size == 0:
        return 0.0
    if values.size == 1:
        return float(values[0])
    return float(values[-1])
