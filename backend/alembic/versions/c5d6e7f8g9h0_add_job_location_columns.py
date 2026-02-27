"""Add job location normalization columns

Revision ID: c5d6e7f8g9h0
Revises: 1f88923e9ad0
Create Date: 2026-02-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5d6e7f8g9h0'
down_revision = '1f88923e9ad0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new location columns
    op.add_column('jobs', sa.Column('location_city', sa.String(100), nullable=True))
    op.add_column('jobs', sa.Column('location_state', sa.String(50), nullable=True))
    op.add_column('jobs', sa.Column('location_country', sa.String(50), nullable=True))
    op.add_column('jobs', sa.Column('is_remote', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('jobs', sa.Column('is_hybrid', sa.Boolean(), nullable=True, server_default='false'))

    # Create indexes for efficient filtering
    op.create_index('ix_jobs_location_city', 'jobs', ['location_city'], unique=False)
    op.create_index('ix_jobs_location_state', 'jobs', ['location_state'], unique=False)
    op.create_index('ix_jobs_is_remote', 'jobs', ['is_remote'], unique=False)


def downgrade() -> None:
    # Remove indexes
    op.drop_index('ix_jobs_is_remote', table_name='jobs')
    op.drop_index('ix_jobs_location_state', table_name='jobs')
    op.drop_index('ix_jobs_location_city', table_name='jobs')

    # Remove columns
    op.drop_column('jobs', 'is_hybrid')
    op.drop_column('jobs', 'is_remote')
    op.drop_column('jobs', 'location_country')
    op.drop_column('jobs', 'location_state')
    op.drop_column('jobs', 'location_city')
