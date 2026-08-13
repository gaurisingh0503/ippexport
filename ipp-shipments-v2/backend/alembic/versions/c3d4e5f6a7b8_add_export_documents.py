"""add export document groups

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-12 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "export_documents",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("shipper_id", sa.UUID(), nullable=False),
        sa.Column("invoice_no", sa.String(length=255), nullable=False),
        sa.Column("invoice_date", sa.Date(), nullable=False),
        sa.Column("contract_no", sa.String(length=255), nullable=True),
        sa.Column("bill_of_lading_no", sa.String(length=255), nullable=True),
        sa.Column("port_of_discharge", sa.String(length=255), nullable=True),
        sa.Column("term_of_delivery", sa.String(length=255), nullable=True),
        sa.Column("payment_terms", sa.String(length=255), nullable=True),
        sa.Column("unit_price_usd_t", sa.Float(), nullable=False),
        sa.Column("shipping_mark", sa.String(length=255), nullable=True),
        sa.Column("production_date", sa.Date(), nullable=True),
        sa.Column("consignee", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("notify1", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("notify2", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["shipper_id"], ["shippers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "export_document_batches",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("export_document_id", sa.UUID(), nullable=False),
        sa.Column("sticker_batch_id", sa.UUID(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["export_document_id"], ["export_documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sticker_batch_id"], ["sticker_batches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("export_document_id", "sticker_batch_id"),
    )


def downgrade() -> None:
    op.drop_table("export_document_batches")
    op.drop_table("export_documents")
