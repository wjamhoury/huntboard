from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import datetime


class CompanyFeedBase(BaseModel):
    company_name: str
    feed_type: str = "greenhouse"  # "greenhouse", "workday", or "lever"
    greenhouse_board_token: Optional[str] = None
    workday_url: Optional[str] = None
    lever_slug: Optional[str] = None
    is_active: Optional[bool] = True

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
