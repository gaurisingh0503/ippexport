import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user
from app.db import get_db
from app.models.bundle import Bundle
from app.models.customer import Customer  # noqa: F401 — register model for relationship resolution
from app.models.shipper import Shipper  # noqa: F401
from app.models.shipment import Shipment
from app.schemas.bundle import BundleOut, BundleUpdate
from app.schemas.shipment import ShipmentCreate, ShipmentOut, ShipmentUpdate
from app.services.image_type import detect_image_media_type
from app.services.ocr import extract_bundle_data
from app.services.storage import delete_bundle_image, signed_image_url, upload_bundle_image

router = APIRouter(prefix="/shipments", tags=["shipments"])

_LOAD_OPTIONS = (
    selectinload(Shipment.shipper),
    selectinload(Shipment.consignee),
    selectinload(Shipment.notify1),
    selectinload(Shipment.notify2),
)

_ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png"}


async def _get_shipment_or_404(db: AsyncSession, shipment_id: uuid.UUID) -> Shipment:
    shipment = await db.scalar(
        select(Shipment).where(Shipment.id == shipment_id).options(*_LOAD_OPTIONS)
    )
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


async def _get_bundle_or_404(
    db: AsyncSession, shipment_id: uuid.UUID, bundle_id: uuid.UUID
) -> Bundle:
    bundle = await db.scalar(
        select(Bundle).where(Bundle.id == bundle_id, Bundle.shipment_id == shipment_id)
    )
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return bundle


async def _bundle_to_out(bundle: Bundle) -> BundleOut:
    out = BundleOut.model_validate(bundle)
    out.image_url = await signed_image_url(bundle.image_path)
    return out


@router.post("", response_model=ShipmentOut, status_code=201)
async def create_shipment(
    body: ShipmentCreate,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Shipment:
    shipment = Shipment(**body.model_dump())
    db.add(shipment)
    await db.commit()
    return await _get_shipment_or_404(db, shipment.id)


@router.get("", response_model=list[ShipmentOut])
async def list_shipments(
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Shipment]:
    result = await db.scalars(
        select(Shipment).options(*_LOAD_OPTIONS).order_by(Shipment.created_at.desc())
    )
    return list(result.all())


@router.get("/{shipment_id}", response_model=ShipmentOut)
async def get_shipment(
    shipment_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Shipment:
    return await _get_shipment_or_404(db, shipment_id)


@router.patch("/{shipment_id}", response_model=ShipmentOut)
async def update_shipment(
    shipment_id: uuid.UUID,
    body: ShipmentUpdate,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Shipment:
    shipment = await _get_shipment_or_404(db, shipment_id)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(shipment, field, value)

    await db.commit()
    return await _get_shipment_or_404(db, shipment_id)


@router.post("/{shipment_id}/bundles", response_model=BundleOut, status_code=201)
async def create_bundle(
    shipment_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> BundleOut:
    await _get_shipment_or_404(db, shipment_id)

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    media_type = detect_image_media_type(image_bytes)
    if media_type is None:
        if file.content_type in _ALLOWED_MEDIA_TYPES:
            media_type = file.content_type
        else:
            raise HTTPException(status_code=400, detail="Only JPG and PNG images are supported")

    bundle_id = uuid.uuid4()
    extracted = await extract_bundle_data(image_bytes, media_type)
    image_path = await upload_bundle_image(
        str(shipment_id),
        str(bundle_id),
        image_bytes,
        media_type,
    )

    bundle = Bundle(
        id=bundle_id,
        shipment_id=shipment_id,
        image_path=image_path,
        **extracted,
    )
    db.add(bundle)
    await db.commit()
    await db.refresh(bundle)
    return await _bundle_to_out(bundle)


@router.get("/{shipment_id}/bundles", response_model=list[BundleOut])
async def list_bundles(
    shipment_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[BundleOut]:
    await _get_shipment_or_404(db, shipment_id)
    bundles = await db.scalars(
        select(Bundle)
        .where(Bundle.shipment_id == shipment_id)
        .order_by(Bundle.created_at.asc())
    )
    return [await _bundle_to_out(bundle) for bundle in bundles.all()]


@router.patch("/{shipment_id}/bundles/{bundle_id}", response_model=BundleOut)
async def update_bundle(
    shipment_id: uuid.UUID,
    bundle_id: uuid.UUID,
    body: BundleUpdate,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BundleOut:
    bundle = await _get_bundle_or_404(db, shipment_id, bundle_id)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(bundle, field, value)

    await db.commit()
    await db.refresh(bundle)
    return await _bundle_to_out(bundle)


@router.delete("/{shipment_id}/bundles/{bundle_id}", status_code=204)
async def delete_bundle(
    shipment_id: uuid.UUID,
    bundle_id: uuid.UUID,
    _user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    bundle = await _get_bundle_or_404(db, shipment_id, bundle_id)

    if bundle.image_path:
        await delete_bundle_image(bundle.image_path)

    await db.execute(delete(Bundle).where(Bundle.id == bundle_id))
    await db.commit()
