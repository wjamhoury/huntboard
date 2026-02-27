"""resume_s3_storage

Revision ID: a2b3c4d5e6f7
Revises: 4fb69ff8e141
Create Date: 2026-02-10 14:00:00.000000

Migrate resume storage from local filesystem to S3:
- Rename 'filename' column to 's3_key'
- Add 'file_size_bytes' column
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = '4fb69ff8e141'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade: rename filename to s3_key, add file_size_bytes."""
    # Rename filename column to s3_key
    op.alter_column('resumes', 'filename', new_column_name='s3_key')

    # Add file_size_bytes column
    op.add_column('resumes', sa.Column('file_size_bytes', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade: revert column changes."""
    # Remove file_size_bytes column
    op.drop_column('resumes', 'file_size_bytes')

    # Rename s3_key back to filename
    op.alter_column('resumes', 's3_key', new_column_name='filename')
