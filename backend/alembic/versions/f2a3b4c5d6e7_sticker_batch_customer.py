"""customer on sticker batches; each customer sets its sticker format; adds GS Yuasa

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "customers",
        sa.Column("sticker_format", sa.String(length=30), nullable=False, server_default="standard"),
    )
    op.add_column("sticker_batches", sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "sticker_batches_customer_id_fkey", "sticker_batches", "customers", ["customer_id"], ["id"]
    )
    op.execute(
        "INSERT INTO customers (id, name, status, sticker_format) "
        "VALUES (gen_random_uuid(), 'GS Yuasa', 'approved', 'gs_yuasa') "
        "ON CONFLICT (name) DO UPDATE SET sticker_format = 'gs_yuasa'"
    )


def downgrade() -> None:
    op.drop_constraint("sticker_batches_customer_id_fkey", "sticker_batches", type_="foreignkey")
    op.drop_column("sticker_batches", "customer_id")
    op.drop_column("customers", "sticker_format")
