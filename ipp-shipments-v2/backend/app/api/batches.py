import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user
from app.db import get_db
from app.models.bundle import Bundle  # noqa: F401
from app.models.material import Material  # noqa: F401
from app.models.shipper import Shipper  # noqa: F401
from app.models.sticker_batch import StickerBatch
from app.schemas.sticker_batch import StickerBatchCreate, StickerBatchOut, StickerBatchUpdate

router = APIRouter(prefix="/batches", tags=["batches"])

_LOAD_OPTIONS = (
    selectinload(StickerBatch.shipper),
    selectinload(StickerBatch.material),
)


async def _get_batch_or_404(db: AsyncSession, batch_id: uuid.UUID) -> StickerBatch:
    batch = await db.scalar(
        select(StickerBatch).where(StickerBatch.id == batch_id).options(*_LOAD_OPTIONS)
    )
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.post("", response_model=StickerBatchOut, status_code=201)
async def create_batch(
    body: StickerBatchCreate,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StickerBatch:
    batch = StickerBatch(**body.model_dump())
    db.add(batch)
    await db.commit()
    return await _get_batch_or_404(db, batch.id)


@router.get("", response_model=list[StickerBatchOut])
async def list_batches(
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    type: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> list[StickerBatch]:
    query = select(StickerBatch).options(*_LOAD_OPTIONS)

    if type:
        query = query.where(StickerBatch.type == type)
    if status:
        query = query.where(StickerBatch.status == status)

    result = await db.scalars(query.order_by(StickerBatch.created_at.desc()))
    return list(result.all())


@router.get("/{batch_id}", response_model=StickerBatchOut)
async def get_batch(
    batch_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StickerBatch:
    return await _get_batch_or_404(db, batch_id)


@router.patch("/{batch_id}", response_model=StickerBatchOut)
async def update_batch(
    batch_id: uuid.UUID,
    body: StickerBatchUpdate,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StickerBatch:
    batch = await _get_batch_or_404(db, batch_id)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(batch, field, value)

    await db.commit()
    return await _get_batch_or_404(db, batch_id)
