import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import RedirectResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Tuple
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import get_user_db
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import ResumeResponse
from app.services.pdf_extractor import extract_text_from_pdf
from app.services import storage
from app.services.usage_tracker import track_event

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_RESUMES_PER_USER = 10


def _resume_to_response(resume: Resume) -> dict:
    """Convert a Resume model to a response dict with download_url."""
    # Only generate presigned URL for S3 keys (start with "resumes/")
    download_url = None
    if resume.s3_key and resume.s3_key.startswith("resumes/"):
        try:
            download_url = storage.get_download_url(resume.s3_key)
        except Exception:
            pass  # Skip if S3 credentials not configured or other error

    return {
        "id": resume.id,
        "user_id": resume.user_id,
        "s3_key": resume.s3_key,
        "original_filename": resume.original_filename,
        "file_size_bytes": resume.file_size_bytes,
        "content_type": resume.content_type,
        "extracted_text": resume.extracted_text,
        "is_primary": resume.is_primary,
        "download_url": download_url,
        "created_at": resume.created_at,
        "updated_at": resume.updated_at,
    }


@router.get("", response_model=List[ResumeResponse])
def get_resumes(user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    resumes = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.created_at.desc()).all()
    return [_resume_to_response(r) for r in resumes]


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(resume_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return _resume_to_response(resume)


@router.post("", response_model=ResumeResponse)
@limiter.limit("5/minute")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    user_db: Tuple[Session, User] = Depends(get_user_db)
):
    db, user = user_db

    # Check resume limit per user
    existing_count = db.query(Resume).filter(Resume.user_id == user.id).count()
    if existing_count >= MAX_RESUMES_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_RESUMES_PER_USER} resumes allowed per user"
        )

    # Validate content type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid content type. Only PDF files are allowed")

    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    # Validate PDF magic bytes
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Invalid PDF file. File must start with PDF header")

    # Extract text from PDF
    try:
        extracted_text = extract_text_from_pdf(content)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from this PDF. Please try a different file or ensure the PDF contains selectable text."
        )

    # Upload to S3
    try:
        s3_key = storage.upload_resume(user.id, content, file.filename)
    except Exception as e:
        logger.error(f"S3 upload failed for user {user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="File upload failed. Please try again."
        )

    # Check if this is the first resume for this user (make it primary)
    is_primary = existing_count == 0

    # Create database entry
    db_resume = Resume(
        user_id=user.id,
        s3_key=s3_key,
        original_filename=file.filename,
        file_size_bytes=len(content),
        content_type=file.content_type,
        extracted_text=extracted_text,
        is_primary=is_primary
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    # Track usage event
    track_event(db, user.id, "resume_uploaded", {"is_primary": is_primary})

    return _resume_to_response(db_resume)


@router.patch("/{resume_id}/primary", response_model=ResumeResponse)
def set_primary_resume(resume_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Unset all other resumes for this user as primary
    db.query(Resume).filter(Resume.user_id == user.id).update({Resume.is_primary: False})

    # Set this one as primary
    resume.is_primary = True
    db.commit()
    db.refresh(resume)

    return _resume_to_response(resume)


@router.get("/{resume_id}/text")
def get_resume_text(resume_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # If text is cached, return it
    if resume.extracted_text:
        return {"text": resume.extracted_text}

    # Otherwise, fetch from S3 and extract
    try:
        content = storage.get_resume_bytes(resume.s3_key)
        extracted_text = extract_text_from_pdf(content)

        # Cache the extracted text
        resume.extracted_text = extracted_text
        db.commit()

        return {"text": extracted_text}
    except Exception as e:
        logger.error(f"Failed to extract text for resume {resume_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Could not extract text from this PDF. Please try uploading a different file."
        )


@router.get("/{resume_id}/download")
def download_resume(resume_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Generate presigned URL and redirect
    download_url = storage.get_download_url(resume.s3_key)
    return RedirectResponse(url=download_url)


@router.delete("/{resume_id}")
def delete_resume(resume_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    db, user = user_db
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Delete from S3
    storage.delete_resume(resume.s3_key)

    # Delete from database
    db.delete(resume)
    db.commit()

    return {"message": "Resume deleted successfully"}


@router.get("/file/resumes/{user_id}/{filename}")
async def serve_local_file(user_id: str, filename: str):
    """Serve locally stored resumes (dev only)"""
    from app.services.storage import USE_LOCAL_STORAGE, LOCAL_STORAGE_PATH
    if not USE_LOCAL_STORAGE:
        raise HTTPException(status_code=404)
    path = LOCAL_STORAGE_PATH / "resumes" / user_id / filename
    if not path.exists():
        raise HTTPException(status_code=404)
    return FileResponse(path, media_type="application/pdf")
