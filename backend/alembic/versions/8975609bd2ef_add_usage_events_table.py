"""add_usage_events_table

Revision ID: 8975609bd2ef
Revises: f8g9h0i1j2k3
Create Date: 2026-02-27 08:46:12.338305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8975609bd2ef'
down_revision: Union[str, Sequence[str], None] = 'f8g9h0i1j2k3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create usage_events table for tracking app engagement."""
    op.create_table(
        'usage_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('event', sa.String(length=100), nullable=False),
        sa.Column('event_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_usage_events_id', 'usage_events', ['id'], unique=False)
    op.create_index('ix_usage_events_user_id', 'usage_events', ['user_id'], unique=False)
    op.create_index('ix_usage_events_event', 'usage_events', ['event'], unique=False)
    op.create_index('ix_usage_events_created_at', 'usage_events', ['created_at'], unique=False)


def downgrade() -> None:
    """Drop usage_events table."""
    op.drop_index('ix_usage_events_created_at', table_name='usage_events')
    op.drop_index('ix_usage_events_event', table_name='usage_events')
    op.drop_index('ix_usage_events_user_id', table_name='usage_events')
    op.drop_index('ix_usage_events_id', table_name='usage_events')
    op.drop_table('usage_events')
