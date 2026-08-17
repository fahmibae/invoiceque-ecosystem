from functools import lru_cache
from os import getenv


def env_bool(name: str, default: bool) -> bool:
    raw = getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    def __init__(self) -> None:
        self.app_name = getenv("APP_NAME", "InvoiceQu AI Computer Vision")
        self.api_key = getenv("COMPUTER_VISION_API_KEY", "").strip()
        self.host = getenv("HOST", "0.0.0.0")
        self.port = int(getenv("PORT", "8010"))
        self.db_url = (
            getenv("COMPUTER_VISION_DB_URL")
            or getenv("DATABASE_URL")
            or getenv("AUTH_DB_URL")
            or ""
        ).strip()
        self.face_threshold = float(getenv("FACE_THRESHOLD", "0.78"))
        # OpenCV DCT fallback embedding is far less discriminative than
        # InsightFace; use a much stricter threshold to avoid false matches.
        self.face_threshold_fallback = float(getenv("FACE_THRESHOLD_FALLBACK", "0.94"))
        # Enhanced embedding (LBP+HOG+Gabor) is more discriminative than
        # legacy DCT but still not as good as InsightFace deep features.
        self.face_threshold_enhanced = float(getenv("FACE_THRESHOLD_ENHANCED", "0.88"))
        self.min_face_size = int(getenv("MIN_FACE_SIZE", "80"))
        self.min_liveness_score = float(getenv("MIN_LIVENESS_SCORE", "0.45"))

        # --- InsightFace (Tier 1 — best quality, heavy) ---
        self.insightface_enabled = env_bool("INSIGHTFACE_ENABLED", False)
        self.insightface_model_name = getenv("INSIGHTFACE_MODEL_NAME", "buffalo_l")
        self.insightface_det_size = int(getenv("INSIGHTFACE_DET_SIZE", "640"))
        self.insightface_ctx_id = int(getenv("INSIGHTFACE_CTX_ID", "-1"))

        # --- YOLO-Face (Tier 2 — accurate face detection, medium) ---
        self.yolo_face_enabled = env_bool("YOLO_FACE_ENABLED", False)
        self.yolo_face_model_path = getenv("YOLO_FACE_MODEL_PATH", "").strip()
        self.yolo_face_confidence = float(getenv("YOLO_FACE_CONFIDENCE", "0.40"))

        # --- YOLO Object Detection (fraud scene detection) ---
        self.yolo_enabled = env_bool("YOLO_ENABLED", False)
        self.yolo_model_path = getenv("YOLO_MODEL_PATH", "").strip()
        self.yolo_confidence = float(getenv("YOLO_CONFIDENCE", "0.35"))
        self.yolo_suspicious_classes = {
            item.strip().lower()
            for item in getenv(
                "YOLO_SUSPICIOUS_CLASSES",
                "cell phone,tv,laptop,book,remote,keyboard,mouse",
            ).split(",")
            if item.strip()
        }

        # --- Anti-Spoofing (TF/Keras deep model) ---
        self.anti_spoof_enabled = env_bool("ANTI_SPOOF_ENABLED", False)
        self.anti_spoof_model_path = getenv("ANTI_SPOOF_MODEL_PATH", "").strip()
        self.anti_spoof_threshold = float(getenv("ANTI_SPOOF_THRESHOLD", "0.60"))
        self.anti_spoof_input_size = int(getenv("ANTI_SPOOF_INPUT_SIZE", "224"))

        # --- Enhanced OpenCV detection (Tier 3 — lite, no extra deps) ---
        # When True, use multi-cascade + CLAHE + NMS instead of single Haar.
        self.enhanced_detection_enabled = env_bool("ENHANCED_DETECTION_ENABLED", True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
