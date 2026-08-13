import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class ExportDocument(Base):
    __tablename__ = "export_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shippers.id"), nullable=False
    )
    invoice_no: Mapped[str] = mapped_column(String(255), nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    contract_no: Mapped[str | None] = mapped_column(String(255))
    bill_of_lading_no: Mapped[str | None] = mapped_column(String(255))
    port_of_discharge: Mapped[str | None] = mapped_column(String(255))
    term_of_delivery: Mapped[str | None] = mapped_column(String(255))
    payment_terms: Mapped[str | None] = mapped_column(String(255))
    unit_price_usd_t: Mapped[float] = mapped_column(Float, nullable=False)
    shipping_mark: Mapped[str | None] = mapped_column(String(255))
    production_date: Mapped[date | None] = mapped_column(Date)
    consignee: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    notify1: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    notify2: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    coa_actuals: Mapped[dict[str, dict[str, float | None]] | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default="draft")
    customer_material_name: Mapped[str | None] = mapped_column(String(255))
    rejection_comment: Mapped[str | None] = mapped_column(String(2000))
    coa_specifications: Mapped[dict[str, str] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    shipper: Mapped["Shipper"] = relationship()
    batches: Mapped[list["ExportDocumentBatch"]] = relationship(
        back_populates="export_document", cascade="all, delete-orphan"
    )


class ExportDocumentBatch(Base):
    __tablename__ = "export_document_batches"
    __table_args__ = (UniqueConstraint("export_document_id", "sticker_batch_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    export_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("export_documents.id", ondelete="CASCADE"), nullable=False
    )
    sticker_batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sticker_batches.id"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    export_document: Mapped["ExportDocument"] = relationship(back_populates="batches")
    sticker_batch: Mapped["StickerBatch"] = relationship()
