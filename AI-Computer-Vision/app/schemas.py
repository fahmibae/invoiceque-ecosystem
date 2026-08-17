from typing import Any, Literal

from pydantic import BaseModel, Field


class FaceEnrollRequest(BaseModel):
    user_id: str = Field(min_length=1)
    email: str | None = None
    image: str = Field(min_length=64)


class FaceVerifyRequest(BaseModel):
    user_id: str = Field(min_length=1)
    email: str | None = None
    image: str = Field(min_length=64)


class FaceIdentifyRequest(BaseModel):
    image: str = Field(min_length=64)


class FaceStatusResponse(BaseModel):
    enrolled: bool
    user_id: str
    updated_at: str | None = None
    quality: dict[str, Any] | None = None


class KycChallengeFrame(BaseModel):
    pose: Literal["front", "right", "left", "up", "down"]
    image: str = Field(min_length=64)


class KycVerifyRequest(BaseModel):
    user_id: str = Field(min_length=1)
    email: str | None = None
    selfie_image: str = Field(min_length=64)
    challenge_frames: list[KycChallengeFrame] = Field(default_factory=list, max_length=5)
    full_name: str | None = None


class KycStatusResponse(BaseModel):
    user_id: str
    status: Literal["not_submitted", "approved", "review", "rejected"]
    updated_at: str | None = None
    checks: dict[str, Any] | None = None
