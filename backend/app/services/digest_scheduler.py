"""
Digest scheduler - orchestrates sending email digests to users.

Runs daily at 8 AM UTC (after the nightly sync at 3 AM) and sends
digests to users based on their preferences:
- "daily" users get emails every day
- "weekly" users get emails on their preferred day
- "never" users are skipped

The scheduler queries jobs imported since the user's last_digest_sent
timestamp and filters by the user's minimum score threshold.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import SessionLocal
from app.models.user import User
from app.models.job import Job
from app.services.email_service import send_digest_email

logger = logging.getLogger(__name__)

# Day name to weekday number mapping (0=Monday, 6=Sunday)
DAY_MAP = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


def _get_user_prefs(user: User) -> dict:
    """Extract digest preferences from user, with defaults."""
    prefs = user.preferences or {}
    return {
        "email_digest": prefs.get("email_digest", "weekly"),
        "email_digest_min_score": prefs.get("email_digest_min_score", 60),
        "email_digest_day": prefs.get("email_digest_day", "monday").lower(),
    }


def _should_send_digest_today(user: User) -> bool:
    """
    Check if this user should receive a digest today.

    Returns True if:
    - User has email_digest="daily", OR
    - User has email_digest="weekly" and today is their preferred day
    """
    prefs = _get_user_prefs(user)
    digest_frequency = prefs["email_digest"]

    if digest_frequency == "never":
        return False

    if digest_frequency == "daily":
        return True

    if digest_frequency == "weekly":
        today_weekday = datetime.utcnow().weekday()
        preferred_day = DAY_MAP.get(prefs["email_digest_day"], 0)
        return today_weekday == preferred_day

    return False


def _get_digest_jobs(db: Session, user: User) -> list:
    """
    Get jobs to include in this user's digest.

    Returns jobs that:
    - Were created since the user's last digest (or last 7 days if no previous digest)
    - Have a match_score >= user's minimum threshold
    - Are not archived

    Jobs are sorted by match_score descending.
    """
    prefs = _get_user_prefs(user)
    min_score = prefs["email_digest_min_score"]

    # Determine cutoff date for job selection
    if user.last_digest_sent:
        cutoff = user.last_digest_sent
    else:
        # First digest - include jobs from last 7 days
        cutoff = datetime.utcnow() - timedelta(days=7)

    jobs = (
        db.query(Job)
        .filter(
            and_(
                Job.user_id == user.id,
                Job.created_at >= cutoff,
                Job.match_score != None,
                Job.match_score >= min_score,
                Job.status != "archived",
            )
        )
        .order_by(Job.match_score.desc())
        .limit(20)  # Cap at 20 jobs per digest
        .all()
    )

    return [
        {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "match_score": job.match_score,
        }
        for job in jobs
    ]


def run_digest_for_user(db: Session, user: User) -> bool:
    """
    Process and send a digest for a single user.

    Returns True if a digest was sent, False otherwise.
    """
    if not _should_send_digest_today(user):
        return False

    prefs = _get_user_prefs(user)
    period = prefs["email_digest"]

    jobs = _get_digest_jobs(db, user)

    if not jobs:
        logger.debug(f"No matching jobs for digest to {user.email}")
        # Still update last_digest_sent to avoid checking same jobs repeatedly
        user.last_digest_sent = datetime.utcnow()
        return False

    success = send_digest_email(
        user_email=user.email,
        user_id=user.id,
        jobs=jobs,
        period=period,
    )

    if success:
        user.last_digest_sent = datetime.utcnow()
        logger.info(f"Sent {period} digest to {user.email} with {len(jobs)} jobs")
        return True

    return False


def run_digest_for_all_users() -> dict:
    """
    Main entry point for the digest scheduler.
    Processes all users who should receive a digest today.

    Called daily at 8 AM UTC by APScheduler.

    Returns:
        dict with stats: {users_processed, digests_sent, errors}
    """
    logger.info("Starting digest job for all users")
    db = SessionLocal()

    stats = {
        "users_processed": 0,
        "digests_sent": 0,
        "errors": [],
    }

    try:
        # Query all active users who haven't opted out of digests
        users = (
            db.query(User)
            .filter(User.is_active == True)
            .all()
        )

        for user in users:
            try:
                prefs = _get_user_prefs(user)

                # Skip users who have opted out
                if prefs["email_digest"] == "never":
                    continue

                stats["users_processed"] += 1

                if run_digest_for_user(db, user):
                    stats["digests_sent"] += 1

            except Exception as e:
                logger.error(f"Error processing digest for user {user.id}: {e}")
                stats["errors"].append(f"User {user.id}: {str(e)}")

        db.commit()
        logger.info(
            f"Digest job completed: {stats['users_processed']} users processed, "
            f"{stats['digests_sent']} digests sent, {len(stats['errors'])} errors"
        )

    except Exception as e:
        logger.error(f"Digest job failed: {e}")
        stats["errors"].append(f"Fatal error: {str(e)}")

    finally:
        db.close()

    return stats


def send_test_digest(user_id: str) -> bool:
    """
    Send a test digest email to a specific user (for debugging/testing).
    Ignores the schedule and sends immediately with recent jobs.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found")
            return False

        prefs = _get_user_prefs(user)
        jobs = _get_digest_jobs(db, user)

        if not jobs:
            # For testing, get any scored jobs
            jobs = (
                db.query(Job)
                .filter(
                    and_(
                        Job.user_id == user.id,
                        Job.match_score != None,
                        Job.match_score >= prefs["email_digest_min_score"],
                    )
                )
                .order_by(Job.match_score.desc())
                .limit(5)
                .all()
            )
            jobs = [
                {
                    "id": job.id,
                    "title": job.title,
                    "company": job.company,
                    "location": job.location,
                    "match_score": job.match_score,
                }
                for job in jobs
            ]

        if not jobs:
            logger.warning(f"No jobs found for test digest to user {user_id}")
            return False

        return send_digest_email(
            user_email=user.email,
            user_id=user.id,
            jobs=jobs,
            period=prefs["email_digest"],
        )

    finally:
        db.close()
