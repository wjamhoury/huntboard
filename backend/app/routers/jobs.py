import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Tuple
from pydantic import BaseModel, HttpUrl
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import get_user_db
from app.models.job import Job
from app.models.job_activity import JobActivity
from app.models.user import User
from app.schemas.job import JobCreate, JobUpdate, JobResponse, StatusUpdate, JobActivityResponse
from app.services.job_scraper import scrape_job_url
from app.services.location_parser import update_job_location

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter()


def log_activity(db: Session, job_id: int, user_id: str, action: str, detail: str = None):
    """Helper function to log job activities."""
    activity = JobActivity(
        job_id=job_id,
        user_id=user_id,
        action=action,
        detail=detail
    )
    db.add(activity)
    # Don't commit here - let the calling function handle the transaction


@router.get("", response_model=List[JobResponse])
def get_jobs(
    status: Optional[str] = Query(None, description="Filter by status (comma-separated for multiple)"),
    priority: Optional[int] = Query(None),
    search: Optional[str] = Query(None, description="Legacy search parameter (same as keyword)"),
    applied: Optional[bool] = Query(None),
    # New filter parameters
    location: Optional[str] = Query(None, description="Filter by location text (case-insensitive)"),
    keyword: Optional[str] = Query(None, description="Search title, description, and company"),
    min_score: Optional[int] = Query(None, ge=0, le=100, description="Minimum AI match score"),
    max_score: Optional[int] = Query(None, ge=0, le=100, description="Maximum AI match score"),
    source: Optional[str] = Query(None, description="Filter by job source (e.g., greenhouse, workday, manual)"),
    remote_only: Optional[bool] = Query(None, description="Filter to only remote jobs"),
    sort: Optional[str] = Query(None, description="Sort order: score_desc, score_asc, date_desc, date_asc, company_asc"),
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """
    Get all jobs with optional filters. All filters are composable (AND logic).

    Filter parameters:
    - status: Filter by status (comma-separated for multiple, e.g., "new,reviewing")
    - location: Filter by location text (case-insensitive ILIKE search)
    - keyword: Search title + description + company (case-insensitive)
    - min_score/max_score: Filter by AI match score range
    - source: Filter by job source
    - remote_only: Shortcut filter for remote jobs (location contains "remote" OR is_remote=true)
    - sort: Sort order (score_desc, score_asc, date_desc, date_asc, company_asc)
    """
    db, user = user_db
    query = db.query(Job).options(joinedload(Job.resume)).filter(Job.user_id == user.id)

    # Status filter (supports comma-separated values)
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        if len(statuses) == 1:
            query = query.filter(Job.status == statuses[0])
        elif len(statuses) > 1:
            query = query.filter(Job.status.in_(statuses))

    if priority:
        query = query.filter(Job.priority == priority)

    if applied is not None:
        query = query.filter(Job.applied == applied)

    # Keyword search (title, description, company) - use keyword or fallback to search
    keyword_term = keyword or search
    if keyword_term:
        search_pattern = f"%{keyword_term}%"
        query = query.filter(
            (Job.title.ilike(search_pattern)) |
            (Job.company.ilike(search_pattern)) |
            (Job.description.ilike(search_pattern))
        )

    # Location filter
    if location:
        location_pattern = f"%{location}%"
        query = query.filter(
            (Job.location.ilike(location_pattern)) |
            (Job.location_city.ilike(location_pattern)) |
            (Job.location_state.ilike(location_pattern)) |
            (Job.location_country.ilike(location_pattern))
        )

    # Score range filter
    if min_score is not None:
        query = query.filter(Job.match_score >= min_score)
    if max_score is not None:
        query = query.filter(Job.match_score <= max_score)

    # Source filter
    if source:
        query = query.filter(Job.source == source)

    # Remote only filter
    if remote_only:
        query = query.filter(
            (Job.is_remote == True) |
            (Job.location.ilike("%remote%")) |
            (Job.remote_type == "remote")
        )

    # Sorting
    if sort:
        if sort == "score_desc":
            query = query.order_by(Job.match_score.desc().nullslast(), Job.created_at.desc())
        elif sort == "score_asc":
            query = query.order_by(Job.match_score.asc().nullsfirst(), Job.created_at.desc())
        elif sort == "date_desc":
            query = query.order_by(Job.created_at.desc())
        elif sort == "date_asc":
            query = query.order_by(Job.created_at.asc())
        elif sort == "company_asc":
            query = query.order_by(Job.company.asc(), Job.created_at.desc())
        else:
            query = query.order_by(Job.created_at.desc())
    else:
        query = query.order_by(Job.created_at.desc())

    return query.all()


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    job = db.query(Job).options(joinedload(Job.resume)).filter(
        Job.id == job_id,
        Job.user_id == user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("", response_model=JobResponse)
def create_job(job: JobCreate, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    db_job = Job(**job.model_dump(), user_id=user.id)

    # Parse location and update normalized location fields
    if db_job.location:
        update_job_location(db_job)

    db.add(db_job)
    db.flush()  # Get the ID without committing

    # Log creation activity
    log_activity(db, db_job.id, user.id, "created", f"Job added from {db_job.source or 'manual'}")

    db.commit()
    db.refresh(db_job)
    # Reload with resume relationship
    return db.query(Job).options(joinedload(Job.resume)).filter(Job.id == db_job.id).first()


@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: int, job: JobUpdate, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    db_job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = job.model_dump(exclude_unset=True)
    old_status = db_job.status
    old_notes = db_job.notes

    for key, value in update_data.items():
        setattr(db_job, key, value)

    # Re-parse location if it was updated
    if "location" in update_data:
        update_job_location(db_job)

    # Log status change activity
    if "status" in update_data and update_data["status"] != old_status:
        log_activity(db, job_id, user.id, "status_change", f"{old_status} -> {update_data['status']}")

    # Log notes change activity
    if "notes" in update_data and update_data["notes"] != old_notes:
        # Truncate detail for preview
        note_preview = (update_data["notes"] or "")[:100]
        if len(update_data["notes"] or "") > 100:
            note_preview += "..."
        log_activity(db, job_id, user.id, "note_added", note_preview if note_preview else "Note cleared")

    db.commit()
    # Reload with resume relationship
    return db.query(Job).options(joinedload(Job.resume)).filter(Job.id == job_id).first()


@router.patch("/{job_id}/status", response_model=JobResponse)
def update_job_status(job_id: int, status_update: StatusUpdate, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    db_job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    valid_statuses = ["new", "saved", "reviewing", "applied", "interviewing", "rejected", "offer", "archived"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    from datetime import date

    old_status = db_job.status
    db_job.status = status_update.status

    # Auto-set applied if moving to applied status
    if status_update.status == "applied" and not db_job.applied:
        db_job.applied = True
        db_job.applied_date = date.today()

    # Auto-set response_date when moving to interviewing
    if status_update.status == "interviewing" and not db_job.response_date:
        db_job.response_date = date.today()

    # Log status change activity
    if old_status != status_update.status:
        log_activity(db, job_id, user.id, "status_change", f"{old_status} -> {status_update.status}")

    db.commit()
    # Reload with resume relationship
    return db.query(Job).options(joinedload(Job.resume)).filter(Job.id == job_id).first()


@router.delete("/{job_id}")
def delete_job(job_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    db_job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(db_job)
    db.commit()
    return {"message": "Job deleted successfully"}


class BulkDeleteRequest(BaseModel):
    ids: List[int]


class BulkStatusRequest(BaseModel):
    ids: List[int]
    status: str


class ImportUrlRequest(BaseModel):
    url: str


class ImportUrlResponse(BaseModel):
    title: str
    company: str
    location: str
    description: str
    url: str
    remote_type: str


@router.post("/import-url", response_model=ImportUrlResponse)
@limiter.limit("10/minute")
async def import_job_from_url(request: Request, body: ImportUrlRequest):
    """Scrape job information from a URL."""
    try:
        data = await scrape_job_url(body.url)
        return ImportUrlResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to scrape URL: {str(e)}")


@router.post("/bulk-delete")
def bulk_delete_jobs(request: BulkDeleteRequest, user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Delete multiple jobs by their IDs."""
    db, user = user_db
    if not request.ids:
        raise HTTPException(status_code=400, detail="No job IDs provided")

    deleted_count = db.query(Job).filter(
        Job.id.in_(request.ids),
        Job.user_id == user.id
    ).delete(synchronize_session=False)
    db.commit()

    return {"message": f"Successfully deleted {deleted_count} jobs", "deleted_count": deleted_count}


@router.patch("/bulk-status")
def bulk_update_status(request: BulkStatusRequest, user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Update status for multiple jobs."""
    db, user = user_db
    if not request.ids:
        raise HTTPException(status_code=400, detail="No job IDs provided")

    valid_statuses = ["new", "saved", "reviewing", "applied", "interviewing", "rejected", "offer", "archived"]
    if request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    # Update all matching jobs for this user
    updated_count = db.query(Job).filter(
        Job.id.in_(request.ids),
        Job.user_id == user.id
    ).update(
        {"status": request.status},
        synchronize_session=False
    )

    # If moving to applied, also set applied flag
    if request.status == "applied":
        from datetime import date
        db.query(Job).filter(
            Job.id.in_(request.ids),
            Job.user_id == user.id,
            Job.applied == False
        ).update(
            {"applied": True, "applied_date": date.today()},
            synchronize_session=False
        )

    # If moving to interviewing, set response_date
    if request.status == "interviewing":
        from datetime import date
        db.query(Job).filter(
            Job.id.in_(request.ids),
            Job.user_id == user.id,
            Job.response_date == None
        ).update(
            {"response_date": date.today()},
            synchronize_session=False
        )

    db.commit()

    return {"message": f"Successfully updated {updated_count} jobs to {request.status}", "updated_count": updated_count}


@router.get("/check-url")
def check_url_exists(url: str = Query(...), user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Check if a job with this URL already exists for this user."""
    db, user = user_db
    if not url:
        return {"exists": False}

    existing = db.query(Job).filter(Job.url == url, Job.user_id == user.id).first()
    return {"exists": existing is not None, "job_id": existing.id if existing else None}


@router.get("/export/matched")
def export_matched_jobs(
    min_score: int = Query(75, ge=0, le=100),
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """
    Export high-quality matched jobs as structured JSON.
    Only returns jobs with match_score >= min_score.

    Output format per requirement:
    {
        "job_title": "",
        "company": "",
        "location": "",
        "remote": true,
        "match_score": 0,
        "why_good_fit": [],
        "missing_gaps": [],
        "apply_url": ""
    }
    """
    db, user = user_db
    import json as json_lib

    jobs = db.query(Job).filter(
        Job.user_id == user.id,
        Job.match_score != None,
        Job.match_score >= min_score,
        Job.status != "archived",
    ).order_by(Job.match_score.desc()).all()

    results = []
    for job in jobs:
        try:
            why_good_fit = json_lib.loads(job.why_good_fit) if job.why_good_fit else []
        except (json_lib.JSONDecodeError, TypeError):
            why_good_fit = []

        try:
            missing_gaps = json_lib.loads(job.missing_gaps) if job.missing_gaps else []
        except (json_lib.JSONDecodeError, TypeError):
            missing_gaps = []

        results.append({
            "job_title": job.title,
            "company": job.company,
            "location": job.location or "",
            "remote": job.remote_type == "remote",
            "match_score": job.match_score,
            "why_good_fit": why_good_fit,
            "missing_gaps": missing_gaps,
            "apply_url": job.url or "",
        })

    return {"jobs": results, "total": len(results), "min_score": min_score}


@router.get("/export/csv")
def export_jobs_csv(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """
    Export all user's jobs as a CSV download.
    Returns: title, company, location, status, source, ai_score, url, created_at, updated_at
    """
    import csv
    import io
    from fastapi.responses import StreamingResponse

    db, user = user_db

    jobs = db.query(Job).filter(Job.user_id == user.id).order_by(Job.created_at.desc()).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "Title", "Company", "Location", "Status", "Source",
        "AI Score", "URL", "Created At", "Updated At"
    ])

    # Write job rows
    for job in jobs:
        writer.writerow([
            job.title or "",
            job.company or "",
            job.location or "",
            job.status or "",
            job.source or "",
            job.match_score if job.match_score is not None else "",
            job.url or "",
            job.created_at.isoformat() if job.created_at else "",
            job.updated_at.isoformat() if job.updated_at else "",
        ])

    # Reset stream position
    output.seek(0)

    # Return as streaming response with CSV content type
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=huntboard-jobs-export.csv"}
    )


@router.get("/{job_id}/activities", response_model=List[JobActivityResponse])
def get_job_activities(job_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Get all activities for a specific job, ordered by most recent first."""
    db, user = user_db

    # First verify the job exists and belongs to the user
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    activities = db.query(JobActivity).filter(
        JobActivity.job_id == job_id,
        JobActivity.user_id == user.id
    ).order_by(JobActivity.created_at.desc()).all()

    return activities
