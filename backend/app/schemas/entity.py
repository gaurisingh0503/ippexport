import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ShipperResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    address_line1: str
    address_line2: str
    tax_id: str
    email: str
    brand_color: str
    created_at: datetime


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    consignee_l1: str | None
    consignee_l2: str | None
    consignee_l3: str | None
    consignee_l4: str | None
    consignee_l5: str | None
    notify1_l1: str | None
    notify1_l2: str | None
    notify1_l3: str | None
    notify1_l4: str | None
    notify1_l5: str | None
    notify2_l1: str | None
    notify2_l2: str | None
    notify2_l3: str | None
    notify2_l4: str | None
    notify3_l1: str | None
    notify3_l2: str | None
    notify3_l3: str | None
    notify4_l1: str | None
    notify4_l2: str | None
    notify4_l3: str | None
    notify5_l1: str | None
    notify5_l2: str | None
    notify5_l3: str | None
    port_of_discharge: str | None
    payment_terms: str | None
    material_name: str | None
    customer_code: str | None
    coa_specifications: dict[str, str] | None
    status: str
    created_at: datetime


class CustomerCreate(BaseModel):
    name: str
    consignee_l1: str | None = None
    consignee_l2: str | None = None
    consignee_l3: str | None = None
    consignee_l4: str | None = None
    consignee_l5: str | None = None
    notify1_l1: str | None = None
    notify1_l2: str | None = None
    notify1_l3: str | None = None
    notify1_l4: str | None = None
    notify1_l5: str | None = None
    notify2_l1: str | None = None
    notify2_l2: str | None = None
    notify2_l3: str | None = None
    notify2_l4: str | None = None
    notify3_l1: str | None = None
    notify3_l2: str | None = None
    notify3_l3: str | None = None
    notify4_l1: str | None = None
    notify4_l2: str | None = None
    notify4_l3: str | None = None
    notify5_l1: str | None = None
    notify5_l2: str | None = None
    notify5_l3: str | None = None
    port_of_discharge: str | None = None
    payment_terms: str | None = None
    material_name: str | None = None
    customer_code: str | None = Field(default=None, max_length=2)
    coa_specifications: dict[str, str] | None = None


class CustomerUpdate(BaseModel):
    name: str | None = None
    consignee_l1: str | None = None
    consignee_l2: str | None = None
    consignee_l3: str | None = None
    consignee_l4: str | None = None
    consignee_l5: str | None = None
    notify1_l1: str | None = None
    notify1_l2: str | None = None
    notify1_l3: str | None = None
    notify1_l4: str | None = None
    notify1_l5: str | None = None
    notify2_l1: str | None = None
    notify2_l2: str | None = None
    notify2_l3: str | None = None
    notify2_l4: str | None = None
    notify3_l1: str | None = None
    notify3_l2: str | None = None
    notify3_l3: str | None = None
    notify4_l1: str | None = None
    notify4_l2: str | None = None
    notify4_l3: str | None = None
    notify5_l1: str | None = None
    notify5_l2: str | None = None
    notify5_l3: str | None = None
    port_of_discharge: str | None = None
    payment_terms: str | None = None
    material_name: str | None = None
    customer_code: str | None = Field(default=None, max_length=2)
    coa_specifications: dict[str, str] | None = None


class MaterialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    material_name: str
    hs_code: str
    sticker_display_name: str
    goods_description: str | None
    created_at: datetime
