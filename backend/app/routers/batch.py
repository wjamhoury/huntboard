"""
Batch operations router - manual trigger and history for nightly sync.
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

from app.database import get_db, SessionLocal
from app.dependencies import get_user_db
from app.models.batch_run import BatchRun
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.schemas.batch_run import (
    BatchRunResponse,
    BatchRunListResponse,
    BatchTriggerResponse,
    BatchStatusResponse,
    ScoreJobsRequest,
    ScoreJobsResponse
)
from app.services.nightly_sync import run_nightly_sync, is_sync_running, MIN_MATCH_SCORE
from app.services.claude_client import score_job_match
from app.models.rss_feed import RssFeed
from app.models.company_feed import CompanyFeed
from app.scheduler import scheduler, _load_config, _save_config, _ensure_job_exists

import json
from pydantic import BaseModel as PydanticBaseModel
from apscheduler.triggers.cron import CronTrigger

router = APIRouter()

# Track scoring state per user
_scoring_users = set()


# ─── Source overview endpoint ───────────────────────────────────────

class SourceInfo(PydanticBaseModel):
    id: str
    name: str
    type: str  # rss, greenhouse, workday, lever, google_jobs
    enabled: bool
    detail: Optional[str] = None
    last_fetched: Optional[str] = None
    db_id: Optional[int] = None


@router.get("/sources")
def get_import_sources(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """
    Return a unified view of all import sources: RSS feeds, Greenhouse,
    Workday, Lever, Google Jobs (SerpAPI).
    """
    db, user = user_db
    sources: list[dict] = []

    # RSS feeds for this user
    feeds = db.query(RssFeed).filter(RssFeed.user_id == user.id).all()
    for f in feeds:
        sources.append({
            "id": f"rss:{f.id}",
            "name": f.name,
            "type": "rss",
            "enabled": f.is_active,
            "detail": f.url,
            "last_fetched": f.last_fetched.isoformat() if f.last_fetched else None,
            "db_id": f.id,
        })

    # Company feeds (Greenhouse / Workday / Lever) for this user
    companies = db.query(CompanyFeed).filter(CompanyFeed.user_id == user.id).all()
    for c in companies:
        detail = ""
        if c.feed_type == "greenhouse":
            detail = f"boards.greenhouse.io/{c.greenhouse_board_token}"
        elif c.feed_type == "workday":
            detail = c.workday_url or ""
        elif c.feed_type == "lever":
            detail = f"jobs.lever.co/{c.lever_slug}"
        sources.append({
            "id": f"company:{c.id}",
            "name": c.company_name,
            "type": c.feed_type,
            "enabled": c.is_active,
            "detail": detail,
            "last_fetched": c.last_fetched.isoformat() if c.last_fetched else None,
            "db_id": c.id,
        })

    # Google Jobs (SerpAPI - standalone source)
    sources.append({
        "id": "google_jobs",
        "name": "Google Jobs",
        "type": "google_jobs",
        "enabled": True,
        "detail": "SerpAPI-powered Google Jobs search",
        "last_fetched": None,
        "db_id": None,
    })

    return {
        "sources": sources,
        "summary": {
            "total": len(sources),
            "rss": sum(1 for s in sources if s["type"] == "rss"),
            "greenhouse": sum(1 for s in sources if s["type"] == "greenhouse"),
            "workday": sum(1 for s in sources if s["type"] == "workday"),
            "lever": sum(1 for s in sources if s["type"] == "lever"),
            "google_jobs": 1,
        },
    }


# ─── Selective sync endpoint ───────────────────────────────────────

class SelectiveSyncRequest(PydanticBaseModel):
    sources: list[str]  # list of source types: "rss", "greenhouse", "workday", "lever", "google_jobs"
    score_after: bool = True


@router.post("/sync")
@limiter.limit("2/minute")
def selective_sync(
    request: Request,
    body: SelectiveSyncRequest,
    background_tasks: BackgroundTasks,
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """
    Run a selective sync for chosen source types.
    """
    db, user = user_db
    is_running, current_id = is_sync_running()
    if is_running:
        raise HTTPException(
            status_code=409,
            detail=f"Sync already in progress (run #{current_id})"
        )

    def _run_selective(source_types, score_after, user_id: str):
        from app.services.nightly_sync import (
            _import_rss_jobs, _import_company_jobs, _import_lever_jobs,
            _import_google_jobs, _score_unscored_jobs, _is_running,
        )
        import app.services.nightly_sync as ns
        ns._is_running = True
        sess = SessionLocal()

        try:
            batch_run = BatchRun(user_id=user_id, run_type="selective_sync", status="running")
            sess.add(batch_run)
            sess.commit()
            sess.refresh(batch_run)
            ns._current_run_id = batch_run.id

            errors = []
            jobs_imported = 0
            total_tokens = 0

            if "rss" in source_types:
                n, errs = _import_rss_jobs(sess, user_id)
                jobs_imported += n
                errors.extend(errs)

            if "greenhouse" in source_types or "workday" in source_types:
                n, errs = _import_company_jobs(sess, user_id)
                jobs_imported += n
                errors.extend(errs)

            if "lever" in source_types:
                n, errs = _import_lever_jobs(sess, user_id)
                jobs_imported += n
                errors.extend(errs)

            if "google_jobs" in source_types:
                n, errs = _import_google_jobs(sess, user_id)
                jobs_imported += n
                errors.extend(errs)

            sess.commit()

            jobs_scored = 0
            jobs_filtered = 0
            if score_after:
                scored, filtered, tokens, score_errs = _score_unscored_jobs(sess, user_id)
                jobs_scored = scored
                jobs_filtered = filtered
                total_tokens = tokens
                errors.extend(score_errs)
                sess.commit()

            batch_run.status = "completed"
            batch_run.completed_at = datetime.now()
            batch_run.jobs_imported = jobs_imported
            batch_run.jobs_scored = jobs_scored
            batch_run.tokens_used = total_tokens
            batch_run.errors = json.dumps(errors)
            sess.commit()

        except Exception as e:
            try:
                batch_run.status = "failed"
                batch_run.completed_at = datetime.now()
                batch_run.errors = json.dumps([str(e)])
                sess.commit()
            except:
                pass
        finally:
            ns._is_running = False
            ns._current_run_id = None
            sess.close()

    background_tasks.add_task(_run_selective, body.sources, body.score_after, user.id)

    return {"message": f"Sync started for: {', '.join(body.sources)}", "sources": body.sources}


@router.post("/trigger", response_model=BatchTriggerResponse)
@limiter.limit("2/minute")
def trigger_sync(
    request: Request,
    background_tasks: BackgroundTasks,
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """
    Manually trigger a full sync job.
    Runs in background so the request returns immediately.
    """
    db, user = user_db
    is_running, current_id = is_sync_running()
    if is_running:
        raise HTTPException(
            status_code=409,
            detail=f"Sync already in progress (run #{current_id})"
        )

    # Run in background with user_id
    background_tasks.add_task(run_nightly_sync, "manual_sync", user.id)

    return BatchTriggerResponse(
        message="Sync started in background",
        run_id=0  # Will be assigned when it starts
    )


@router.get("/status", response_model=BatchStatusResponse)
def get_sync_status(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Check if a sync is currently running."""
    db, user = user_db
    is_running, current_id = is_sync_running()

    if is_running and current_id:
        run = db.query(BatchRun).filter(
            BatchRun.id == current_id,
            BatchRun.user_id == user.id
        ).first()
        return BatchStatusResponse(
            is_running=True,
            current_run_id=current_id,
            started_at=run.started_at if run else None
        )

    return BatchStatusResponse(is_running=False)


@router.get("/runs", response_model=BatchRunListResponse)
def get_runs(
    skip: int = 0,
    limit: int = 20,
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """Get history of batch runs for the current user."""
    db, user = user_db
    total = db.query(BatchRun).filter(BatchRun.user_id == user.id).count()
    runs = db.query(BatchRun)\
        .filter(BatchRun.user_id == user.id)\
        .order_by(BatchRun.started_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

    return BatchRunListResponse(runs=runs, total=total)


@router.get("/runs/{run_id}", response_model=BatchRunResponse)
def get_run(run_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Get details of a specific batch run."""
    db, user = user_db
    run = db.query(BatchRun).filter(
        BatchRun.id == run_id,
        BatchRun.user_id == user.id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Batch run not found")
    return run


# ─── Schedule management endpoints ────────────────────────────────

@router.get("/schedule")
def get_schedule(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Get current schedule configuration and status."""
    db, user = user_db
    job = _ensure_job_exists()
    config = _load_config()

    # Get last completed or failed run for this user (any type)
    last_run = db.query(BatchRun)\
        .filter(
            BatchRun.user_id == user.id,
            BatchRun.status.in_(["completed", "failed"])
        )\
        .order_by(BatchRun.started_at.desc())\
        .first()

    # Get last nightly_sync run specifically for this user
    last_nightly = db.query(BatchRun)\
        .filter(
            BatchRun.user_id == user.id,
            BatchRun.run_type == "nightly_sync",
            BatchRun.status.in_(["completed", "failed"])
        )\
        .order_by(BatchRun.started_at.desc())\
        .first()

    result = {
        "enabled": job.next_run_time is not None if job else False,
        "hour": config["hour"],
        "next_run_time": job.next_run_time.isoformat() if job and job.next_run_time else None,
        "last_run": None,
        "last_nightly_run": None,
    }

    def _run_summary(run):
        return {
            "id": run.id,
            "run_type": run.run_type,
            "status": run.status,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "jobs_imported": run.jobs_imported,
            "jobs_scored": run.jobs_scored,
        }

    if last_run:
        result["last_run"] = _run_summary(last_run)

    if last_nightly:
        result["last_nightly_run"] = _run_summary(last_nightly)

    return result


class ScheduleUpdateRequest(PydanticBaseModel):
    enabled: Optional[bool] = None
    hour: Optional[int] = None  # 0-23


@router.patch("/schedule")
def update_schedule(request: ScheduleUpdateRequest):
    """Update schedule configuration. Changes take effect immediately and persist."""
    config = _load_config()
    job = _ensure_job_exists()

    if request.hour is not None:
        if not (0 <= request.hour <= 23):
            raise HTTPException(status_code=400, detail="Hour must be between 0 and 23")
        config["hour"] = request.hour
        scheduler.reschedule_job(
            "nightly_sync",
            trigger=CronTrigger(hour=request.hour, minute=0)
        )

    if request.enabled is not None:
        config["enabled"] = request.enabled
        if request.enabled:
            scheduler.resume_job("nightly_sync")
        else:
            scheduler.pause_job("nightly_sync")

    _save_config(config)

    # Re-fetch job after changes
    job = scheduler.get_job("nightly_sync")
    return {
        "enabled": job.next_run_time is not None if job else False,
        "hour": config["hour"],
        "next_run_time": job.next_run_time.isoformat() if job and job.next_run_time else None,
        "message": "Schedule updated",
    }


# ─── Scoring endpoints ───────────────────────────────────────────

def _run_scoring(user_id: str, job_ids: Optional[List[int]] = None):
    """Background task to score jobs for a specific user."""
    global _scoring_users
    _scoring_users.add(user_id)
    db = SessionLocal()

    try:
        # Get user for target_job_titles
        user = db.query(User).filter(User.id == user_id).first()
        target_job_titles = user.target_job_titles if user else None

        # Get resumes for this user
        resumes = db.query(Resume).filter(Resume.user_id == user_id).all()

        # If no resumes AND no target job titles, can't score
        if not resumes and not target_job_titles:
            logger.warning(f"No resumes or target job titles for user {user_id} - cannot score jobs")
            return

        resume_data = [
            {"id": r.id, "name": r.original_filename, "text": r.extracted_text or ""}
            for r in resumes
        ] if resumes else []

        # Get jobs to score for this user
        if job_ids:
            jobs = db.query(Job).filter(
                Job.id.in_(job_ids),
                Job.user_id == user_id
            ).all()
        else:
            # Score all unscored new jobs with descriptions for this user
            jobs = db.query(Job).filter(
                Job.user_id == user_id,
                Job.match_score == None,
                Job.status == "new",
                Job.description != "",
                Job.description != None
            ).all()

        scored = 0
        for job in jobs:
            try:
                result = score_job_match(
                    job_title=job.title,
                    job_company=job.company,
                    job_description=job.description or "",
                    resumes=resume_data,
                    location=job.location or "",
                    remote_type=job.remote_type or "unknown",
                    target_job_titles=target_job_titles,
                )

                if result:
                    job.match_score = result["score"]
                    job.resume_id = result.get("resume_id")
                    job.why_good_fit = json.dumps(result.get("why_good_fit", []))
                    job.missing_gaps = json.dumps(result.get("missing_gaps", []))
                    job.score_detail = json.dumps(result.get("detail", {}))
                    job.general_notes = f"AI Analysis: {result.get('reason', '')}"
                    job.scored_at = datetime.now()
                    scored += 1

                    # Auto-archive low-scoring jobs (with same protections as nightly_sync)
                    # 1. Never archive manual jobs (user created them)
                    # 2. Never archive import_url jobs (user intentionally imported them)
                    # 3. Never archive jobs in protected statuses (user is actively tracking)
                    # 4. Only archive auto-imported jobs in "new" or "reviewing" status
                    PROTECTED_STATUSES = {"applied", "interviewing", "offer"}
                    should_archive = (
                        result["score"] < MIN_MATCH_SCORE
                        and job.source not in ("manual", "import_url")
                        and job.status not in PROTECTED_STATUSES
                        and job.status in ("new", "reviewing")
                    )
                    if should_archive:
                        job.status = "archived"
                    elif result["score"] >= MIN_MATCH_SCORE:
                        if result["score"] >= 90:
                            job.priority = 1
                        elif result["score"] >= 80:
                            job.priority = 2
                        else:
                            job.priority = 3

                    db.commit()

            except Exception as e:
                logger.error(f"Error scoring job {job.id}: {e}")
                # Continue scoring other jobs even if one fails

        logger.info(f"Scored {scored} jobs for user {user_id}")

    finally:
        _scoring_users.discard(user_id)
        db.close()


@router.post("/score-jobs", response_model=ScoreJobsResponse)
@limiter.limit("2/minute")
def score_jobs(
    request: Request,
    body: ScoreJobsRequest,
    background_tasks: BackgroundTasks,
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """
    Score jobs for resume match using AI.
    If job_ids provided, scores those specific jobs.
    If job_ids is None/empty, scores all unscored new jobs.
    """
    db, user = user_db
    global _scoring_users
    if user.id in _scoring_users:
        raise HTTPException(status_code=409, detail="Scoring already in progress")

    is_running, _ = is_sync_running()
    if is_running:
        raise HTTPException(status_code=409, detail="Sync is running - try again later")

    # Count jobs to score for this user
    if body.job_ids:
        count = db.query(Job).filter(
            Job.id.in_(body.job_ids),
            Job.user_id == user.id
        ).count()
    else:
        count = db.query(Job).filter(
            Job.user_id == user.id,
            Job.match_score == None,
            Job.status == "new",
            Job.description != "",
            Job.description != None
        ).count()

    if count == 0:
        return ScoreJobsResponse(message="No jobs to score", jobs_to_score=0)

    # Run in background
    background_tasks.add_task(_run_scoring, user.id, body.job_ids)

    return ScoreJobsResponse(
        message=f"Scoring {count} jobs in background",
        jobs_to_score=count
    )


# ─── Location backfill endpoint ────────────────────────────────────

@router.post("/backfill-locations")
def backfill_locations(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """
    Parse and update location fields for all jobs that don't have parsed location data.
    This is a one-time operation to backfill existing jobs.
    """
    from app.services.location_parser import update_job_location

    db, user = user_db

    # Find jobs with location but no parsed location data for this user
    jobs = db.query(Job).filter(
        Job.user_id == user.id,
        Job.location != None,
        Job.location != "",
        Job.location_city == None,
        Job.location_state == None,
        Job.is_remote == None
    ).all()

    if not jobs:
        # Also check for jobs where location exists but wasn't parsed
        jobs = db.query(Job).filter(
            Job.user_id == user.id,
            Job.location != None,
            Job.location != "",
            Job.location_city == None,
            Job.is_remote == False  # Default value, means not parsed
        ).all()

    updated = 0
    for job in jobs:
        try:
            update_job_location(job)
            updated += 1
        except Exception as e:
            logger.error(f"Error parsing location for job {job.id}: {e}")

    db.commit()

    return {
        "message": f"Updated location data for {updated} jobs",
        "jobs_updated": updated,
        "total_checked": len(jobs)
    }


@router.post("/backfill-resumes")
def backfill_resumes(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """
    Assign the primary resume to all jobs that don't have a resume_id set.
    This is a one-time operation to backfill existing jobs.

    For jobs that already have a match_score (were AI-scored), they should already
    have the best resume assigned. This endpoint only fills in jobs that somehow
    missed getting a resume_id during scoring or were never scored.
    """
    db, user = user_db

    # Get user's primary resume
    primary_resume = db.query(Resume).filter(
        Resume.user_id == user.id,
        Resume.is_primary == True
    ).first()

    if not primary_resume:
        # If no primary resume, try to get any resume
        any_resume = db.query(Resume).filter(
            Resume.user_id == user.id
        ).first()
        if not any_resume:
            return {
                "message": "No resumes found - please upload a resume first",
                "jobs_updated": 0,
                "total_without_resume": 0
            }
        primary_resume = any_resume

    # Find all jobs without a resume_id for this user
    jobs_without_resume = db.query(Job).filter(
        Job.user_id == user.id,
        Job.resume_id == None
    ).all()

    total_without = len(jobs_without_resume)
    updated = 0

    for job in jobs_without_resume:
        job.resume_id = primary_resume.id
        updated += 1

    db.commit()

    return {
        "message": f"Assigned resume '{primary_resume.original_filename}' to {updated} jobs",
        "jobs_updated": updated,
        "total_without_resume": total_without,
        "resume_used": {
            "id": primary_resume.id,
            "filename": primary_resume.original_filename,
            "is_primary": primary_resume.is_primary
        }
    }
