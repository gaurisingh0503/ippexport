"""rename bundle batch_no to lot_no, add container_no to sticker_batches

Revision ID: a1b2c3d4e5f6
Revises: 8e4cd0d7cbdb
Create Date: 2026-08-11 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "8e4cd0d7cbdb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("bundles", "batch_no", new_column_name="lot_no")
    op.add_column("sticker_batches", sa.Column("container_no", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("sticker_batches", "container_no")
    op.alter_column("bundles", "lot_no", new_column_name="batch_no")
