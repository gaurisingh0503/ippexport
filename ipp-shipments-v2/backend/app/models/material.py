import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hs_code: Mapped[str] = mapped_column(String(20), nullable=False)
    sticker_display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    goods_description: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
