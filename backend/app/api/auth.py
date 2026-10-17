from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user, is_admin

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def me(user: Annotated[dict, Depends(get_current_user)]) -> dict:
    return {"id": user["id"], "email": user["email"], "role": "admin" if is_admin(user) else "user"}
