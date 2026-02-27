from pydantic import BaseModel, Field, model_validator, field_validator
from typing import Optional
from datetime import datetime
import re


# Input validation constants
MAX_COMPANY_NAME_LENGTH = 200
MAX_SLUG_LENGTH = 100
MAX_URL_LENGTH = 2000


class CompanyFeedBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=MAX_COMPANY_NAME_LENGTH)
    feed_type: str = Field(default="greenhouse", max_length=50)  # "greenhouse", "workday", or "lever"
    greenhouse_board_token: Optional[str] = Field(default=None, max_length=MAX_SLUG_LENGTH)
    workday_url: Optional[str] = Field(default=None, max_length=MAX_URL_LENGTH)
    lever_slug: Optional[str] = Field(default=None, max_length=MAX_SLUG_LENGTH)
    is_active: Optional[bool] = True

    @field_validator("greenhouse_board_token", "lever_slug")
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        """Validate slug contains only alphanumeric characters and hyphens."""
        if v and not re.match(r"^[a-zA-Z0-9-]+$", v):
            raise ValueError("Slug must contain only alphanumeric characters and hyphens")
        return v

    @field_validator("workday_url")
    @classmethod
    def validate_workday_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate Workday URL format."""
        if v and not re.match(r"^https?://", v):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("feed_type")
    @classmethod
    def validate_feed_type(cls, v: str) -> str:
        """Validate feed type is one of the allowed values."""
        valid_types = ["greenhouse", "workday", "lever"]
        if v not in valid_types:
            raise ValueError(f"feed_type must be one of: {', '.join(valid_types)}")
        return v

    @model_validator(mode='after')
    def validate_feed_config(self):
        if self.feed_type == "greenhouse" and not self.greenhouse_board_token:
            raise ValueError("greenhouse_board_token is required for Greenhouse feeds")
        if self.feed_type == "workday" and not self.workday_url:
            raise ValueError("workday_url is required for Workday feeds")
        if self.feed_type == "lever" and not self.lever_slug:
            raise ValueError("lever_slug is required for Lever feeds")
        return self


class CompanyFeedCreate(CompanyFeedBase):
    pass


class CompanyFeedResponse(CompanyFeedBase):
    id: int
    last_fetched: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompanyRefreshResult(BaseModel):
    companies_processed: int
    new_jobs_added: int
    errors: list[str]
