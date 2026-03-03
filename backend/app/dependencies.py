from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Tuple
from datetime import datetime, timezone

from app.database import get_db
from app.models.user import User
from app.auth import get_current_user

# Dev user constants for local testing (used when AUTH_DEV_MODE=true)
DEV_USER_ID = "00000000-0000-0000-0000-000000000001"
DEV_USER_EMAIL = "dev@huntboard.app"


async def get_user_db(
    db: Session = Depends(get_db),
    user_claims: dict = Depends(get_current_user)
) -> Tuple[Session, User]:
    """
    Combined dependency that returns both the database session and current user.
    Auto-creates User record on first login.

    Usage:
        @router.get("/items")
        async def list_items(user_db: Tuple[Session, User] = Depends(get_user_db)):
            db, user = user_db
            items = db.query(Item).filter(Item.user_id == user.id).all()
            return items
    """
    from app.services.usage_tracker import track_event

    user = db.query(User).filter(User.id == user_claims["id"]).first()
    is_new_user = False
    if not user:
        # Validate email before creating user - empty email indicates wrong token type
        email = user_claims.get("email", "")
        if not email:
            raise HTTPException(
                status_code=401,
                detail="Email not found in authentication token. Please log out and log in again."
            )

        is_new_user = True
        user = User(
            id=user_claims["id"],
            email=email,
            full_name=user_claims.get("name", ""),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Track login event (only once per session, based on last_login)
    # If last_login was more than 30 minutes ago, count this as a new login
    now = datetime.now(timezone.utc)
    should_track = is_new_user or not user.last_login
    if not should_track and user.last_login:
        # Make sure last_login is timezone-aware for comparison
        last_login = user.last_login
        if last_login.tzinfo is None:
            last_login = last_login.replace(tzinfo=timezone.utc)
        should_track = (now - last_login).total_seconds() > 1800

    if should_track:
        track_event(db, user.id, "user_login", {"new_user": is_new_user})
        user.last_login = now
        db.commit()

    return (db, user)
