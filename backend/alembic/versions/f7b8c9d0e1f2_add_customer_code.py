"""add customer_code

Revision ID: f7b8c9d0e1f2
Revises: e5f6a7b8c9d0
"""

from typing import Sequence, Union

from alembic import op

revision: str = "f7b8c9d0e1f2"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(2)")


def downgrade() -> None:
    op.drop_column("customers", "customer_code")
