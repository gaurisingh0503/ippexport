from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.db import get_db
from app.models.material import Material
from app.schemas.entity import MaterialResponse

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("", response_model=list[MaterialResponse])
async def list_materials(
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Material]:
    result = await db.scalars(select(Material).order_by(Material.material_name))
    return list(result.all())
