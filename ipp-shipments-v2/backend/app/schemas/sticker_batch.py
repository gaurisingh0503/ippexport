import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StickerBatchCreate(BaseModel):
    type: str
    shipper_id: uuid.UUID
    material_id: uuid.UUID


class StickerBatchUpdate(BaseModel):
    type: str | None = None
    shipper_id: uuid.UUID | None = None
    material_id: uuid.UUID | None = None
    container_no: str | None = None
    sticker_file_url: str | None = None
    status: str | None = None


class ShipperNested(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    brand_color: str


class MaterialNested(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    material_name: str
    hs_code: str
    sticker_display_name: str
    goods_description: str | None


class StickerBatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    shipper_id: uuid.UUID
    material_id: uuid.UUID
    type: str
    container_no: str | None
    sticker_file_url: str | None
    status: str
    created_at: datetime
    shipper: ShipperNested
    material: MaterialNested
