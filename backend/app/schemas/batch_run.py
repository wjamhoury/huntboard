from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BatchRunResponse(BaseModel):
    id: int
    run_type: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    jobs_imported: int
    jobs_scored: int
    tokens_used: int
    errors: str  # JSON array as string

    class Config:
        from_attributes = True


class BatchRunListResponse(BaseModel):
    runs: List[BatchRunResponse]
    total: int


class BatchTriggerResponse(BaseModel):
    message: str
    run_id: int


class BatchStatusResponse(BaseModel):
    is_running: bool
    current_run_id: Optional[int] = None
    started_at: Optional[datetime] = None


class ScoreJobsRequest(BaseModel):
    job_ids: Optional[List[int]] = None  # If None, score all unscored new jobs


class ScoreJobsResponse(BaseModel):
    message: str
    jobs_to_score: int
