import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    shipper_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("shippers.id"), nullable=False)
    consignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    notify1_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    notify2_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    port_of_discharge: Mapped[str | None] = mapped_column(String(255))
    payment_terms: Mapped[str | None] = mapped_column(String(255))
    unit_price_usd: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    shipper: Mapped["Shipper"] = relationship(foreign_keys=[shipper_id])
    consignee: Mapped["Customer | None"] = relationship(foreign_keys=[consignee_id])
    notify1: Mapped["Customer | None"] = relationship(foreign_keys=[notify1_id])
    notify2: Mapped["Customer | None"] = relationship(foreign_keys=[notify2_id])
    bundles: Mapped[list["Bundle"]] = relationship(back_populates="shipment")
