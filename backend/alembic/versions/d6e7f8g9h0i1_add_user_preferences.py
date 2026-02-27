"""add_user_preferences

Revision ID: d6e7f8g9h0i1
Revises: c5d6e7f8g9h0
Create Date: 2026-02-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6e7f8g9h0i1'
down_revision: Union[str, Sequence[str], None] = 'c5d6e7f8g9h0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add preferences JSON column to users table."""
    op.add_column('users', sa.Column('preferences', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Remove preferences column."""
    op.drop_column('users', 'preferences')
