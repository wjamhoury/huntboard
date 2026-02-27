"""
Scheduler module - owns the APScheduler BackgroundScheduler instance.
Imported by main.py (to start/stop) and batch.py (to query/modify jobs).

Uses persistent config in /app/data/schedule_config.json and includes
self-healing logic to re-register the nightly_sync job if it goes missing.
"""
import logging
import os
import json
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "schedule_config.json")

scheduler = BackgroundScheduler(
    job_defaults={
        'misfire_grace_time': 3600,
        'coalesce': True,
    }
)


def _load_config() -> dict:
    """Load persisted schedule config, falling back to env vars."""
    defaults = {
        "hour": int(os.getenv("NIGHTLY_SYNC_HOUR", "3")),
        "enabled": os.getenv("NIGHTLY_SYNC_ENABLED", "true").lower() == "true",
    }
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r") as f:
                saved = json.load(f)
            defaults.update(saved)
    except Exception as e:
        logger.warning(f"Could not load schedule config: {e}")
    return defaults


def _save_config(config: dict):
    """Persist schedule config to JSON file in data/ directory."""
    try:
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
        with open(CONFIG_PATH, "w") as f:
            json.dump(config, f)
    except Exception as e:
        logger.warning(f"Could not save schedule config: {e}")


def _ensure_job_exists():
    """
    Re-register the nightly_sync job if it's missing from the scheduler.
    This handles the case where the in-memory job store lost the job
    (e.g. after a uvicorn reload or unexpected restart).
    """
    from app.services.nightly_sync import run_nightly_sync

    job = scheduler.get_job("nightly_sync")
    if job is not None:
        return job

    config = _load_config()
    sync_hour = config["hour"]
    sync_enabled = config["enabled"]

    logger.info(f"Re-registering missing nightly_sync job (hour={sync_hour}, enabled={sync_enabled})")
    scheduler.add_job(
        run_nightly_sync,
        CronTrigger(hour=sync_hour, minute=0),
        id="nightly_sync",
        name="Nightly job import and scoring",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    if not sync_enabled:
        scheduler.pause_job("nightly_sync")

    return scheduler.get_job("nightly_sync")


def setup_scheduler():
    """Configure and start the nightly sync scheduler and email digest scheduler."""
    from app.services.nightly_sync import run_nightly_sync
    from app.services.digest_scheduler import run_digest_for_all_users

    config = _load_config()
    sync_hour = config["hour"]
    sync_enabled = config["enabled"]

    # Always add the job so get_job("nightly_sync") works for the API
    scheduler.add_job(
        run_nightly_sync,
        CronTrigger(hour=sync_hour, minute=0),
        id="nightly_sync",
        name="Nightly job import and scoring",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    if sync_enabled:
        logger.info(f"Nightly sync scheduled for {sync_hour}:00 (with 1hr grace period)")
    else:
        scheduler.pause_job("nightly_sync")
        logger.info("Nightly sync is disabled (job paused)")

    # Add email digest job - runs daily at 8 AM UTC (after nightly sync)
    # This sends digests to users based on their preferences (daily/weekly)
    scheduler.add_job(
        run_digest_for_all_users,
        CronTrigger(hour=8, minute=0),  # 8 AM UTC
        id="email_digest",
        name="Email digest sender",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    logger.info("Email digest scheduled for 8:00 UTC daily")

    scheduler.start()
