from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import (
    FaceEnrollRequest,
    FaceIdentifyRequest,
    FaceStatusResponse,
    FaceVerifyRequest,
    KycStatusResponse,
    KycVerifyRequest,
)
from app.security import require_api_key
from app.storage import VisionStorage
from app.vision_engine import VisionEngine, cosine_similarity, largest_face

KYC_CHALLENGE_POSES = ("front", "right", "left", "up", "down")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.storage = VisionStorage(settings.db_url)
    app.state.engine = VisionEngine(settings)
    yield
    app.state.storage.close()


app = FastAPI(
    title="InvoiceQu AI Computer Vision",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health(request: Request) -> dict[str, Any]:
    return {
        "status": "healthy",
        "service": "ai-computer-vision",
        "models": request.app.state.engine.model_status(),
        **request.app.state.storage.health(),
    }


@app.post("/v1/face/enroll", dependencies=[Depends(require_api_key)])
def enroll_face(payload: FaceEnrollRequest, request: Request) -> dict[str, Any]:
    engine: VisionEngine = request.app.state.engine
    storage: VisionStorage = request.app.state.storage

    image = decode_or_400(engine, payload.image)
    faces = engine.detect_faces(image)
    quality = engine.face_quality(image, faces)
    face = largest_face(faces)
    anti_spoof = engine.anti_spoof_analysis(image, face, quality)
    object_detection = engine.object_analysis(image)

    if (
        face is None
        or not quality["usable"]
        or not anti_spoof["passed"]
        or object_detection["suspicious"]
    ):
        raise HTTPException(
            status_code=422,
            detail={
                "error": "face_image_not_usable",
                "quality": quality,
                "anti_spoof": anti_spoof,
                "object_detection": object_detection,
            },
        )

    embedding = engine.face_embedding(image, face)
    enrollment_quality = {
        **quality,
        "anti_spoof": anti_spoof,
        "object_detection": object_detection,
        "models": engine.model_status(),
    }
    storage.save_face_enrollment(payload.user_id, payload.email, embedding, enrollment_quality)
    return {
        "enrolled": True,
        "user_id": payload.user_id,
        "quality": enrollment_quality,
    }


@app.post("/v1/face/verify", dependencies=[Depends(require_api_key)])
def verify_face(payload: FaceVerifyRequest, request: Request) -> dict[str, Any]:
    engine: VisionEngine = request.app.state.engine
    storage: VisionStorage = request.app.state.storage
    settings = request.app.state.settings

    enrollment = storage.get_face_enrollment(payload.user_id)
    if enrollment is None:
        return {
            "verified": False,
            "reason": "face_not_enrolled",
            "confidence": 0,
        }

    image = decode_or_400(engine, payload.image)
    faces = engine.detect_faces(image)
    quality = engine.face_quality(image, faces)
    face = largest_face(faces)
    anti_spoof = engine.anti_spoof_analysis(image, face, quality)
    object_detection = engine.object_analysis(image)

    if (
        face is None
        or not quality["usable"]
        or not anti_spoof["passed"]
        or object_detection["suspicious"]
    ):
        return {
            "verified": False,
            "reason": "face_image_not_usable",
            "confidence": 0,
            "quality": quality,
            "anti_spoof": anti_spoof,
            "object_detection": object_detection,
        }

    probe_embedding = engine.face_embedding(image, face)
    confidence = cosine_similarity(probe_embedding, enrollment["embedding"])
    threshold, embedding_provider = _resolve_threshold(engine, settings)
    verified = confidence >= threshold

    return {
        "verified": verified,
        "confidence": round(confidence, 4),
        "threshold": threshold,
        "embedding_provider": embedding_provider,
        "detection_provider": engine.detection_provider,
        "quality": quality,
        "anti_spoof": anti_spoof,
        "object_detection": object_detection,
    }


@app.post("/v1/face/identify", dependencies=[Depends(require_api_key)])
def identify_face(payload: FaceIdentifyRequest, request: Request) -> dict[str, Any]:
    engine: VisionEngine = request.app.state.engine
    storage: VisionStorage = request.app.state.storage
    settings = request.app.state.settings

    image = decode_or_400(engine, payload.image)
    faces = engine.detect_faces(image)
    quality = engine.face_quality(image, faces)
    face = largest_face(faces)
    anti_spoof = engine.anti_spoof_analysis(image, face, quality)
    object_detection = engine.object_analysis(image)

    if (
        face is None
        or not quality["usable"]
        or not anti_spoof["passed"]
        or object_detection["suspicious"]
    ):
        return {
            "verified": False,
            "reason": "face_image_not_usable",
            "confidence": 0,
            "quality": quality,
            "anti_spoof": anti_spoof,
            "object_detection": object_detection,
        }

    probe_embedding = engine.face_embedding(image, face)
    threshold, embedding_provider = _resolve_threshold(engine, settings)
    best_match: dict[str, Any] | None = None
    best_confidence = 0.0

    for enrollment in storage.list_face_enrollments():
        confidence = cosine_similarity(probe_embedding, enrollment["embedding"])
        if confidence > best_confidence:
            best_confidence = confidence
            best_match = enrollment

    verified = best_match is not None and best_confidence >= threshold
    if not verified:
        return {
            "verified": False,
            "reason": "face_not_recognized",
            "confidence": round(best_confidence, 4),
            "threshold": threshold,
            "embedding_provider": embedding_provider,
            "detection_provider": engine.detection_provider,
            "quality": quality,
            "anti_spoof": anti_spoof,
            "object_detection": object_detection,
        }

    return {
        "verified": True,
        "user_id": best_match["user_id"],
        "email": best_match["email"],
        "confidence": round(best_confidence, 4),
        "threshold": threshold,
        "embedding_provider": embedding_provider,
        "detection_provider": engine.detection_provider,
        "quality": quality,
        "anti_spoof": anti_spoof,
        "object_detection": object_detection,
    }


@app.get(
    "/v1/face/status/{user_id}",
    response_model=FaceStatusResponse,
    dependencies=[Depends(require_api_key)],
)
def face_status(user_id: str, request: Request) -> FaceStatusResponse:
    storage: VisionStorage = request.app.state.storage
    enrollment = storage.get_face_enrollment(user_id)
    if enrollment is None:
        return FaceStatusResponse(enrolled=False, user_id=user_id)
    return FaceStatusResponse(
        enrolled=True,
        user_id=user_id,
        updated_at=enrollment["updated_at"],
        quality=enrollment["quality"],
    )


@app.post("/v1/kyc/verify", dependencies=[Depends(require_api_key)])
def verify_kyc(payload: KycVerifyRequest, request: Request) -> dict[str, Any]:
    engine: VisionEngine = request.app.state.engine
    storage: VisionStorage = request.app.state.storage

    selfie_image = decode_or_400(engine, payload.selfie_image)

    selfie_faces = engine.detect_faces(selfie_image)
    selfie_quality = engine.face_quality(selfie_image, selfie_faces)
    selfie_face = largest_face(selfie_faces)
    anti_spoof = engine.anti_spoof_analysis(selfie_image, selfie_face, selfie_quality)
    object_detection = engine.object_analysis(selfie_image)
    challenge = evaluate_kyc_challenge(engine, payload.challenge_frames)

    checks = {
        "selfie": selfie_quality,
        "selfie_face_count": len(selfie_faces),
        "anti_spoof": anti_spoof,
        "object_detection": object_detection,
        "challenge": challenge,
        "verification_mode": "selfie_liveness",
        "models": engine.model_status(),
        "submitted_fields": {
            "full_name_present": bool(payload.full_name),
        },
    }
    if challenge["submitted"]:
        checks["verification_mode"] = "selfie_active_liveness"

    status = decide_kyc_status(selfie_quality, anti_spoof, object_detection, challenge)
    checks["face_enrollment"] = {"created": False, "source": None}
    if status == "approved" and selfie_face is not None:
        embedding = engine.face_embedding(selfie_image, selfie_face)
        enrollment_quality = {
            **selfie_quality,
            "anti_spoof": anti_spoof,
            "object_detection": object_detection,
            "source": "kyc_approved",
            "verification_mode": checks["verification_mode"],
            "models": engine.model_status(),
        }
        storage.save_face_enrollment(
            payload.user_id,
            payload.email,
            embedding,
            enrollment_quality,
        )
        checks["face_enrollment"] = {"created": True, "source": "kyc_approved"}

    storage.save_kyc_record(
        payload.user_id,
        payload.email,
        "selfie_pose_challenge" if challenge["submitted"] else "selfie",
        status,
        checks,
    )

    return {
        "status": status,
        "user_id": payload.user_id,
        "checks": checks,
    }


@app.get(
    "/v1/kyc/status/{user_id}",
    response_model=KycStatusResponse,
    dependencies=[Depends(require_api_key)],
)
def kyc_status(user_id: str, request: Request) -> KycStatusResponse:
    storage: VisionStorage = request.app.state.storage
    record = storage.get_kyc_record(user_id)
    if record is None:
        return KycStatusResponse(user_id=user_id, status="not_submitted")
    return KycStatusResponse(
        user_id=user_id,
        status=record["status"],
        updated_at=record["updated_at"],
        checks=record["checks"],
    )


def decode_or_400(engine: VisionEngine, image_payload: str):
    try:
        return engine.decode_image(image_payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def decide_kyc_status(
    selfie_quality: dict[str, Any],
    anti_spoof: dict[str, Any],
    object_detection: dict[str, Any],
    challenge: dict[str, Any] | None = None,
) -> str:
    selfie_passed = (
        selfie_quality["usable"]
        and anti_spoof["passed"]
        and not object_detection["suspicious"]
    )
    if not selfie_passed:
        reviewable = (
            selfie_quality.get("face_count") == 1
            and selfie_quality.get("passive_liveness")
            and anti_spoof["passed"]
            and not object_detection["suspicious"]
        )
        return "review" if reviewable else "rejected"

    if challenge and challenge["submitted"] and not challenge["passed"]:
        return "review"

    return "approved"


def evaluate_kyc_challenge(engine: VisionEngine, challenge_frames: list[Any]) -> dict[str, Any]:
    if not challenge_frames:
        return {
            "submitted": False,
            "passed": True,
            "required_poses": list(KYC_CHALLENGE_POSES),
            "frames": {},
            "motion": {},
            "missing_poses": list(KYC_CHALLENGE_POSES),
        }

    analyzed: dict[str, dict[str, Any]] = {}
    for frame in challenge_frames:
        image = decode_or_400(engine, frame.image)
        faces = engine.detect_faces(image)
        quality = engine.face_quality(image, faces)
        face = largest_face(faces)
        analyzed[frame.pose] = {
            "quality": quality,
            "face_count": len(faces),
            "geometry": face_geometry(image, face),
            "usable": bool(face is not None and quality["usable"]),
            "readable": bool(
                face is not None
                and len(faces) == 1
                and quality["passive_liveness"]
                and quality["face_area_ratio"] >= 0.035
            ),
        }

    missing_poses = [pose for pose in KYC_CHALLENGE_POSES if pose not in analyzed]
    all_frames_readable = not missing_poses and all(
        analyzed[pose]["readable"] for pose in KYC_CHALLENGE_POSES
    )
    motion = evaluate_challenge_motion(analyzed)
    passed = all_frames_readable and motion["passed"]

    return {
        "submitted": True,
        "passed": passed,
        "required_poses": list(KYC_CHALLENGE_POSES),
        "frames": analyzed,
        "motion": motion,
        "missing_poses": missing_poses,
    }


def face_geometry(
    image,
    face: dict[str, int] | None,
) -> dict[str, float] | None:
    if face is None:
        return None
    img_h, img_w = image.shape[:2]
    center_x = (face["x"] + face["w"] / 2) / max(1, img_w)
    center_y = (face["y"] + face["h"] / 2) / max(1, img_h)
    return {
        "center_x": round(float(center_x), 4),
        "center_y": round(float(center_y), 4),
        "width_ratio": round(float(face["w"] / max(1, img_w)), 4),
        "height_ratio": round(float(face["h"] / max(1, img_h)), 4),
        "area_ratio": round(float((face["w"] * face["h"]) / max(1, img_w * img_h)), 4),
    }


def evaluate_challenge_motion(frames: dict[str, dict[str, Any]]) -> dict[str, Any]:
    required = [pose for pose in KYC_CHALLENGE_POSES if frames.get(pose, {}).get("geometry")]
    if len(required) < len(KYC_CHALLENGE_POSES):
        return {
            "passed": False,
            "front_centered": False,
            "horizontal_passed": False,
            "vertical_passed": False,
            "reason": "missing_face_geometry",
        }

    front = frames["front"]["geometry"]
    left = frames["left"]["geometry"]
    right = frames["right"]["geometry"]
    up = frames["up"]["geometry"]
    down = frames["down"]["geometry"]

    front_centered = abs(front["center_x"] - 0.5) <= 0.28 and abs(front["center_y"] - 0.5) <= 0.30
    horizontal_delta = right["center_x"] - left["center_x"]
    vertical_delta = down["center_y"] - up["center_y"]
    horizontal_passed = horizontal_delta >= 0.02
    vertical_passed = vertical_delta >= 0.015

    return {
        "passed": front_centered and horizontal_passed and vertical_passed,
        "front_centered": front_centered,
        "horizontal_passed": horizontal_passed,
        "vertical_passed": vertical_passed,
        "horizontal_delta": round(float(horizontal_delta), 4),
        "vertical_delta": round(float(vertical_delta), 4),
        "thresholds": {
            "horizontal_delta": 0.02,
            "vertical_delta": 0.015,
        },
    }


def _resolve_threshold(
    engine: VisionEngine, settings,
) -> tuple[float, str]:
    """Pick the right similarity threshold based on the active embedding provider.

    InsightFace deep embeddings are highly discriminative -> lower threshold.
    Enhanced OpenCV embeddings (LBP+HOG+Gabor) are decent -> medium threshold.
    Legacy DCT fallback is weak -> high threshold to avoid false matches.
    """
    if engine.face_provider.available:
        return settings.face_threshold, "insightface"
    if settings.enhanced_detection_enabled:
        return settings.face_threshold_enhanced, "opencv_enhanced"
    return settings.face_threshold_fallback, "opencv_legacy"
