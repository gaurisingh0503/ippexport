from typing import Annotated

import httpx
from fastapi import Depends, Header, HTTPException

from app.config import settings


def is_admin(user: dict) -> bool:
    return (user.get("email") or "").lower() in settings.admin_emails_list


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.removeprefix("Bearer ")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = response.json()
    allowed = settings.allowed_emails_list
    if allowed and (user.get("email") or "").lower() not in allowed:
        raise HTTPException(status_code=403, detail="This account is not authorized to use IPP Shipments")
    return user


async def require_admin(user: Annotated[dict, Depends(get_current_user)]) -> dict:
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Only an admin can do this")
    return user
