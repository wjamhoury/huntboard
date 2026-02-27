"""
Admin endpoints for William to monitor app usage.
Simple stats endpoint - not a full admin panel.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Tuple
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.dependencies import get_user_db
from app.models.user import User
from app.models.job import Job
from app.models.usage_event import UsageEvent
from app.models.batch_run import BatchRun

router = APIRouter()

# Hardcoded admin email list
ADMIN_EMAILS = ["william.jamhoury@gmail.com"]


class AdminStats(BaseModel):
    total_users: int
    active_users_7d: int
    active_users_30d: int
    total_jobs: int
    total_syncs: int
    events_today: int
    events_7d: int


def require_admin(user_db: Tuple[Session, User] = Depends(get_user_db)) -> Tuple[Session, User]:
    """Dependency that ensures the user is an admin."""
    db, user = user_db
    if user.email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return db, user


@router.get("/stats", response_model=AdminStats)
def get_admin_stats(
    user_db: Tuple[Session, User] = Depends(require_admin)
):
    """
    Get admin stats for monitoring app usage.
    Only accessible by admin users (william.jamhoury@gmail.com).
    """
    db, _ = user_db
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total users
    total_users = db.query(func.count(User.id)).scalar() or 0

    # Active users in last 7 days (users with usage events)
    active_7d = db.query(func.count(func.distinct(UsageEvent.user_id))).filter(
        UsageEvent.created_at >= seven_days_ago
    ).scalar() or 0

    # Active users in last 30 days
    active_30d = db.query(func.count(func.distinct(UsageEvent.user_id))).filter(
        UsageEvent.created_at >= thirty_days_ago
    ).scalar() or 0

    # Total jobs across all users
    total_jobs = db.query(func.count(Job.id)).scalar() or 0

    # Total sync runs
    total_syncs = db.query(func.count(BatchRun.id)).scalar() or 0

    # Events today
    events_today = db.query(func.count(UsageEvent.id)).filter(
        UsageEvent.created_at >= today_start
    ).scalar() or 0

    # Events in last 7 days
    events_7d = db.query(func.count(UsageEvent.id)).filter(
        UsageEvent.created_at >= seven_days_ago
    ).scalar() or 0

    return AdminStats(
        total_users=total_users,
        active_users_7d=active_7d,
        active_users_30d=active_30d,
        total_jobs=total_jobs,
        total_syncs=total_syncs,
        events_today=events_today,
        events_7d=events_7d
    )
