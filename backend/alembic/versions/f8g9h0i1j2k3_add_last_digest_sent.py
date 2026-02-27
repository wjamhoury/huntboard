"""add_last_digest_sent

Revision ID: f8g9h0i1j2k3
Revises: e7f8g9h0i1j2
Create Date: 2026-02-26 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8g9h0i1j2k3'
down_revision: Union[str, Sequence[str], None] = 'e7f8g9h0i1j2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add last_digest_sent column to users table for tracking email digest history."""
    op.add_column('users', sa.Column('last_digest_sent', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove last_digest_sent column."""
    op.drop_column('users', 'last_digest_sent')
