import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Bundle(Base):
    __tablename__ = "bundles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sticker_batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sticker_batches.id"), nullable=False
    )
    material_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("materials.id"), nullable=True
    )
    batch_no: Mapped[str | None] = mapped_column(String(255))
    bundle_no: Mapped[str | None] = mapped_column(String(255))
    ingot_count: Mapped[int | None] = mapped_column(Integer)
    gross_weight: Mapped[float | None] = mapped_column(Float)
    net_weight: Mapped[float | None] = mapped_column(Float)
    image_path: Mapped[str | None] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sticker_batch: Mapped["StickerBatch"] = relationship(back_populates="bundles")
    material: Mapped["Material | None"] = relationship()
