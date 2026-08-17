from fastapi import Header, HTTPException

from app.config import get_settings


def require_api_key(x_computer_vision_key: str | None = Header(default=None)) -> None:
    expected = get_settings().api_key
    if not expected:
        return
    if x_computer_vision_key != expected:
        raise HTTPException(status_code=401, detail="Invalid computer vision API key")
