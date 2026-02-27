"""add_job_source_index

Revision ID: b3c4d5e6f7g8
Revises: a2b3c4d5e6f7
Create Date: 2026-02-17 10:00:00.000000

Add index to jobs.source column and set existing jobs' source to 'imported'
for legacy data (since we can't know how old jobs were created).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7g8'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add index on source column and update existing jobs to 'imported'.

    This migration:
    1. Updates all existing jobs with source='manual' to source='imported'
       (since we can't know how legacy jobs were actually created)
    2. Creates an index on the source column for efficient filtering
    """
    # Update existing jobs that have default 'manual' source to 'imported'
    # This marks them as legacy data imported before source tracking
    op.execute(
        "UPDATE jobs SET source = 'imported' WHERE source = 'manual' OR source IS NULL"
    )

    # Create index on source column
    op.create_index('ix_jobs_source', 'jobs', ['source'])


def downgrade() -> None:
    """Remove index and revert source values."""
    # Drop the index
    op.drop_index('ix_jobs_source', 'jobs')

    # Note: We can't reliably restore original values, so we leave them as-is
    # Jobs marked 'imported' will stay that way after downgrade
