import logging
import re
import uuid
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user
from app.db import get_db
from app.models.bundle import Bundle
from app.models.material import Material
from app.models.shipper import Shipper  # noqa: F401
from app.models.sticker_batch import StickerBatch
from app.schemas.bundle import BundleOut, BundleUpdate
from app.schemas.sticker_batch import StickerBatchCreate, StickerBatchOut, StickerBatchUpdate
from app.services.image_type import prepare_bundle_image
from app.services.excel import generate_stickers
from app.services.ocr import extract_bundle_data
from app.services.storage import delete_bundle_image, signed_image_url, upload_bundle_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/batches", tags=["batches"])

_BATCH_LOAD = (
    selectinload(StickerBatch.shipper),
    selectinload(StickerBatch.material),
)

_BUNDLE_LOAD = (selectinload(Bundle.material),)


async def _get_batch_or_404(db: AsyncSession, batch_id: uuid.UUID) -> StickerBatch:
    batch = await db.scalar(
        select(StickerBatch).where(StickerBatch.id == batch_id).options(*_BATCH_LOAD)
    )
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


async def _get_bundle_or_404(
    db: AsyncSession, batch_id: uuid.UUID, bundle_id: uuid.UUID
) -> Bundle:
    bundle = await db.scalar(
        select(Bundle)
        .where(Bundle.id == bundle_id, Bundle.sticker_batch_id == batch_id)
        .options(*_BUNDLE_LOAD)
    )
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return bundle


async def _bundle_to_out(bundle: Bundle) -> BundleOut:
    out = BundleOut.model_validate(bundle)
    out.image_url = await signed_image_url(bundle.image_path)
    return out


async def _resolve_material_id(
    db: AsyncSession, batch: StickerBatch, ocr_material_name: str | None
) -> uuid.UUID:
    if ocr_material_name:
        materials = await db.scalars(select(Material))
        for material in materials.all():
            if material.material_name.lower() == ocr_material_name.strip().lower():
                return material.id
    return batch.material_id


def _normalize_ocr_result(raw: dict) -> dict:
    def as_str(value: object) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    def as_int(value: object) -> int | None:
        if value is None or value == "":
            return None
        return int(float(value))

    def as_float(value: object) -> float | None:
        if value is None or value == "":
            return None
        return float(value)

    def as_lot_no(value: object) -> str | None:
        lot_no = as_str(value)
        if lot_no and re.fullmatch(r"R\d+-\d+", lot_no, flags=re.IGNORECASE):
            return lot_no.upper()
        return None

    material_name = as_str(raw.get("material_name"))
    batch_no = as_lot_no(raw.get("batch_no", raw.get("lot_no")))
    raw_bundles = raw.get("bundles")
    rows = raw_bundles if isinstance(raw_bundles, list) else [raw]

    bundles = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        bundles.append(
            {
                "material_name": as_str(row.get("material_name")) or material_name,
                "batch_no": as_lot_no(row.get("batch_no", row.get("lot_no"))) or batch_no,
                "bundle_no": as_str(row.get("bundle_no")),
                "ingot_count": as_int(row.get("ingot_count")),
                "gross_weight": as_float(row.get("gross_weight")),
                "net_weight": as_float(row.get("net_weight")),
            }
        )

    return {
        "container_no": as_str(raw.get("container_no")),
        "bundles": bundles or [
            {
                "material_name": material_name,
                "batch_no": batch_no,
                "bundle_no": None,
                "ingot_count": None,
                "gross_weight": None,
                "net_weight": None,
            }
        ],
    }


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
    query = select(StickerBatch).options(*_BATCH_LOAD)

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


@router.get("/{batch_id}/stickers")
async def download_stickers(
    batch_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    batch = await _get_batch_or_404(db, batch_id)
    bundles = list(
        (
            await db.scalars(
                select(Bundle)
                .where(Bundle.sticker_batch_id == batch_id)
                .options(*_BUNDLE_LOAD)
                .order_by(Bundle.created_at.asc())
            )
        ).all()
    )
    required_fields = (
        "material_id",
        "batch_no",
        "bundle_no",
        "ingot_count",
        "gross_weight",
        "net_weight",
    )
    if not bundles or any(
        any(getattr(bundle, field) is None for field in required_fields) for bundle in bundles
    ):
        raise HTTPException(status_code=422, detail="Complete every bundle before generating stickers")

    try:
        contents = await generate_stickers(batch, bundles)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        logger.exception("Failed to load sticker template for batch %s", batch_id)
        raise HTTPException(status_code=502, detail="Sticker template could not be loaded") from exc

    filename = f"stickers-{batch.shipper.slug}-{batch.id}.xlsx"
    return StreamingResponse(
        iter([contents]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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


@router.post("/{batch_id}/bundles", response_model=list[BundleOut], status_code=201)
async def create_bundle(
    batch_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> BundleOut:
    batch = await _get_batch_or_404(db, batch_id)

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        image_bytes, media_type = prepare_bundle_image(raw_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        ocr_result = _normalize_ocr_result(await extract_bundle_data(image_bytes, media_type))
    except Exception as exc:
        logger.warning("OCR failed for batch %s file %s: %s", batch_id, file.filename, exc)
        ocr_result = _normalize_ocr_result({})

    detected_container_no = ocr_result["container_no"]
    if detected_container_no and batch.container_no is None:
        batch.container_no = detected_container_no
    elif detected_container_no and batch.container_no != detected_container_no:
        logger.warning(
            "Ignoring conflicting container number %s for batch %s; keeping %s",
            detected_container_no,
            batch_id,
            batch.container_no,
        )

    source_id = uuid.uuid4()
    try:
        image_path = await upload_bundle_image(
            str(batch_id),
            str(source_id),
            image_bytes,
            media_type,
        )
    except httpx.HTTPStatusError as exc:
        logger.exception("Storage upload failed for batch %s", batch_id)
        detail = "Failed to store bundle image"
        if exc.response is not None:
            detail = f"{detail}: {exc.response.text[:200]}"
        raise HTTPException(status_code=502, detail=detail) from exc
    bundles = []
    for row in ocr_result["bundles"]:
        bundle = Bundle(
            id=uuid.uuid4(),
            sticker_batch_id=batch_id,
            material_id=await _resolve_material_id(db, batch, row.get("material_name")),
            batch_no=row.get("batch_no"),
            bundle_no=row.get("bundle_no"),
            ingot_count=row.get("ingot_count"),
            gross_weight=row.get("gross_weight"),
            net_weight=row.get("net_weight"),
            image_path=image_path,
        )
        db.add(bundle)
        bundles.append(bundle)

    await db.commit()
    return [
        await _bundle_to_out(await _get_bundle_or_404(db, batch_id, bundle.id))
        for bundle in bundles
    ]


@router.get("/{batch_id}/bundles", response_model=list[BundleOut])
async def list_bundles(
    batch_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[BundleOut]:
    await _get_batch_or_404(db, batch_id)
    bundles = await db.scalars(
        select(Bundle)
        .where(Bundle.sticker_batch_id == batch_id)
        .options(*_BUNDLE_LOAD)
        .order_by(Bundle.created_at.asc())
    )
    return [await _bundle_to_out(bundle) for bundle in bundles.all()]


@router.patch("/{batch_id}/bundles/{bundle_id}", response_model=BundleOut)
async def update_bundle(
    batch_id: uuid.UUID,
    bundle_id: uuid.UUID,
    body: BundleUpdate,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BundleOut:
    bundle = await _get_bundle_or_404(db, batch_id, bundle_id)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(bundle, field, value)

    await db.commit()
    return await _bundle_to_out(await _get_bundle_or_404(db, batch_id, bundle_id))


@router.delete("/{batch_id}/bundles/{bundle_id}", status_code=204)
async def delete_bundle(
    batch_id: uuid.UUID,
    bundle_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    bundle = await _get_bundle_or_404(db, batch_id, bundle_id)

    has_another_bundle = bundle.image_path and await db.scalar(
        select(Bundle.id).where(Bundle.image_path == bundle.image_path, Bundle.id != bundle.id)
    )
    if bundle.image_path and not has_another_bundle:
        await delete_bundle_image(bundle.image_path)

    await db.execute(delete(Bundle).where(Bundle.id == bundle_id))
    await db.commit()
