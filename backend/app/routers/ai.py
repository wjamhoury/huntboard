import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Tuple
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import get_user_db
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.schemas.ai import PromptRequest, PromptResponse, MatchAnalysisRequest, MatchAnalysisResponse, ResumeMatchInfo
from app.services.prompt_generator import generate_cover_letter_prompt, generate_resume_tailor_prompt, generate_resume_match_prompt

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter()


def get_job_and_resume(request: PromptRequest, db: Session, user: User):
    """Helper to fetch job and optionally resume.

    Resume priority:
    1. If resume_id is provided in request, use that
    2. Else if job has an associated resume_id, use that
    3. Else fall back to primary resume

    All queries are filtered by user_id for tenant isolation.
    """
    job = db.query(Job).filter(Job.id == request.job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resume_text = ""
    resume_id_to_use = request.resume_id or job.resume_id

    if resume_id_to_use:
        resume = db.query(Resume).filter(
            Resume.id == resume_id_to_use,
            Resume.user_id == user.id
        ).first()
        if resume:
            resume_text = resume.extracted_text or ""
        elif request.resume_id:
            # Only raise error if explicitly requested resume not found
            raise HTTPException(status_code=404, detail="Resume not found")

    # Fall back to primary resume if no resume found yet
    if not resume_text:
        primary_resume = db.query(Resume).filter(
            Resume.is_primary == True,
            Resume.user_id == user.id
        ).first()
        if primary_resume:
            resume_text = primary_resume.extracted_text or ""

    return job, resume_text


@router.post("/cover-letter-prompt", response_model=PromptResponse)
@limiter.limit("10/minute")
def generate_cover_letter(
    request: Request,
    body: PromptRequest,
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """Generate a prompt for creating a tailored cover letter."""
    db, user = user_db
    job, resume_text = get_job_and_resume(body, db, user)

    prompt = generate_cover_letter_prompt(
        job_title=job.title,
        company=job.company,
        job_description=job.description or "",
        resume_text=resume_text
    )

    return PromptResponse(
        prompt=prompt,
        job_title=job.title,
        company=job.company
    )


@router.post("/resume-tailor-prompt", response_model=PromptResponse)
@limiter.limit("10/minute")
def generate_resume_tailor(
    request: Request,
    body: PromptRequest,
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """Generate a prompt for tailoring a resume to a specific job."""
    db, user = user_db
    job, resume_text = get_job_and_resume(body, db, user)

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No resume found. Please upload a resume first."
        )

    prompt = generate_resume_tailor_prompt(
        job_title=job.title,
        company=job.company,
        job_description=job.description or "",
        resume_text=resume_text
    )

    return PromptResponse(
        prompt=prompt,
        job_title=job.title,
        company=job.company
    )


@router.post("/match-analysis", response_model=MatchAnalysisResponse)
@limiter.limit("10/minute")
def generate_match_analysis(
    request: Request,
    body: MatchAnalysisRequest,
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    """Generate a prompt for Claude to analyze which resume best matches the job."""
    db, user = user_db
    job = db.query(Job).filter(Job.id == body.job_id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get all resumes with extracted text for this user
    resumes = db.query(Resume).filter(
        Resume.user_id == user.id,
        Resume.extracted_text != None,
        Resume.extracted_text != ""
    ).all()
    if not resumes:
        raise HTTPException(
            status_code=400,
            detail="No resumes found. Please upload at least one resume first."
        )

    # Prepare resumes data for prompt
    resumes_data = [
        {"filename": r.original_filename, "text": r.extracted_text}
        for r in resumes
    ]

    prompt = generate_resume_match_prompt(
        job_title=job.title,
        company=job.company,
        job_description=job.description or "",
        resumes=resumes_data
    )

    resumes_info = [
        ResumeMatchInfo(id=r.id, filename=r.original_filename)
        for r in resumes
    ]

    return MatchAnalysisResponse(
        prompt=prompt,
        job_title=job.title,
        company=job.company,
        resumes_analyzed=resumes_info
    )
