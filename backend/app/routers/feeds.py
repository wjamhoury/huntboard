import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

from app.dependencies import get_user_db
from app.models.rss_feed import RssFeed
from app.models.job import Job
from app.models.user import User
from app.schemas.rss_feed import RssFeedCreate, RssFeedResponse, RefreshResult
from app.services.rss_parser import parse_feed, matches_keywords
from app.services.candidate_profile import should_exclude_title
from app.services.usage_tracker import track_event

router = APIRouter()

# Keywords to filter job listings
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

@router.get("", response_model=List[RssFeedResponse])
def get_feeds(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Get all RSS feeds for the current user. Returns empty list for new users."""
    db, user = user_db
    return db.query(RssFeed).filter(RssFeed.user_id == user.id).order_by(RssFeed.created_at.desc()).all()


@router.post("", response_model=RssFeedResponse)
def create_feed(feed: RssFeedCreate, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    # Check if URL already exists for this user
    existing = db.query(RssFeed).filter(
        RssFeed.url == feed.url,
        RssFeed.user_id == user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Feed with this URL already exists")

    db_feed = RssFeed(user_id=user.id, **feed.model_dump())
    db.add(db_feed)
    db.commit()
    db.refresh(db_feed)

    # Track usage event
    track_event(db, user.id, "source_added", {"source_type": "rss"})

    return db_feed


@router.delete("/{feed_id}")
def delete_feed(feed_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    feed = db.query(RssFeed).filter(RssFeed.id == feed_id, RssFeed.user_id == user.id).first()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")

    db.delete(feed)
    db.commit()
    return {"message": "Feed deleted successfully"}


@router.post("/reset")
def reset_feeds(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Delete all RSS feeds for this user."""
    db, user = user_db
    count = db.query(RssFeed).filter(RssFeed.user_id == user.id).count()
    db.query(RssFeed).filter(RssFeed.user_id == user.id).delete()
    db.commit()
    return {"message": f"Deleted {count} feeds."}


@router.post("/refresh", response_model=RefreshResult)
def refresh_feeds(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Fetch all active feeds and create new jobs from entries."""
    db, user = user_db

    feeds = db.query(RssFeed).filter(
        RssFeed.is_active == True,
        RssFeed.user_id == user.id
    ).all()

    feeds_processed = 0
    new_jobs_added = 0
    skipped_no_match = 0
    errors = []

    # Get all existing job URLs for this user to avoid duplicates
    existing_urls = set(
        url[0] for url in db.query(Job.url).filter(
            Job.url != "",
            Job.user_id == user.id
        ).all()
    )

    for feed in feeds:
        try:
            jobs_data = parse_feed(feed.url, feed.name)
            feeds_processed += 1

            for job_data in jobs_data:
                # Skip if URL already exists
                if job_data.get("url") and job_data["url"] in existing_urls:
                    continue

                # Check keyword filter
                if not matches_keywords(job_data, JOB_KEYWORDS):
                    skipped_no_match += 1
                    continue

                # Apply negative title filter
                if should_exclude_title(job_data.get("title", "")):
                    skipped_no_match += 1
                    continue

                # Create new job with user_id
                db_job = Job(user_id=user.id, **job_data)
                db.add(db_job)
                existing_urls.add(job_data.get("url", ""))
                new_jobs_added += 1

            # Update last_fetched timestamp
            feed.last_fetched = datetime.now()

        except Exception as e:
            logger.error(f"Feed sync error for {feed.name}: {e}")
            errors.append(f"Could not reach {feed.name}. It will be retried on the next sync.")

    db.commit()

    return RefreshResult(
        feeds_processed=feeds_processed,
        new_jobs_added=new_jobs_added,
        errors=errors
    )


@router.patch("/{feed_id}/toggle", response_model=RssFeedResponse)
def toggle_feed(feed_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Toggle a feed's active status."""
    db, user = user_db
    feed = db.query(RssFeed).filter(RssFeed.id == feed_id, RssFeed.user_id == user.id).first()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")

    feed.is_active = not feed.is_active
    db.commit()
    db.refresh(feed)
    return feed
