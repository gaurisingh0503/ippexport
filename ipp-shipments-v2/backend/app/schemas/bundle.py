import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BundleUpdate(BaseModel):
    material_name: str | None = None
    batch_no: str | None = None
    bundle_no: str | None = None
    ingot_count: int | None = None
    gross_weight: float | None = None
    net_weight: float | None = None


class BundleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    shipment_id: uuid.UUID
    material_name: str | None
    batch_no: str | None
    bundle_no: str | None
    ingot_count: int | None
    gross_weight: float | None
    net_weight: float | None
    image_path: str | None
    image_url: str | None = None
    created_at: datetime
