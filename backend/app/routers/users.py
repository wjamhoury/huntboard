"""
Users router - user profile management.
"""
import logging
import os
from typing import Tuple, Optional
from fastapi import APIRouter, Depends, Response, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.dependencies import get_user_db
from app.database import SessionLocal
from app.models.user import User
from app.models.resume import Resume
from app.schemas.user import UserResponse, UserUpdate
from app.services import storage
from app.services.email_service import verify_unsubscribe_token

logger = logging.getLogger(__name__)
router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://huntboard.app")


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Get the current user's profile."""
    db, user = user_db
    return user


@router.patch("/me", response_model=UserResponse)
def update_current_user_profile(
    updates: UserUpdate,
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """Update the current user's profile."""
    db, user = user_db

    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/me", status_code=204)
def delete_current_user_account(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """
    Delete the current user's account and all associated data.
    This deletes:
    - All jobs
    - All resumes (including S3 files)
    - All RSS feeds
    - All company feeds
    - All batch runs
    - The user record itself

    This action is irreversible.
    """
    db, user = user_db

    # Delete resume files from S3 before deleting DB records
    resumes = db.query(Resume).filter(Resume.user_id == user.id).all()
    for resume in resumes:
        try:
            if resume.s3_key:
                storage.delete_resume(resume.s3_key)
        except Exception as e:
            logger.warning(f"Failed to delete S3 file {resume.s3_key}: {e}")

    # Delete user record - cascade delete handles jobs, resumes, feeds, etc.
    db.delete(user)
    db.commit()

    return Response(status_code=204)


@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_from_digest(token: str = Query(..., description="Unsubscribe token")):
    """
    Unsubscribe a user from email digests via token link.

    This endpoint is accessed via links in digest emails.
    It does not require authentication - the signed token validates the request.

    Sets the user's email_digest preference to "never".
    """
    user_id = verify_unsubscribe_token(token)

    if not user_id:
        return HTMLResponse(
            content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invalid Link - HuntBoard</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }}
                    .container {{ max-width: 500px; margin: 60px auto; background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
                    h1 {{ color: #dc2626; font-size: 24px; margin-bottom: 16px; }}
                    p {{ color: #6b7280; line-height: 1.6; }}
                    a {{ color: #2563eb; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Invalid or Expired Link</h1>
                    <p>This unsubscribe link is invalid or has expired.</p>
                    <p>You can manage your email preferences in <a href="{FRONTEND_URL}/settings#notifications">Settings</a>.</p>
                </div>
            </body>
            </html>
            """,
            status_code=400,
        )

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            return HTMLResponse(
                content=f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Account Not Found - HuntBoard</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }}
                        .container {{ max-width: 500px; margin: 60px auto; background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
                        h1 {{ color: #dc2626; font-size: 24px; margin-bottom: 16px; }}
                        p {{ color: #6b7280; line-height: 1.6; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Account Not Found</h1>
                        <p>We couldn't find an account associated with this unsubscribe link.</p>
                    </div>
                </body>
                </html>
                """,
                status_code=404,
            )

        # Update user preferences to disable digest
        prefs = user.preferences or {}
        prefs["email_digest"] = "never"
        user.preferences = prefs
        db.commit()

        logger.info(f"User {user.email} unsubscribed from email digests")

        return HTMLResponse(
            content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Unsubscribed - HuntBoard</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }}
                    .container {{ max-width: 500px; margin: 60px auto; background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
                    h1 {{ color: #10b981; font-size: 24px; margin-bottom: 16px; }}
                    p {{ color: #6b7280; line-height: 1.6; margin-bottom: 24px; }}
                    .btn {{ display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>You've Been Unsubscribed</h1>
                    <p>You will no longer receive email digests from HuntBoard.</p>
                    <p>You can re-enable them anytime in your settings.</p>
                    <a href="{FRONTEND_URL}/settings#notifications" class="btn">Manage Preferences</a>
                </div>
            </body>
            </html>
            """,
            status_code=200,
        )

    finally:
        db.close()
