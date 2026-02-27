from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional, Tuple
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from app.dependencies import get_user_db
from app.models.job import Job
from app.models.user import User

router = APIRouter()


class StatusCount(BaseModel):
    status: str
    count: int


class SourceCount(BaseModel):
    source: str
    count: int


class DailyApplications(BaseModel):
    date: str
    count: int


class AnalyticsResponse(BaseModel):
    total_jobs: int
    applied_count: int
    applied_percentage: float
    response_count: int
    response_rate: float
    interviewing_count: int
    offer_count: int
    rejected_count: int
    status_breakdown: list[StatusCount]
    source_breakdown: list[SourceCount]
    applications_over_time: list[DailyApplications]
    responses_over_time: list[DailyApplications]


def get_date_filter(days: Optional[int]) -> Optional[date]:
    """Calculate the start date for filtering based on days parameter."""
    if days is None:
        return None
    return date.today() - timedelta(days=days)


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    days: Optional[int] = Query(None, description="Filter to last N days (7, 30, 90, or None for all)"),
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """Get analytics data for the dashboard."""
    db, user = user_db
    start_date = get_date_filter(days)

    # Base query - filter by user_id and date range if specified
    base_query = db.query(Job).filter(Job.user_id == user.id)
    if start_date:
        base_query = base_query.filter(Job.created_at >= start_date)

    # Total jobs
    total_jobs = base_query.count()

    # Applied count
    applied_query = base_query.filter(Job.applied == True)
    applied_count = applied_query.count()
    applied_percentage = (applied_count / total_jobs * 100) if total_jobs > 0 else 0

    # Response count (jobs with response_date or in interviewing/offer status)
    response_count = base_query.filter(
        (Job.response_date != None) |
        (Job.status.in_(["interviewing", "offer"]))
    ).count()
    response_rate = (response_count / applied_count * 100) if applied_count > 0 else 0

    # Status counts
    interviewing_count = base_query.filter(Job.status == "interviewing").count()
    offer_count = base_query.filter(Job.status == "offer").count()
    rejected_count = base_query.filter(Job.status == "rejected").count()

    # Status breakdown - filter by user_id
    status_query = db.query(
        Job.status,
        func.count(Job.id).label('count')
    ).filter(Job.user_id == user.id)

    if start_date:
        status_query = status_query.filter(Job.created_at >= start_date)

    status_results = status_query.group_by(Job.status).all()

    status_breakdown = [
        StatusCount(status=row[0], count=row[1])
        for row in status_results
    ]

    # Source breakdown - filter by user_id
    source_query = db.query(
        Job.source,
        func.count(Job.id).label('count')
    ).filter(Job.user_id == user.id)

    if start_date:
        source_query = source_query.filter(Job.created_at >= start_date)

    source_results = source_query.group_by(Job.source).all()

    source_breakdown = [
        SourceCount(source=row[0] or "unknown", count=row[1])
        for row in source_results
    ]

    # Applications over time (by applied_date) - filter by user_id
    apps_query = db.query(
        func.date(Job.applied_date).label('app_date'),
        func.count(Job.id).label('count')
    ).filter(
        Job.user_id == user.id,
        Job.applied_date != None
    )

    if start_date:
        apps_query = apps_query.filter(Job.applied_date >= start_date)

    apps_results = apps_query.group_by(func.date(Job.applied_date)).order_by('app_date').all()

    applications_over_time = [
        DailyApplications(date=str(row[0]), count=row[1])
        for row in apps_results
    ]

    # Responses over time (by response_date) - filter by user_id
    responses_query = db.query(
        func.date(Job.response_date).label('resp_date'),
        func.count(Job.id).label('count')
    ).filter(
        Job.user_id == user.id,
        Job.response_date != None
    )

    if start_date:
        responses_query = responses_query.filter(Job.response_date >= start_date)

    responses_results = responses_query.group_by(func.date(Job.response_date)).order_by('resp_date').all()

    responses_over_time = [
        DailyApplications(date=str(row[0]), count=row[1])
        for row in responses_results
    ]

    return AnalyticsResponse(
        total_jobs=total_jobs,
        applied_count=applied_count,
        applied_percentage=round(applied_percentage, 1),
        response_count=response_count,
        response_rate=round(response_rate, 1),
        interviewing_count=interviewing_count,
        offer_count=offer_count,
        rejected_count=rejected_count,
        status_breakdown=status_breakdown,
        source_breakdown=source_breakdown,
        applications_over_time=applications_over_time,
        responses_over_time=responses_over_time
    )
