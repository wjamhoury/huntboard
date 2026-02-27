"""
Nightly sync orchestrator - imports jobs from all sources and scores them.
Now includes: RSS, Greenhouse, Workday, Lever, Google Jobs (SerpAPI).
Uses hybrid scoring (deterministic + AI) on a 0-100 scale.
Only surfaces jobs scoring >= 75 (MIN_MATCH_SCORE).

Multi-tenant support: All operations are scoped to a specific user_id.
"""
import json
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.database import SessionLocal
from app.models.job import Job
from app.models.resume import Resume
from app.models.rss_feed import RssFeed
from app.models.company_feed import CompanyFeed
from app.models.batch_run import BatchRun
from app.services.rss_parser import parse_feed, matches_keywords
from app.services.greenhouse_scraper import fetch_greenhouse_jobs
from app.services.workday_scraper import fetch_workday_jobs
from app.services.lever_scraper import fetch_lever_jobs
from app.services.claude_client import score_job_match
from app.services.candidate_profile import should_exclude_title


# Keywords to filter RSS job listings (broader than title match since RSS has less structure)
JOB_KEYWORDS = [
    "solutions engineer",
    "sales engineer",
    "pre-sales",
    "presales",
    "technical enablement",
    "partner enablement",
    "partner solutions",
    "security",
    "cybersecurity",
    "customer engineer",
    "field engineer",
    "solutions architect",
    "technical account manager",
    "sales enablement",
    "customer success architect",
    "demo engineer",
]

# Minimum match score to keep a job (0-100 scale)
MIN_MATCH_SCORE = 75

# Global flag to prevent concurrent runs
_is_running = False
_current_run_id: Optional[int] = None


def is_sync_running() -> tuple[bool, Optional[int]]:
    """Check if a sync is currently running."""
    return _is_running, _current_run_id


def run_nightly_sync(run_type: str = "nightly_sync", user_id: Optional[str] = None) -> int:
    """
    Main sync function - imports all jobs, scores them, and filters by quality.
    Returns the batch_run ID.

    If user_id is provided, runs for that specific user.
    If user_id is None, this is a legacy call (scheduler) - skips sync.
    """
    global _is_running, _current_run_id

    if _is_running:
        logger.info("Sync already in progress, skipping...")
        return _current_run_id

    if not user_id:
        logger.warning("No user_id provided for sync - skipping (multi-tenant mode)")
        return 0

    _is_running = True
    db = SessionLocal()

    try:
        # Create batch run record with user_id
        batch_run = BatchRun(user_id=user_id, run_type=run_type, status="running")
        db.add(batch_run)
        db.commit()
        db.refresh(batch_run)
        _current_run_id = batch_run.id

        logger.info(f"Starting {run_type} for user {user_id} (run #{batch_run.id})")

        errors = []
        jobs_imported = 0
        jobs_scored = 0
        jobs_filtered_out = 0
        total_tokens = 0

        # Step 1: Import from RSS feeds
        logger.info("Step 1: Importing jobs from RSS feeds")
        rss_imported, rss_errors = _import_rss_jobs(db, user_id)
        jobs_imported += rss_imported
        errors.extend(rss_errors)

        # Step 2: Import from company feeds (Greenhouse/Workday - user-configured)
        logger.info("Step 2: Importing jobs from configured company feeds")
        company_imported, company_errors = _import_company_jobs(db, user_id)
        jobs_imported += company_imported
        errors.extend(company_errors)

        # Step 3: Import from Lever boards
        logger.info("Step 3: Importing jobs from Lever boards")
        lever_imported, lever_errors = _import_lever_jobs(db, user_id)
        jobs_imported += lever_imported
        errors.extend(lever_errors)

        # Step 4: Import from Google Jobs (SerpAPI)
        logger.info("Step 4: Importing jobs from Google Jobs")
        google_imported, google_errors = _import_google_jobs(db, user_id)
        jobs_imported += google_imported
        errors.extend(google_errors)

        db.commit()
        logger.info(f"Imported {jobs_imported} new jobs from all sources")

        # Step 5: Score unscored jobs with hybrid scoring
        logger.info("Step 5: Scoring new jobs with hybrid matching")
        scored, filtered, tokens, score_errors = _score_unscored_jobs(db, user_id)
        jobs_scored = scored
        jobs_filtered_out = filtered
        total_tokens = tokens
        errors.extend(score_errors)

        db.commit()
        logger.info(f"Scored {jobs_scored} jobs, filtered out {jobs_filtered_out} (below {MIN_MATCH_SCORE}), used {total_tokens} tokens")

        # Update batch run record
        batch_run.status = "completed"
        batch_run.completed_at = datetime.now()
        batch_run.jobs_imported = jobs_imported
        batch_run.jobs_scored = jobs_scored
        batch_run.tokens_used = total_tokens
        batch_run.errors = json.dumps(errors)
        db.commit()

        logger.info(f"Sync completed. Imported: {jobs_imported}, Scored: {jobs_scored}, Filtered: {jobs_filtered_out}")
        return batch_run.id

    except Exception as e:
        logger.error(f"Nightly sync failed: {e}")
        try:
            batch_run.status = "failed"
            batch_run.completed_at = datetime.now()
            batch_run.errors = json.dumps([str(e)])
            db.commit()
        except:
            pass
        raise
    finally:
        _is_running = False
        _current_run_id = None
        db.close()


def _get_existing_urls(db: Session, user_id: str) -> set:
    """Get all existing job URLs for a user to avoid duplicates."""
    return set(
        url[0] for url in db.query(Job.url).filter(
            Job.user_id == user_id,
            Job.url != "",
            Job.url != None
        ).all()
    )


def _import_rss_jobs(db: Session, user_id: str) -> tuple[int, list[str]]:
    """Import jobs from all active RSS feeds for a user."""
    feeds = db.query(RssFeed).filter(
        RssFeed.is_active == True,
        RssFeed.user_id == user_id
    ).all()
    jobs_added = 0
    errors = []
    existing_urls = _get_existing_urls(db, user_id)

    for feed in feeds:
        try:
            jobs_data = parse_feed(feed.url, feed.name)

            for job_data in jobs_data:
                if job_data.get("url") and job_data["url"] in existing_urls:
                    continue

                if not matches_keywords(job_data, JOB_KEYWORDS):
                    continue

                # Apply negative title filter
                if should_exclude_title(job_data.get("title", "")):
                    continue

                db_job = Job(user_id=user_id, **job_data)
                db.add(db_job)
                existing_urls.add(job_data.get("url", ""))
                jobs_added += 1

            feed.last_fetched = datetime.now()

        except Exception as e:
            logger.error(f"RSS feed sync error for {feed.name}: {e}")
            errors.append(f"Could not reach {feed.name}. It will be retried on the next sync.")

    return jobs_added, errors


def _import_company_jobs(db: Session, user_id: str) -> tuple[int, list[str]]:
    """Import jobs from all active company feeds (Greenhouse/Workday) for a user."""
    companies = db.query(CompanyFeed).filter(
        CompanyFeed.is_active == True,
        CompanyFeed.user_id == user_id
    ).all()
    jobs_added = 0
    errors = []
    existing_urls = _get_existing_urls(db, user_id)

    for company in companies:
        try:
            if company.feed_type == "greenhouse" and company.greenhouse_board_token:
                jobs_data = fetch_greenhouse_jobs(
                    company.greenhouse_board_token,
                    company.company_name
                )
            elif company.feed_type == "workday" and company.workday_url:
                jobs_data = fetch_workday_jobs(
                    company.workday_url,
                    company.company_name
                )
            else:
                continue

            for job_data in jobs_data:
                if job_data.get("url") and job_data["url"] in existing_urls:
                    continue

                # Apply negative title filter
                if should_exclude_title(job_data.get("title", "")):
                    continue

                db_job = Job(user_id=user_id, **job_data)
                db.add(db_job)
                existing_urls.add(job_data.get("url", ""))
                jobs_added += 1

            company.last_fetched = datetime.now()

        except Exception as e:
            logger.error(f"Company feed sync error for {company.company_name}: {e}")
            errors.append(f"Could not reach {company.company_name}. It will be retried on the next sync.")

    return jobs_added, errors


def _import_lever_jobs(db: Session, user_id: str) -> tuple[int, list[str]]:
    """Import jobs from Lever boards configured by the user."""
    # Query user's Lever company feeds
    lever_feeds = db.query(CompanyFeed).filter(
        CompanyFeed.is_active == True,
        CompanyFeed.user_id == user_id,
        CompanyFeed.feed_type == "lever",
        CompanyFeed.lever_slug != None
    ).all()

    jobs_added = 0
    errors = []
    existing_urls = _get_existing_urls(db, user_id)

    for company in lever_feeds:
        try:
            jobs_data = fetch_lever_jobs(
                company.lever_slug,
                company.company_name
            )

            for job_data in jobs_data:
                if job_data.get("url") and job_data["url"] in existing_urls:
                    continue

                # Apply negative title filter
                if should_exclude_title(job_data.get("title", "")):
                    continue

                db_job = Job(user_id=user_id, **job_data)
                db.add(db_job)
                existing_urls.add(job_data.get("url", ""))
                jobs_added += 1

            # Update last_fetched timestamp
            company.last_fetched = datetime.now()

        except Exception as e:
            logger.error(f"Lever feed sync error for {company.company_name}: {e}")
            errors.append(f"Could not reach {company.company_name}. It will be retried on the next sync.")

    return jobs_added, errors


def _import_google_jobs(db: Session, user_id: str) -> tuple[int, list[str]]:
    """Import jobs from Google Jobs as a standalone source."""
    jobs_added = 0
    errors = []
    existing_urls = _get_existing_urls(db, user_id)

    try:
        import asyncio
        from app.services.google_jobs_scraper import scrape_google_jobs, GOOGLE_JOBS_QUERIES

        async def _run_google():
            all_jobs = []
            for q in GOOGLE_JOBS_QUERIES:
                jobs = await scrape_google_jobs(q, max_results=15)
                all_jobs.extend(jobs)
            return all_jobs

        try:
            google_jobs = asyncio.run(_run_google())
        except RuntimeError:
            # If event loop already running, use nest_asyncio or create new loop
            loop = asyncio.new_event_loop()
            google_jobs = loop.run_until_complete(_run_google())
            loop.close()

        for job_data in google_jobs:
            url = job_data.get("url", "")
            title = job_data.get("title", "")

            if url and url in existing_urls:
                continue

            if should_exclude_title(title):
                continue

            db_job = Job(user_id=user_id, **job_data)
            db.add(db_job)
            if url:
                existing_urls.add(url)
            jobs_added += 1

    except ImportError as e:
        logger.error(f"Google Jobs import error: {e}")
        errors.append("Google Jobs: missing required dependency")
    except Exception as e:
        logger.error(f"Google Jobs sync error: {e}")
        errors.append("Could not reach Google Jobs. It will be retried on the next sync.")

    return jobs_added, errors


def _score_unscored_jobs(db: Session, user_id: str, limit: int = 200) -> tuple[int, int, int, list[str]]:
    """
    Score jobs using hybrid matching (deterministic + AI).
    Archives low-scoring auto-imported jobs (never user-created jobs).

    Auto-archive rules:
    - NEVER archive manual jobs (source = "manual")
    - NEVER archive URL-imported jobs (source = "import_url")
    - NEVER archive jobs with status "applied", "interviewing", or "offer"
    - Only archive auto-imported jobs that are "new" or "reviewing" AND score below MIN_MATCH_SCORE

    Returns: (jobs_scored, jobs_filtered_out, tokens_used, errors)
    """
    # Statuses that should never be auto-archived (user is actively tracking)
    PROTECTED_STATUSES = {"applied", "interviewing", "offer"}

    resumes = db.query(Resume).filter(Resume.user_id == user_id).all()
    if not resumes:
        return 0, 0, 0, ["No resumes uploaded - cannot score jobs"]

    resume_data = [
        {"id": r.id, "name": r.original_filename, "text": r.extracted_text or ""}
        for r in resumes
    ]

    unscored_jobs = db.query(Job).filter(
        Job.user_id == user_id,
        Job.match_score == None,
        Job.status == "new",
        Job.description != "",
        Job.description != None
    ).limit(limit).all()

    jobs_scored = 0
    jobs_filtered = 0
    total_tokens = 0
    errors = []

    for job in unscored_jobs:
        try:
            result = score_job_match(
                job_title=job.title,
                job_company=job.company,
                job_description=job.description or "",
                resumes=resume_data,
                location=job.location or "",
                remote_type=job.remote_type or "unknown",
            )

            if result:
                job.match_score = result["score"]
                job.resume_id = result.get("resume_id")
                job.why_good_fit = json.dumps(result.get("why_good_fit", []))
                job.missing_gaps = json.dumps(result.get("missing_gaps", []))
                job.score_detail = json.dumps(result.get("detail", {}))
                job.general_notes = f"AI Analysis: {result.get('reason', '')}"
                job.scored_at = datetime.now()
                total_tokens += result.get("tokens_used", 0)
                jobs_scored += 1

                # Auto-archive low-scoring jobs, but with protections:
                # 1. Never archive manual jobs (user intentionally added them)
                # 2. Never archive import_url jobs (user intentionally imported them)
                # 3. Never archive jobs in protected statuses (user is actively tracking)
                # 4. Only archive auto-imported jobs in "new" or "reviewing" status
                should_archive = (
                    result["score"] < MIN_MATCH_SCORE
                    and job.source not in ("manual", "import_url")
                    and job.status not in PROTECTED_STATUSES
                    and job.status in ("new", "reviewing")
                )

                if should_archive:
                    job.status = "archived"
                    jobs_filtered += 1
                elif result["score"] >= MIN_MATCH_SCORE:
                    # Set priority based on score for high-scoring jobs
                    if result["score"] >= 90:
                        job.priority = 1
                    elif result["score"] >= 80:
                        job.priority = 2
                    else:
                        job.priority = 3

        except Exception as e:
            logger.error(f"Error scoring job {job.id}: {e}")
            errors.append("AI scoring is temporarily unavailable. Some jobs will be scored on the next sync.")

    return jobs_scored, jobs_filtered, total_tokens, errors
