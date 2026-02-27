from fastapi import Depends
from sqlalchemy.orm import Session
from typing import Tuple

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
    user = db.query(User).filter(User.id == user_claims["id"]).first()
    if not user:
        user = User(
            id=user_claims["id"],
            email=user_claims["email"],
            full_name=user_claims.get("name", ""),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return (db, user)
