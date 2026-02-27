from pydantic import BaseModel, Field, field_validator, HttpUrl
from typing import Optional
from datetime import datetime, date
import re


# Input validation constants
MAX_TITLE_LENGTH = 500
MAX_DESCRIPTION_LENGTH = 50000
MAX_NOTES_LENGTH = 10000
MAX_URL_LENGTH = 2000
MAX_SHORT_TEXT_LENGTH = 500
MAX_LOCATION_LENGTH = 300


class JobBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=MAX_TITLE_LENGTH)
    company: str = Field(..., min_length=1, max_length=MAX_SHORT_TEXT_LENGTH)
    location: Optional[str] = Field(default="", max_length=MAX_LOCATION_LENGTH)
    remote_type: Optional[str] = Field(default="unknown", max_length=50)
    url: Optional[str] = Field(default="", max_length=MAX_URL_LENGTH)
    source: Optional[str] = Field(default="manual", max_length=100)
    description: Optional[str] = Field(default="", max_length=MAX_DESCRIPTION_LENGTH)
    salary_min: Optional[int] = Field(default=None, ge=0, le=100000000)
    salary_max: Optional[int] = Field(default=None, ge=0, le=100000000)
    salary_notes: Optional[str] = Field(default="", max_length=MAX_SHORT_TEXT_LENGTH)
    seniority_level: Optional[str] = Field(default="", max_length=100)
    employment_type: Optional[str] = Field(default="", max_length=100)
    status: Optional[str] = Field(default="new", max_length=50)
    applied: Optional[bool] = False
    applied_date: Optional[date] = None
    response_date: Optional[date] = None
    follow_up_date: Optional[date] = None
    priority: Optional[int] = Field(default=3, ge=1, le=5)
    why_this_company: Optional[str] = Field(default="", max_length=MAX_NOTES_LENGTH)
    company_notes: Optional[str] = Field(default="", max_length=MAX_NOTES_LENGTH)
    general_notes: Optional[str] = Field(default="", max_length=MAX_NOTES_LENGTH)
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    rejection_reason: Optional[str] = Field(default="", max_length=MAX_SHORT_TEXT_LENGTH)
    resume_id: Optional[int] = None
    match_score: Optional[int] = Field(default=None, ge=0, le=100)
    why_good_fit: Optional[str] = Field(default="", max_length=MAX_NOTES_LENGTH)
    missing_gaps: Optional[str] = Field(default="", max_length=MAX_NOTES_LENGTH)
    score_detail: Optional[str] = Field(default="", max_length=MAX_NOTES_LENGTH)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format if provided."""
        if not v:
            return v
        # Basic URL validation - must start with http:// or https://
        if v and not re.match(r"^https?://", v):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of the allowed values."""
        valid_statuses = ["new", "saved", "reviewing", "applied", "interviewing", "rejected", "offer", "archived"]
        if v and v not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=MAX_TITLE_LENGTH)
    company: Optional[str] = Field(default=None, min_length=1, max_length=MAX_SHORT_TEXT_LENGTH)
    location: Optional[str] = Field(default=None, max_length=MAX_LOCATION_LENGTH)
    remote_type: Optional[str] = Field(default=None, max_length=50)
    url: Optional[str] = Field(default=None, max_length=MAX_URL_LENGTH)
    source: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    salary_min: Optional[int] = Field(default=None, ge=0, le=100000000)
    salary_max: Optional[int] = Field(default=None, ge=0, le=100000000)
    salary_notes: Optional[str] = Field(default=None, max_length=MAX_SHORT_TEXT_LENGTH)
    seniority_level: Optional[str] = Field(default=None, max_length=100)
    employment_type: Optional[str] = Field(default=None, max_length=100)
    status: Optional[str] = Field(default=None, max_length=50)
    applied: Optional[bool] = None
    applied_date: Optional[date] = None
    response_date: Optional[date] = None
    follow_up_date: Optional[date] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    why_this_company: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    company_notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    general_notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    rejection_reason: Optional[str] = Field(default=None, max_length=MAX_SHORT_TEXT_LENGTH)
    resume_id: Optional[int] = None
    match_score: Optional[int] = Field(default=None, ge=0, le=100)
    why_good_fit: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    missing_gaps: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    score_detail: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate URL format if provided."""
        if not v:
            return v
        if not re.match(r"^https?://", v):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        """Validate status is one of the allowed values."""
        valid_statuses = ["new", "saved", "reviewing", "applied", "interviewing", "rejected", "offer", "archived"]
        if v and v not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v


class ResumeInfo(BaseModel):
    id: int
    original_filename: str
    is_primary: bool

    class Config:
        from_attributes = True


class JobResponse(JobBase):
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime
    resume: Optional[ResumeInfo] = None
    # Normalized location fields
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_country: Optional[str] = None
    is_remote: Optional[bool] = None
    is_hybrid: Optional[bool] = None

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    status: str


class JobActivityResponse(BaseModel):
    id: int
    job_id: int
    action: str
    detail: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
