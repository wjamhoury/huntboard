from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ResumeBase(BaseModel):
    original_filename: str
    content_type: Optional[str] = "application/pdf"
    extracted_text: Optional[str] = ""
    is_primary: Optional[bool] = False


class ResumeCreate(ResumeBase):
    s3_key: str
    file_size_bytes: Optional[int] = None


class ResumeResponse(ResumeBase):
    id: int
    user_id: str
    s3_key: str
    file_size_bytes: Optional[int] = None
    download_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
