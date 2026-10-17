"""packing list net weight check on export shipments; merges heads

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4, f7b8c9d0e1f2
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = ("c9d0e1f2a3b4", "f7b8c9d0e1f2")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("export_documents", sa.Column("packing_list_net_weight", sa.Float(), nullable=True))
    op.add_column("export_documents", sa.Column("net_weight_override_by", sa.String(length=255), nullable=True))
    op.add_column(
        "export_documents", sa.Column("net_weight_override_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("export_documents", "net_weight_override_at")
    op.drop_column("export_documents", "net_weight_override_by")
    op.drop_column("export_documents", "packing_list_net_weight")
