from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class JobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = ""
    remote_type: Optional[str] = "unknown"
    url: Optional[str] = ""
    source: Optional[str] = "manual"
    description: Optional[str] = ""
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_notes: Optional[str] = ""
    seniority_level: Optional[str] = ""
    employment_type: Optional[str] = ""
    status: Optional[str] = "new"
    applied: Optional[bool] = False
    applied_date: Optional[date] = None
    response_date: Optional[date] = None
    follow_up_date: Optional[date] = None
    priority: Optional[int] = 3
    why_this_company: Optional[str] = ""
    company_notes: Optional[str] = ""
    general_notes: Optional[str] = ""
    notes: Optional[str] = None
    rejection_reason: Optional[str] = ""
    resume_id: Optional[int] = None
    match_score: Optional[int] = None
    why_good_fit: Optional[str] = ""
    missing_gaps: Optional[str] = ""
    score_detail: Optional[str] = ""


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_notes: Optional[str] = None
    seniority_level: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[str] = None
    applied: Optional[bool] = None
    applied_date: Optional[date] = None
    response_date: Optional[date] = None
    follow_up_date: Optional[date] = None
    priority: Optional[int] = None
    why_this_company: Optional[str] = None
    company_notes: Optional[str] = None
    general_notes: Optional[str] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    resume_id: Optional[int] = None
    match_score: Optional[int] = None
    why_good_fit: Optional[str] = None
    missing_gaps: Optional[str] = None
    score_detail: Optional[str] = None


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
