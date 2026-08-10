import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.entity import CustomerResponse, ShipperResponse


class ShipmentCreate(BaseModel):
    type: str
    shipper_id: uuid.UUID
    consignee_id: uuid.UUID | None = None
    notify1_id: uuid.UUID | None = None
    notify2_id: uuid.UUID | None = None
    port_of_discharge: str | None = None
    payment_terms: str | None = None


class ShipmentUpdate(BaseModel):
    type: str | None = None
    shipper_id: uuid.UUID | None = None
    consignee_id: uuid.UUID | None = None
    notify1_id: uuid.UUID | None = None
    notify2_id: uuid.UUID | None = None
    port_of_discharge: str | None = None
    payment_terms: str | None = None
    status: str | None = None


class ShipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    shipper_id: uuid.UUID
    consignee_id: uuid.UUID | None
    notify1_id: uuid.UUID | None
    notify2_id: uuid.UUID | None
    port_of_discharge: str | None
    payment_terms: str | None
    status: str
    created_at: datetime
    shipper: ShipperResponse
    consignee: CustomerResponse | None
    notify1: CustomerResponse | None
    notify2: CustomerResponse | None
