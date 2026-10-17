import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    consignee_l1: Mapped[str | None] = mapped_column(String(255))
    consignee_l2: Mapped[str | None] = mapped_column(String(255))
    consignee_l3: Mapped[str | None] = mapped_column(String(255))
    consignee_l4: Mapped[str | None] = mapped_column(String(255))
    consignee_l5: Mapped[str | None] = mapped_column(String(255))
    notify1_l1: Mapped[str | None] = mapped_column(String(255))
    notify1_l2: Mapped[str | None] = mapped_column(String(255))
    notify1_l3: Mapped[str | None] = mapped_column(String(255))
    notify1_l4: Mapped[str | None] = mapped_column(String(255))
    notify1_l5: Mapped[str | None] = mapped_column(String(255))
    notify2_l1: Mapped[str | None] = mapped_column(String(255))
    notify2_l2: Mapped[str | None] = mapped_column(String(255))
    notify2_l3: Mapped[str | None] = mapped_column(String(255))
    notify2_l4: Mapped[str | None] = mapped_column(String(255))
    notify3_l1: Mapped[str | None] = mapped_column(String(255))
    notify3_l2: Mapped[str | None] = mapped_column(String(255))
    notify3_l3: Mapped[str | None] = mapped_column(String(255))
    notify4_l1: Mapped[str | None] = mapped_column(String(255))
    notify4_l2: Mapped[str | None] = mapped_column(String(255))
    notify4_l3: Mapped[str | None] = mapped_column(String(255))
    notify5_l1: Mapped[str | None] = mapped_column(String(255))
    notify5_l2: Mapped[str | None] = mapped_column(String(255))
    notify5_l3: Mapped[str | None] = mapped_column(String(255))
    port_of_discharge: Mapped[str | None] = mapped_column(String(255))
    payment_terms: Mapped[str | None] = mapped_column(String(255))
    material_name: Mapped[str | None] = mapped_column(String(255))
    customer_code: Mapped[str | None] = mapped_column(String(20))
    coa_specifications: Mapped[dict[str, str] | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="approved")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
