from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def me(user: Annotated[dict, Depends(get_current_user)]) -> dict:
    role = user.get("app_metadata", {}).get("role") or user.get("user_metadata", {}).get("role")
    return {"id": user["id"], "email": user["email"], "role": role}
