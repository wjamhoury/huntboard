from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_
from typing import Optional, Tuple, List
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from app.dependencies import get_user_db
from app.models.job import Job
from app.models.job_activity import JobActivity
from app.models.rss_feed import RssFeed
from app.models.company_feed import CompanyFeed
from app.models.user import User

router = APIRouter()


# --- Response Models ---

class StatusCount(BaseModel):
    status: str
    count: int


class SourceCount(BaseModel):
    source: str
    count: int


class ScoreRange(BaseModel):
    range: str
    count: int


class DailyActivity(BaseModel):
    date: str
    added: int
    applied: int


class RecentActivity(BaseModel):
    id: int
    job_id: int
    job_title: str
    company: str
    action: str
    detail: Optional[str]
    created_at: str


class DashboardSummary(BaseModel):
    total_active: int
    total_applied: int
    avg_score: float
    added_this_week: int
    active_sources: int


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    status_breakdown: List[StatusCount]
    source_breakdown: List[SourceCount]
    score_distribution: List[ScoreRange]
    daily_activity: List[DailyActivity]
    recent_activities: List[RecentActivity]


# --- Legacy Analytics Response (keeping for backward compatibility) ---

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


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_analytics(
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """
    Get comprehensive dashboard analytics data in a single call.
    Returns summary stats, status/source breakdowns, score distribution,
    daily activity, and recent activities.
    """
    db, user = user_db
    today = date.today()
    week_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)

    # --- Summary Stats ---

    # Total active jobs (not archived)
    total_active = db.query(func.count(Job.id)).filter(
        Job.user_id == user.id,
        Job.status != "archived"
    ).scalar() or 0

    # Jobs applied to
    total_applied = db.query(func.count(Job.id)).filter(
        Job.user_id == user.id,
        Job.status.in_(["applied", "interviewing", "offer", "rejected"])
    ).scalar() or 0

    # Average AI match score (for scored jobs)
    avg_score_result = db.query(func.avg(Job.match_score)).filter(
        Job.user_id == user.id,
        Job.match_score.isnot(None)
    ).scalar()
    avg_score = round(float(avg_score_result), 1) if avg_score_result else 0.0

    # Jobs added this week
    added_this_week = db.query(func.count(Job.id)).filter(
        Job.user_id == user.id,
        Job.created_at >= week_ago
    ).scalar() or 0

    # Active sources (enabled RSS feeds + company feeds)
    rss_count = db.query(func.count(RssFeed.id)).filter(
        RssFeed.user_id == user.id,
        RssFeed.is_active == True
    ).scalar() or 0

    company_count = db.query(func.count(CompanyFeed.id)).filter(
        CompanyFeed.user_id == user.id,
        CompanyFeed.is_active == True
    ).scalar() or 0

    active_sources = rss_count + company_count

    summary = DashboardSummary(
        total_active=total_active,
        total_applied=total_applied,
        avg_score=avg_score,
        added_this_week=added_this_week,
        active_sources=active_sources
    )

    # --- Status Breakdown (funnel) ---
    # Order: new -> saved -> reviewing -> applied -> interviewing -> offer (+ rejected, archived)
    status_order = ["new", "saved", "reviewing", "applied", "interviewing", "offer", "rejected", "archived"]

    status_results = db.query(
        Job.status,
        func.count(Job.id).label('count')
    ).filter(
        Job.user_id == user.id
    ).group_by(Job.status).all()

    status_map = {row[0]: row[1] for row in status_results}
    status_breakdown = [
        StatusCount(status=status, count=status_map.get(status, 0))
        for status in status_order
    ]

    # --- Source Breakdown ---
    source_results = db.query(
        Job.source,
        func.count(Job.id).label('count')
    ).filter(
        Job.user_id == user.id
    ).group_by(Job.source).order_by(func.count(Job.id).desc()).all()

    source_breakdown = [
        SourceCount(source=row[0] or "unknown", count=row[1])
        for row in source_results
    ]

    # --- Score Distribution ---
    # Buckets: 0-20, 20-40, 40-60, 60-80, 80-100, unscored
    score_ranges = [
        ("0-20", 0, 20),
        ("20-40", 20, 40),
        ("40-60", 40, 60),
        ("60-80", 60, 80),
        ("80-100", 80, 101),  # 101 to include 100
    ]

    score_distribution = []
    for label, low, high in score_ranges:
        count = db.query(func.count(Job.id)).filter(
            Job.user_id == user.id,
            Job.match_score >= low,
            Job.match_score < high
        ).scalar() or 0
        score_distribution.append(ScoreRange(range=label, count=count))

    # Add unscored count
    unscored_count = db.query(func.count(Job.id)).filter(
        Job.user_id == user.id,
        Job.match_score.is_(None)
    ).scalar() or 0
    score_distribution.append(ScoreRange(range="Unscored", count=unscored_count))

    # --- Daily Activity (last 30 days) ---
    # Jobs added per day
    added_by_day = db.query(
        func.date(Job.created_at).label('day'),
        func.count(Job.id).label('count')
    ).filter(
        Job.user_id == user.id,
        Job.created_at >= thirty_days_ago
    ).group_by(func.date(Job.created_at)).all()

    added_map = {str(row[0]): row[1] for row in added_by_day}

    # Jobs applied per day (by applied_date)
    applied_by_day = db.query(
        Job.applied_date,
        func.count(Job.id).label('count')
    ).filter(
        Job.user_id == user.id,
        Job.applied_date >= thirty_days_ago,
        Job.applied_date.isnot(None)
    ).group_by(Job.applied_date).all()

    applied_map = {str(row[0]): row[1] for row in applied_by_day}

    # Build daily activity list for last 30 days
    daily_activity = []
    for i in range(30):
        day = thirty_days_ago + timedelta(days=i)
        day_str = str(day)
        daily_activity.append(DailyActivity(
            date=day_str,
            added=added_map.get(day_str, 0),
            applied=applied_map.get(day_str, 0)
        ))

    # --- Recent Activities (last 10 across all jobs) ---
    activities = db.query(JobActivity).join(Job).filter(
        JobActivity.user_id == user.id
    ).order_by(JobActivity.created_at.desc()).limit(10).all()

    recent_activities = []
    for activity in activities:
        recent_activities.append(RecentActivity(
            id=activity.id,
            job_id=activity.job_id,
            job_title=activity.job.title if activity.job else "Unknown",
            company=activity.job.company if activity.job else "Unknown",
            action=activity.action,
            detail=activity.detail,
            created_at=activity.created_at.isoformat() if activity.created_at else ""
        ))

    return DashboardResponse(
        summary=summary,
        status_breakdown=status_breakdown,
        source_breakdown=source_breakdown,
        score_distribution=score_distribution,
        daily_activity=daily_activity,
        recent_activities=recent_activities
    )


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    days: Optional[int] = Query(None, description="Filter to last N days (7, 30, 90, or None for all)"),
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """Get analytics data for the dashboard (legacy endpoint)."""
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
