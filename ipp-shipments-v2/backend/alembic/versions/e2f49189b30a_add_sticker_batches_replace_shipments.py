"""add sticker_batches replace shipments

Revision ID: e2f49189b30a
Revises: dddffebf34bc
Create Date: 2026-08-10 17:59:56.221066

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "e2f49189b30a"
down_revision: Union[str, None] = "dddffebf34bc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sticker_batches",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("shipper_id", sa.UUID(), nullable=False),
        sa.Column("material_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("sticker_file_url", sa.String(length=512), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="draft", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"]),
        sa.ForeignKeyConstraint(["shipper_id"], ["shippers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.execute("DELETE FROM bundles")

    op.drop_constraint("bundles_shipment_id_fkey", "bundles", type_="foreignkey")
    op.drop_column("bundles", "shipment_id")
    op.add_column("bundles", sa.Column("sticker_batch_id", sa.UUID(), nullable=False))
    op.create_foreign_key(
        "bundles_sticker_batch_id_fkey", "bundles", "sticker_batches", ["sticker_batch_id"], ["id"]
    )

    op.drop_table("shipments")


def downgrade() -> None:
    op.create_table(
        "shipments",
        sa.Column("id", sa.UUID(), autoincrement=False, nullable=False),
        sa.Column("type", sa.VARCHAR(length=20), autoincrement=False, nullable=False),
        sa.Column("shipper_id", sa.UUID(), autoincrement=False, nullable=False),
        sa.Column("consignee_id", sa.UUID(), autoincrement=False, nullable=True),
        sa.Column("notify1_id", sa.UUID(), autoincrement=False, nullable=True),
        sa.Column("notify2_id", sa.UUID(), autoincrement=False, nullable=True),
        sa.Column("port_of_discharge", sa.VARCHAR(length=255), autoincrement=False, nullable=True),
        sa.Column("payment_terms", sa.VARCHAR(length=255), autoincrement=False, nullable=True),
        sa.Column("status", sa.VARCHAR(length=20), server_default=sa.text("'draft'::character varying"), autoincrement=False, nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), autoincrement=False, nullable=False),
        sa.Column("unit_price_usd", sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
        sa.ForeignKeyConstraint(["consignee_id"], ["customers.id"], name="shipments_consignee_id_fkey"),
        sa.ForeignKeyConstraint(["notify1_id"], ["customers.id"], name="shipments_notify1_id_fkey"),
        sa.ForeignKeyConstraint(["notify2_id"], ["customers.id"], name="shipments_notify2_id_fkey"),
        sa.ForeignKeyConstraint(["shipper_id"], ["shippers.id"], name="shipments_shipper_id_fkey"),
        sa.PrimaryKeyConstraint("id", name="shipments_pkey"),
    )

    op.execute("DELETE FROM bundles")

    op.drop_constraint("bundles_sticker_batch_id_fkey", "bundles", type_="foreignkey")
    op.drop_column("bundles", "sticker_batch_id")
    op.add_column("bundles", sa.Column("shipment_id", sa.UUID(), autoincrement=False, nullable=False))
    op.create_foreign_key("bundles_shipment_id_fkey", "bundles", "shipments", ["shipment_id"], ["id"])

    op.drop_table("sticker_batches")
