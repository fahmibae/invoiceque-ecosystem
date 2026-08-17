import base64
import binascii
from typing import Any

import cv2
import numpy as np

from app.config import Settings
from app.models.anti_spoof import AntiSpoofModel
from app.models.face_recognition import FaceRecognitionProvider
from app.models.object_detector import ObjectDetector
from app.models.yolo_face_detector import YOLOFaceDetector


class VisionEngine:
    """Multi-tier face detection and recognition engine.

    Detection priority chain:
      1. InsightFace  (deep learning, best accuracy)
      2. YOLO-Face    (fast DL face detector)
      3. Enhanced Haar (multi-cascade + CLAHE + NMS)
      4. Legacy Haar   (single cascade fallback)
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

        # --- Haar cascades (always available via OpenCV) ---
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        if self.face_cascade.empty():
            raise RuntimeError("Failed to load OpenCV Haar face cascade")

        # Extra cascades for enhanced mode
        self._alt_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
        )
        self._profile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_profileface.xml"
        )

        # --- Model providers ---
        self.face_provider = FaceRecognitionProvider(settings)
        self.yolo_face = YOLOFaceDetector(settings)
        self.object_detector = ObjectDetector(settings)
        self.anti_spoof = AntiSpoofModel(settings)

        # Track which provider was last used
        self._last_detection_provider = "opencv_haar"

    # -----------------------------------------------------------------
    # Image decoding
    # -----------------------------------------------------------------
    def decode_image(self, image_payload: str) -> np.ndarray:
        raw_payload = image_payload.split(",", 1)[1] if "," in image_payload else image_payload
        try:
            data = base64.b64decode(raw_payload, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("Image must be a valid base64 payload") from exc

        image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Image payload could not be decoded")
        return image

    # -----------------------------------------------------------------
    # Face detection — multi-tier chain
    # -----------------------------------------------------------------
    def detect_faces(self, image: np.ndarray) -> list[dict[str, int]]:
        # Tier 1: InsightFace
        insight = self.face_provider.analyze(image)
        if insight is not None:
            self._last_detection_provider = "insightface"
            return insight["faces"]

        # Tier 2: YOLO-Face
        yolo_result = self.yolo_face.detect(image)
        if yolo_result is not None:
            self._last_detection_provider = "yolo_face"
            return yolo_result["faces"]

        # Tier 3: Enhanced multi-cascade detection
        if self.settings.enhanced_detection_enabled:
            enhanced = self._enhanced_detect(image)
            if enhanced:
                self._last_detection_provider = "opencv_enhanced"
                return enhanced

        # Tier 4: Legacy Haar
        self._last_detection_provider = "opencv_haar"
        return self._legacy_haar_detect(image)

    def _enhanced_detect(self, image: np.ndarray) -> list[dict[str, int]]:
        """Multi-cascade face detection with CLAHE and NMS.

        Much more robust than single Haar cascade:
        - Uses CLAHE instead of simple equalizeHist (better contrast)
        - Runs multiple cascade classifiers (frontal + alt + profile)
        - Applies Non-Maximum Suppression to merge overlapping detections
        - Flips image for mirrored profile faces
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # CLAHE gives much better contrast than simple equalizeHist
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

        all_boxes: list[tuple[int, int, int, int, float]] = []
        min_sz = (self.settings.min_face_size, self.settings.min_face_size)

        # Primary: frontal face alt2 (more accurate than default)
        faces_alt = self._alt_cascade.detectMultiScale(
            gray, scaleFactor=1.05, minNeighbors=4, minSize=min_sz,
            flags=cv2.CASCADE_SCALE_IMAGE,
        )
        for (x, y, w, h) in faces_alt:
            all_boxes.append((int(x), int(y), int(w), int(h), 0.9))

        # Secondary: default frontal
        faces_def = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.08, minNeighbors=5, minSize=min_sz,
        )
        for (x, y, w, h) in faces_def:
            all_boxes.append((int(x), int(y), int(w), int(h), 0.7))

        # Tertiary: profile face (left-facing)
        if not self._profile_cascade.empty():
            faces_prof = self._profile_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=4, minSize=min_sz,
            )
            for (x, y, w, h) in faces_prof:
                all_boxes.append((int(x), int(y), int(w), int(h), 0.6))

            # Flip for right-profile
            flipped = cv2.flip(gray, 1)
            faces_flip = self._profile_cascade.detectMultiScale(
                flipped, scaleFactor=1.1, minNeighbors=4, minSize=min_sz,
            )
            img_w = image.shape[1]
            for (x, y, w, h) in faces_flip:
                all_boxes.append((int(img_w - x - w), int(y), int(w), int(h), 0.6))

        if not all_boxes:
            return []

        # Non-Maximum Suppression
        return _nms_faces(all_boxes, iou_threshold=0.3)

    def _legacy_haar_detect(self, image: np.ndarray) -> list[dict[str, int]]:
        """Original single-cascade detection (last resort)."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5,
            minSize=(self.settings.min_face_size, self.settings.min_face_size),
        )
        return [
            {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
            for (x, y, w, h) in faces
        ]

    @property
    def detection_provider(self) -> str:
        return self._last_detection_provider

    # -----------------------------------------------------------------
    # Face embedding — enhanced feature extraction
    # -----------------------------------------------------------------
    def face_embedding(self, image: np.ndarray, face: dict[str, int]) -> np.ndarray:
        # Tier 1: InsightFace deep embedding
        insight = self.face_provider.analyze(image)
        if insight is not None:
            return insight["embedding"]

        # Tier 2: Enhanced OpenCV embedding (LBP + HOG + Gabor + DCT)
        return self._enhanced_embedding(image, face)

    def _enhanced_embedding(self, image: np.ndarray, face: dict[str, int]) -> np.ndarray:
        """Generate a rich face embedding using multiple feature descriptors.

        Combines:
        - LBP (Local Binary Pattern): texture features, 59-dim
        - HOG (Histogram of Oriented Gradients): shape features, 144-dim
        - Gabor filter bank: multi-orientation texture, 128-dim
        - DCT (Discrete Cosine Transform): frequency features, 256-dim
        - Spatial intensity grid: position-aware intensity, 64-dim

        Total: ~651-dim (much more discriminative than old 320-dim)
        """
        crop = _crop_face(image, face, margin_ratio=0.2)
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (128, 128), interpolation=cv2.INTER_AREA)

        # CLAHE for better contrast normalization
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
        gray = clahe.apply(gray)
        gray_f = gray.astype(np.float32) / 255.0

        features: list[np.ndarray] = []

        # 1. LBP features (texture — critical for face recognition)
        features.append(_compute_lbp(gray))

        # 2. HOG features (shape — captures facial structure)
        features.append(_compute_hog(gray_f))

        # 3. Gabor filter bank (multi-orientation texture)
        features.append(_compute_gabor(gray_f))

        # 4. DCT features (frequency domain)
        dct = cv2.dct(gray_f)[:16, :16].flatten()
        features.append(dct)

        # 5. Spatial intensity grid (8x8 subregions)
        features.append(_compute_spatial_grid(gray_f, grid=8))

        embedding = np.concatenate(features).astype(np.float32)
        return normalize_vector(embedding)

    # -----------------------------------------------------------------
    # Face quality & analysis
    # -----------------------------------------------------------------
    def face_quality(self, image: np.ndarray, faces: list[dict[str, int]]) -> dict[str, Any]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        contrast = float(np.std(gray))
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        largest = largest_face(faces)
        face_area_ratio = 0.0
        centered_score = 0.0
        min_size_ok = False
        if largest is not None:
            img_h, img_w = image.shape[:2]
            face_area_ratio = float((largest["w"] * largest["h"]) / max(1, img_w * img_h))
            min_size_ok = (
                largest["w"] >= self.settings.min_face_size
                and largest["h"] >= self.settings.min_face_size
            )
            face_cx = largest["x"] + largest["w"] / 2
            face_cy = largest["y"] + largest["h"] / 2
            dx = abs(face_cx - img_w / 2) / max(1, img_w / 2)
            dy = abs(face_cy - img_h / 2) / max(1, img_h / 2)
            centered_score = float(max(0.0, 1.0 - ((dx + dy) / 2)))

        brightness_score = score_range(brightness, 65, 190)
        contrast_score = min(1.0, contrast / 55)
        sharpness_score = min(1.0, sharpness / 120)
        size_score = min(1.0, face_area_ratio / 0.08)
        liveness_score = float(
            0.25 * brightness_score
            + 0.25 * contrast_score
            + 0.25 * sharpness_score
            + 0.15 * size_score
            + 0.10 * centered_score
        )

        usable = (
            len(faces) == 1
            and min_size_ok
            and liveness_score >= self.settings.min_liveness_score
        )

        return {
            "usable": usable,
            "face_count": len(faces),
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "sharpness": round(sharpness, 2),
            "face_area_ratio": round(face_area_ratio, 4),
            "centered_score": round(centered_score, 4),
            "liveness_score": round(liveness_score, 4),
            "passive_liveness": liveness_score >= self.settings.min_liveness_score,
            "detection_provider": self._last_detection_provider,
        }

    def object_analysis(self, image: np.ndarray) -> dict[str, Any]:
        return self.object_detector.detect(image)

    def anti_spoof_analysis(
        self,
        image: np.ndarray,
        face: dict[str, int] | None,
        quality: dict[str, Any],
    ) -> dict[str, Any]:
        return self.anti_spoof.predict(image, face, quality)

    def model_status(self) -> dict[str, Any]:
        return {
            "face_recognition": self.face_provider.status(),
            "yolo_face_detection": self.yolo_face.status(),
            "object_detection": self.object_detector.status(),
            "anti_spoofing": self.anti_spoof.status(),
            "enhanced_detection": self.settings.enhanced_detection_enabled,
        }


# =====================================================================
# Feature extraction helpers (pure functions, no extra dependencies)
# =====================================================================

def _crop_face(
    image: np.ndarray,
    face: dict[str, int],
    margin_ratio: float = 0.2,
) -> np.ndarray:
    x, y, w, h = face["x"], face["y"], face["w"], face["h"]
    margin = int(min(w, h) * margin_ratio)
    y1 = max(0, y - margin)
    y2 = min(image.shape[0], y + h + margin)
    x1 = max(0, x - margin)
    x2 = min(image.shape[1], x + w + margin)
    return image[y1:y2, x1:x2]


def _compute_lbp(gray: np.ndarray) -> np.ndarray:
    """Compute uniform LBP histogram (59-bin).

    LBP encodes local texture by comparing each pixel with its 8 neighbours.
    Uniform patterns (≤2 bitwise transitions) capture most facial textures.
    This is far more discriminative than raw intensity for face recognition.
    """
    rows, cols = gray.shape
    lbp = np.zeros((rows - 2, cols - 2), dtype=np.uint8)

    # 8-neighbour LBP
    for i, (dy, dx) in enumerate([
        (-1, -1), (-1, 0), (-1, 1), (0, 1),
        (1, 1), (1, 0), (1, -1), (0, -1),
    ]):
        neighbour = gray[1 + dy:rows - 1 + dy, 1 + dx:cols - 1 + dx]
        lbp |= ((neighbour >= gray[1:rows - 1, 1:cols - 1]).astype(np.uint8) << i)

    # Map to uniform patterns (59 bins)
    uniform_map = _build_uniform_lbp_map()
    lbp_uniform = uniform_map[lbp]
    hist, _ = np.histogram(lbp_uniform, bins=59, range=(0, 59), density=True)
    return hist.astype(np.float32)


def _build_uniform_lbp_map() -> np.ndarray:
    """Build LBP -> uniform-pattern lookup table (256 entries -> 59 bins)."""
    table = np.full(256, 58, dtype=np.uint8)  # bin 58 = non-uniform
    uniform_idx = 0
    for i in range(256):
        bits = format(i, "08b")
        transitions = sum(bits[j] != bits[j + 1] for j in range(7))
        transitions += int(bits[0] != bits[7])
        if transitions <= 2:
            table[i] = uniform_idx
            uniform_idx += 1
    return table


def _compute_hog(gray_f: np.ndarray) -> np.ndarray:
    """Compute multi-cell HOG features.

    Divides face into 4x4 grid cells, computes 9-bin gradient orientation
    histogram per cell = 144-dim feature vector. Captures facial structure
    (edges of nose, mouth, eyes) effectively.
    """
    gx = cv2.Sobel(gray_f, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray_f, cv2.CV_32F, 0, 1, ksize=3)
    magnitude, angle = cv2.cartToPolar(gx, gy, angleInDegrees=True)
    angle = angle % 180  # Unsigned gradients

    h, w = gray_f.shape
    cell_h, cell_w = h // 4, w // 4
    bins = 9
    features: list[np.ndarray] = []

    for cy in range(4):
        for cx in range(4):
            y1, y2 = cy * cell_h, (cy + 1) * cell_h
            x1, x2 = cx * cell_w, (cx + 1) * cell_w
            cell_mag = magnitude[y1:y2, x1:x2]
            cell_ang = angle[y1:y2, x1:x2]
            hist, _ = np.histogram(
                cell_ang, bins=bins, range=(0, 180),
                weights=cell_mag, density=False,
            )
            norm = np.linalg.norm(hist) + 1e-7
            features.append((hist / norm).astype(np.float32))

    return np.concatenate(features)


def _compute_gabor(gray_f: np.ndarray) -> np.ndarray:
    """Compute Gabor filter bank responses.

    8 orientations × 2 scales = 16 filters.
    For each filter: mean + std of response = 32-dim.
    Gabor filters are biologically inspired and capture texture at
    specific orientations/scales — excellent for face recognition.
    """
    features: list[float] = []
    for theta_idx in range(8):
        theta = theta_idx * np.pi / 8
        for sigma in (3.0, 5.0):
            kernel = cv2.getGaborKernel(
                ksize=(21, 21), sigma=sigma, theta=theta,
                lambd=10.0, gamma=0.5, psi=0,
            )
            response = cv2.filter2D(gray_f, cv2.CV_32F, kernel)
            features.append(float(np.mean(response)))
            features.append(float(np.std(response)))

    return np.array(features, dtype=np.float32)


def _compute_spatial_grid(gray_f: np.ndarray, grid: int = 8) -> np.ndarray:
    """Compute spatial intensity statistics on an NxN grid.

    Each cell gets mean intensity → captures spatial layout of face
    (darker eye regions, lighter forehead, etc.)
    """
    h, w = gray_f.shape
    cell_h, cell_w = h // grid, w // grid
    features: list[float] = []
    for cy in range(grid):
        for cx in range(grid):
            y1, y2 = cy * cell_h, (cy + 1) * cell_h
            x1, x2 = cx * cell_w, (cx + 1) * cell_w
            features.append(float(np.mean(gray_f[y1:y2, x1:x2])))
    return np.array(features, dtype=np.float32)


def _nms_faces(
    boxes: list[tuple[int, int, int, int, float]],
    iou_threshold: float = 0.3,
) -> list[dict[str, int]]:
    """Non-Maximum Suppression for face bounding boxes.

    Merges overlapping detections from multiple cascades, keeping
    only the highest-confidence detection in each cluster.
    """
    if not boxes:
        return []

    # Sort by confidence descending
    boxes = sorted(boxes, key=lambda b: b[4], reverse=True)
    keep: list[dict[str, int]] = []

    while boxes:
        best = boxes.pop(0)
        keep.append({"x": best[0], "y": best[1], "w": best[2], "h": best[3]})
        boxes = [
            b for b in boxes
            if _iou(best[:4], b[:4]) < iou_threshold
        ]

    return keep


def _iou(a: tuple, b: tuple) -> float:
    ax1, ay1, aw, ah = a
    bx1, by1, bw, bh = b
    ax2, ay2 = ax1 + aw, ay1 + ah
    bx2, by2 = bx1 + bw, by1 + bh

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0

    inter = (ix2 - ix1) * (iy2 - iy1)
    union = aw * ah + bw * bh - inter
    return inter / max(union, 1)


# =====================================================================
# Utility functions
# =====================================================================

def largest_face(faces: list[dict[str, int]]) -> dict[str, int] | None:
    if not faces:
        return None
    return max(faces, key=lambda item: item["w"] * item["h"])


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a_norm = normalize_vector(a)
    b_norm = normalize_vector(b)
    return float(np.dot(a_norm, b_norm))


def normalize_vector(vector: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vector))
    if norm == 0:
        return vector
    return vector / norm


def score_range(value: float, low: float, high: float) -> float:
    if value < low:
        return max(0.0, value / low)
    if value > high:
        return max(0.0, 1.0 - ((value - high) / high))
    return 1.0
