import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ShipmentCreate(BaseModel):
    type: str
    shipper_id: uuid.UUID
    consignee_id: uuid.UUID | None = None
    notify1_id: uuid.UUID | None = None
    notify2_id: uuid.UUID | None = None
    port_of_discharge: str | None = None
    payment_terms: str | None = None
    unit_price_usd: float | None = None


class ShipmentUpdate(BaseModel):
    type: str | None = None
    shipper_id: uuid.UUID | None = None
    consignee_id: uuid.UUID | None = None
    notify1_id: uuid.UUID | None = None
    notify2_id: uuid.UUID | None = None
    port_of_discharge: str | None = None
    payment_terms: str | None = None
    unit_price_usd: float | None = None
    status: str | None = None


class ShipmentShipperOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    brand_color: str


class ShipmentCustomerRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


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
    unit_price_usd: float | None
    status: str
    created_at: datetime
    shipper: ShipmentShipperOut
    consignee: ShipmentCustomerRef | None
    notify1: ShipmentCustomerRef | None
    notify2: ShipmentCustomerRef | None
