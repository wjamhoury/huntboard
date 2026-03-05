"""add_target_job_titles

Revision ID: g9h0i1j2k3l4
Revises: 8975609bd2ef
Create Date: 2026-03-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g9h0i1j2k3l4'
down_revision: Union[str, Sequence[str], None] = '8975609bd2ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add target_job_titles column to users table for AI scoring without resumes."""
    op.add_column('users', sa.Column('target_job_titles', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Remove target_job_titles column."""
    op.drop_column('users', 'target_job_titles')
