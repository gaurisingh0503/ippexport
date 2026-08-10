from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.db import get_db
from app.models.shipper import Shipper
from app.schemas.entity import ShipperResponse

router = APIRouter(prefix="/shippers", tags=["shippers"])


@router.get("", response_model=list[ShipperResponse])
async def list_shippers(
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Shipper]:
    result = await db.scalars(select(Shipper).order_by(Shipper.name))
    return list(result.all())
