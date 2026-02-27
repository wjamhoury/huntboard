from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import re


# Input validation constants
MAX_NAME_LENGTH = 200
MAX_URL_LENGTH = 2000


class RssFeedBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=MAX_NAME_LENGTH)
    url: str = Field(..., min_length=1, max_length=MAX_URL_LENGTH)
    is_active: Optional[bool] = True

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate RSS feed URL format."""
        if not v:
            raise ValueError("URL is required")
        if not re.match(r"^https?://", v):
            raise ValueError("URL must start with http:// or https://")
        return v


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
