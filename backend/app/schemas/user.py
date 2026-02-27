from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class UserPreferences(BaseModel):
    """User preferences schema."""
    default_sort: Optional[str] = "date_desc"  # score_desc, score_asc, date_desc, date_asc, company_asc
    auto_archive_days: Optional[int] = 30  # Days after which to auto-archive (0 = disabled)
    auto_archive_min_score: Optional[int] = 0  # Minimum score to auto-archive (0 = disabled)
    # Email digest preferences
    email_digest: Optional[str] = "weekly"  # "daily", "weekly", "never"
    email_digest_min_score: Optional[int] = 60  # Only include jobs scoring above this
    email_digest_day: Optional[str] = "monday"  # For weekly: which day to send


class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    id: str  # Cognito sub UUID


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_complete: bool
    preferences: Optional[Dict[str, Any]] = None
    created_at: datetime
    last_digest_sent: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_complete: Optional[bool] = None
    preferences: Optional[Dict[str, Any]] = None
