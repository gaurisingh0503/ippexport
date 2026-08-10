import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class StickerBatch(Base):
    __tablename__ = "sticker_batches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipper_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("shippers.id"), nullable=False)
    material_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    sticker_file_url: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    shipper: Mapped["Shipper"] = relationship()
    material: Mapped["Material"] = relationship()
    bundles: Mapped[list["Bundle"]] = relationship(back_populates="sticker_batch")
