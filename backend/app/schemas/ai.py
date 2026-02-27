from pydantic import BaseModel
from typing import Optional


class PromptRequest(BaseModel):
    job_id: int
    resume_id: Optional[int] = None


class MatchAnalysisRequest(BaseModel):
    job_id: int


class PromptResponse(BaseModel):
    prompt: str
    job_title: str
    company: str


class ResumeMatchInfo(BaseModel):
    id: int
    filename: str


class MatchAnalysisResponse(BaseModel):
    prompt: str
    job_title: str
    company: str
    resumes_analyzed: list[ResumeMatchInfo]
