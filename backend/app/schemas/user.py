from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import re


# Input validation constants
MAX_NAME_LENGTH = 200
MAX_EMAIL_LENGTH = 320
MAX_URL_LENGTH = 2000
MAX_JOB_TITLE_LENGTH = 100
MAX_TARGET_TITLES = 10


class UserPreferences(BaseModel):
    """User preferences schema."""
    default_sort: Optional[str] = Field(default="date_desc", max_length=50)
    auto_archive_days: Optional[int] = Field(default=30, ge=0, le=365)
    auto_archive_min_score: Optional[int] = Field(default=0, ge=0, le=100)
    # Email digest preferences
    email_digest: Optional[str] = Field(default="weekly", max_length=20)
    email_digest_min_score: Optional[int] = Field(default=60, ge=0, le=100)
    email_digest_day: Optional[str] = Field(default="monday", max_length=20)

    @field_validator("default_sort")
    @classmethod
    def validate_default_sort(cls, v: Optional[str]) -> Optional[str]:
        valid_sorts = ["score_desc", "score_asc", "date_desc", "date_asc", "company_asc"]
        if v and v not in valid_sorts:
            raise ValueError(f"default_sort must be one of: {', '.join(valid_sorts)}")
        return v

    @field_validator("email_digest")
    @classmethod
    def validate_email_digest(cls, v: Optional[str]) -> Optional[str]:
        valid_options = ["daily", "weekly", "never"]
        if v and v not in valid_options:
            raise ValueError(f"email_digest must be one of: {', '.join(valid_options)}")
        return v

    @field_validator("email_digest_day")
    @classmethod
    def validate_email_digest_day(cls, v: Optional[str]) -> Optional[str]:
        valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        if v and v.lower() not in valid_days:
            raise ValueError(f"email_digest_day must be one of: {', '.join(valid_days)}")
        return v.lower() if v else v


class UserBase(BaseModel):
    email: str = Field(..., max_length=MAX_EMAIL_LENGTH)
    full_name: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    avatar_url: Optional[str] = Field(default=None, max_length=MAX_URL_LENGTH)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Basic email validation."""
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise ValueError("Invalid email format")
        return v.lower()


class UserCreate(UserBase):
    id: str = Field(..., min_length=1, max_length=100)  # Cognito sub UUID


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_complete: bool
    preferences: Optional[Dict[str, Any]] = None
    target_job_titles: Optional[List[str]] = None
    created_at: datetime
    last_digest_sent: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    avatar_url: Optional[str] = Field(default=None, max_length=MAX_URL_LENGTH)
    onboarding_complete: Optional[bool] = None
    preferences: Optional[Dict[str, Any]] = None
    target_job_titles: Optional[List[str]] = None

    @field_validator("target_job_titles")
    @classmethod
    def validate_target_job_titles(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate target job titles list."""
        if v is None:
            return v
        if len(v) > MAX_TARGET_TITLES:
            raise ValueError(f"Maximum {MAX_TARGET_TITLES} target job titles allowed")
        validated = []
        for title in v:
            if not title or not title.strip():
                continue
            title = title.strip()
            if len(title) > MAX_JOB_TITLE_LENGTH:
                raise ValueError(f"Job title must be at most {MAX_JOB_TITLE_LENGTH} characters")
            validated.append(title)
        return validated
