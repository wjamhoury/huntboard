from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RssFeedBase(BaseModel):
    name: str
    url: str
    is_active: Optional[bool] = True


class RssFeedCreate(RssFeedBase):
    pass


class RssFeedResponse(RssFeedBase):
    id: int
    last_fetched: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RefreshResult(BaseModel):
    feeds_processed: int
    new_jobs_added: int
    errors: list[str]
