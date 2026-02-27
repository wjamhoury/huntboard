"""add_job_notes_and_activities

Revision ID: e7f8g9h0i1j2
Revises: d6e7f8g9h0i1
Create Date: 2026-02-26 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7f8g9h0i1j2'
down_revision: Union[str, Sequence[str], None] = 'd6e7f8g9h0i1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add notes column to jobs table and create job_activities table."""
    # Add notes column to jobs table (if not exists)
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'jobs' AND column_name = 'notes'"
    ))
    if result.fetchone() is None:
        op.add_column('jobs', sa.Column('notes', sa.Text(), nullable=True))

    # Create job_activities table (if not exists)
    result = conn.execute(sa.text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_name = 'job_activities'"
    ))
    if result.fetchone() is None:
        op.create_table(
            'job_activities',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('job_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.String(36), nullable=False),
            sa.Column('action', sa.String(50), nullable=False),
            sa.Column('detail', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_job_activities_id', 'job_activities', ['id'], unique=False)
        op.create_index('ix_job_activities_job_id', 'job_activities', ['job_id'], unique=False)
        op.create_index('ix_job_activities_user_id', 'job_activities', ['user_id'], unique=False)


def downgrade() -> None:
    """Remove job_activities table and notes column."""
    op.drop_index('ix_job_activities_user_id', table_name='job_activities')
    op.drop_index('ix_job_activities_job_id', table_name='job_activities')
    op.drop_index('ix_job_activities_id', table_name='job_activities')
    op.drop_table('job_activities')
    op.drop_column('jobs', 'notes')
