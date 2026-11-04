"""sticker format per batch, so GS Yuasa stickers can print the packing item weight

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "d0e1f2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sticker_batches",
        sa.Column("sticker_format", sa.String(length=30), nullable=False, server_default="standard"),
    )


def downgrade() -> None:
    op.drop_column("sticker_batches", "sticker_format")
