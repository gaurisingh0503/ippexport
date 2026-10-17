import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.sticker_batch import ShipperNested


class PartySnapshot(BaseModel):
    name: str
    lines: list[str] = Field(default_factory=list)


class ExportDocumentCreate(BaseModel):
    shipper_id: uuid.UUID | None = None
    batch_ids: list[uuid.UUID] = Field(default_factory=list)
    packing_list_net_weight: float | None = Field(default=None, gt=0)
    consignee: PartySnapshot
    notify1: PartySnapshot | None = None
    notify2: PartySnapshot | None = None
    invoice_no: str | None = Field(default=None, max_length=255)
    invoice_date: date
    contract_no: str | None = None
    bill_of_lading_no: str | None = None
    port_of_discharge: str | None = None
    term_of_delivery: str | None = None
    payment_terms: str | None = None
    unit_price_usd_t: float = Field(ge=0)
    shipping_mark: str | None = None
    production_date: date | None = None
    customer_material_name: str | None = Field(default=None, max_length=255)
    coa_specifications: dict[str, str] | None = None


class ExportDocumentBatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sticker_batch_id: uuid.UUID
    position: int


class ExportDocumentReject(BaseModel):
    comment: str = Field(min_length=1, max_length=2000)


class ExportDocumentAttachBatch(BaseModel):
    batch_id: uuid.UUID


class ExportDocumentPackingList(BaseModel):
    packing_list_net_weight: float = Field(gt=0)


class ExportDocumentSpecifications(BaseModel):
    coa_specifications: dict[str, str]


class ExportDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    shipper_id: uuid.UUID
    invoice_no: str
    invoice_date: date
    contract_no: str | None
    bill_of_lading_no: str | None
    port_of_discharge: str | None
    term_of_delivery: str | None
    payment_terms: str | None
    unit_price_usd_t: float
    shipping_mark: str | None
    production_date: date | None
    consignee: PartySnapshot
    notify1: PartySnapshot | None
    notify2: PartySnapshot | None
    coa_actuals: dict[str, dict[str, float | None]] | None
    status: str
    customer_material_name: str | None
    rejection_comment: str | None
    coa_specifications: dict[str, str] | None
    packing_list_net_weight: float | None
    stickers_net_weight: float
    net_weight_matches: bool
    net_weight_cleared: bool
    net_weight_override_by: str | None
    net_weight_override_at: datetime | None
    created_at: datetime
    shipper: ShipperNested
    batches: list[ExportDocumentBatchOut]
