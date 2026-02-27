"""initial_multi_tenant_schema

Revision ID: 4fb69ff8e141
Revises:
Create Date: 2026-02-10 10:27:40.427326

This migration establishes the initial multi-tenant schema with User model
and user_id foreign keys on all existing tables.

Note: This is a baseline migration. The schema was created by SQLAlchemy's
create_all() on application startup. This file documents the complete schema
for reference and ensures alembic tracking is in place for future migrations.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4fb69ff8e141'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.

    Creates the multi-tenant schema with:
    - users table (tenant identity)
    - jobs, resumes, rss_feeds, company_feeds, batch_runs tables
    - All child tables have user_id FK for tenant isolation
    """
    # Create users table first (parent for all other tables)
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('linkedin_id', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_linkedin_id', 'users', ['linkedin_id'], unique=True)

    # Create resumes table
    op.create_table(
        'resumes',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('content_type', sa.String(100), default='application/pdf'),
        sa.Column('extracted_text', sa.Text(), default=''),
        sa.Column('is_primary', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_resumes_id', 'resumes', ['id'])
    op.create_index('ix_resumes_user_id', 'resumes', ['user_id'])

    # Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('company', sa.String(255), nullable=False),
        sa.Column('location', sa.String(255), default=''),
        sa.Column('resume_id', sa.Integer(), sa.ForeignKey('resumes.id', ondelete='SET NULL'), nullable=True),
        sa.Column('remote_type', sa.String(50), default='unknown'),
        sa.Column('url', sa.Text(), default=''),
        sa.Column('source', sa.String(100), default='manual'),
        sa.Column('description', sa.Text(), default=''),
        sa.Column('salary_min', sa.Integer(), nullable=True),
        sa.Column('salary_max', sa.Integer(), nullable=True),
        sa.Column('salary_notes', sa.String(255), default=''),
        sa.Column('seniority_level', sa.String(100), default=''),
        sa.Column('employment_type', sa.String(100), default=''),
        sa.Column('status', sa.String(50), default='new'),
        sa.Column('applied', sa.Boolean(), default=False),
        sa.Column('applied_date', sa.Date(), nullable=True),
        sa.Column('response_date', sa.Date(), nullable=True),
        sa.Column('follow_up_date', sa.Date(), nullable=True),
        sa.Column('priority', sa.Integer(), default=3),
        sa.Column('why_this_company', sa.Text(), default=''),
        sa.Column('company_notes', sa.Text(), default=''),
        sa.Column('general_notes', sa.Text(), default=''),
        sa.Column('rejection_reason', sa.String(100), default=''),
        sa.Column('match_score', sa.Integer(), nullable=True),
        sa.Column('why_good_fit', sa.Text(), default=''),
        sa.Column('missing_gaps', sa.Text(), default=''),
        sa.Column('score_detail', sa.Text(), default=''),
        sa.Column('scored_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_jobs_id', 'jobs', ['id'])
    op.create_index('ix_jobs_user_id', 'jobs', ['user_id'])

    # Create rss_feeds table
    op.create_table(
        'rss_feeds',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('last_fetched', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_rss_feeds_id', 'rss_feeds', ['id'])
    op.create_index('ix_rss_feeds_user_id', 'rss_feeds', ['user_id'])

    # Create company_feeds table
    op.create_table(
        'company_feeds',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('feed_type', sa.String(50), default='greenhouse'),
        sa.Column('greenhouse_board_token', sa.String(255), nullable=True),
        sa.Column('workday_url', sa.Text(), nullable=True),
        sa.Column('lever_slug', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('last_fetched', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_company_feeds_id', 'company_feeds', ['id'])
    op.create_index('ix_company_feeds_user_id', 'company_feeds', ['user_id'])

    # Create batch_runs table
    op.create_table(
        'batch_runs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('run_type', sa.String(50), default='nightly_sync'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(20), default='running'),
        sa.Column('jobs_imported', sa.Integer(), default=0),
        sa.Column('jobs_scored', sa.Integer(), default=0),
        sa.Column('tokens_used', sa.Integer(), default=0),
        sa.Column('errors', sa.Text(), default='[]'),
    )
    op.create_index('ix_batch_runs_id', 'batch_runs', ['id'])
    op.create_index('ix_batch_runs_user_id', 'batch_runs', ['user_id'])


def downgrade() -> None:
    """Downgrade schema - drop all tables."""
    op.drop_table('batch_runs')
    op.drop_table('company_feeds')
    op.drop_table('rss_feeds')
    op.drop_table('jobs')
    op.drop_table('resumes')
    op.drop_table('users')
