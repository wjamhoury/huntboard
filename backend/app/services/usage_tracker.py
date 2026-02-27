"""
Lightweight usage tracking service for analytics.
Privacy-respecting - logs events without PII, just user_id and action.
Non-blocking - uses background commits to avoid slowing down requests.
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models.usage_event import UsageEvent

logger = logging.getLogger(__name__)


def track_event(
    db: Session,
    user_id: str,
    event: str,
    event_data: Optional[dict] = None
) -> None:
    """
    Track a usage event. Non-blocking, fails silently on error.

    Events tracked:
    - user_login: User authenticated successfully
    - job_created: Manual job creation
    - job_triaged: Job swiped in triage (event_data: {"direction": "right|left|up"})
    - sync_completed: Nightly sync finished (event_data: {"jobs_added": N, "jobs_scored": N})
    - resume_uploaded: Resume uploaded
    - source_added: Feed/company source added (event_data: {"source_type": "rss|greenhouse|workday|lever"})
    - onboarding_completed: User finished onboarding
    """
    try:
        usage_event = UsageEvent(
            user_id=user_id,
            event=event,
            event_data=event_data
        )
        db.add(usage_event)
        db.commit()
    except Exception as e:
        # Don't let tracking failures affect the user's request
        logger.warning(f"Failed to track event {event} for user {user_id}: {e}")
        db.rollback()


def track_event_async(db: Session, user_id: str, event: str, event_data: Optional[dict] = None) -> None:
    """
    Alias for track_event - for semantic clarity when called in async contexts.
    The actual insert is still synchronous but designed to be fast.
    """
    track_event(db, user_id, event, event_data)
