from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Tuple
from datetime import datetime

from app.dependencies import get_user_db
from app.models.company_feed import CompanyFeed
from app.models.job import Job
from app.models.user import User
from app.schemas.company_feed import CompanyFeedCreate, CompanyFeedResponse, CompanyRefreshResult
from app.services.greenhouse_scraper import fetch_greenhouse_jobs
from app.services.workday_scraper import fetch_workday_jobs
from app.services.lever_scraper import fetch_lever_jobs
from app.services.candidate_profile import should_exclude_title

router = APIRouter()

@router.get("", response_model=List[CompanyFeedResponse])
def get_companies(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Get all company feeds for the current user. Returns empty list for new users."""
    db, user = user_db
    return db.query(CompanyFeed).filter(CompanyFeed.user_id == user.id).order_by(CompanyFeed.company_name).all()


@router.post("", response_model=CompanyFeedResponse)
def create_company(company: CompanyFeedCreate, user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Add a new company feed."""
    db, user = user_db
    # Check for duplicates based on feed type for this user
    if company.feed_type == "greenhouse":
        existing = db.query(CompanyFeed).filter(
            CompanyFeed.greenhouse_board_token == company.greenhouse_board_token,
            CompanyFeed.user_id == user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Company with this Greenhouse token already exists")
    elif company.feed_type == "workday":
        existing = db.query(CompanyFeed).filter(
            CompanyFeed.workday_url == company.workday_url,
            CompanyFeed.user_id == user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Company with this Workday URL already exists")

    db_company = CompanyFeed(user_id=user.id, **company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


@router.delete("/{company_id}")
def delete_company(company_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Delete a company feed."""
    db, user = user_db
    company = db.query(CompanyFeed).filter(
        CompanyFeed.id == company_id,
        CompanyFeed.user_id == user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    db.delete(company)
    db.commit()
    return {"message": "Company deleted successfully"}


@router.patch("/{company_id}/toggle", response_model=CompanyFeedResponse)
def toggle_company(company_id: int, user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Toggle a company's active status."""
    db, user = user_db
    company = db.query(CompanyFeed).filter(
        CompanyFeed.id == company_id,
        CompanyFeed.user_id == user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company.is_active = not company.is_active
    db.commit()
    db.refresh(company)
    return company


@router.post("/refresh", response_model=CompanyRefreshResult)
def refresh_companies(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Fetch jobs from all active company feeds (Greenhouse, Workday, and Lever)."""
    db, user = user_db

    companies = db.query(CompanyFeed).filter(
        CompanyFeed.is_active == True,
        CompanyFeed.user_id == user.id
    ).all()

    companies_processed = 0
    new_jobs_added = 0
    errors = []

    # Get all existing job URLs for this user to avoid duplicates
    existing_urls = set(
        url[0] for url in db.query(Job.url).filter(
            Job.url != "",
            Job.user_id == user.id
        ).all()
    )

    for company in companies:
        try:
            # Fetch jobs based on feed type
            if company.feed_type == "greenhouse" and company.greenhouse_board_token:
                jobs_data = fetch_greenhouse_jobs(
                    company.greenhouse_board_token,
                    company.company_name
                )
            elif company.feed_type == "workday" and company.workday_url:
                jobs_data = fetch_workday_jobs(
                    company.workday_url,
                    company.company_name
                )
            elif company.feed_type == "lever" and company.lever_slug:
                jobs_data = fetch_lever_jobs(
                    company.lever_slug,
                    company.company_name
                )
            else:
                errors.append(f"{company.company_name}: Invalid feed configuration")
                continue

            companies_processed += 1

            for job_data in jobs_data:
                # Skip if URL already exists
                if job_data.get("url") and job_data["url"] in existing_urls:
                    continue

                # Apply negative title filter
                if should_exclude_title(job_data.get("title", "")):
                    continue

                # Create new job with user_id
                db_job = Job(user_id=user.id, **job_data)
                db.add(db_job)
                existing_urls.add(job_data.get("url", ""))
                new_jobs_added += 1

            # Update last_fetched timestamp
            company.last_fetched = datetime.now()

        except Exception as e:
            errors.append(f"{company.company_name}: {str(e)}")

    db.commit()

    return CompanyRefreshResult(
        companies_processed=companies_processed,
        new_jobs_added=new_jobs_added,
        errors=errors
    )


@router.post("/reset")
def reset_companies(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """Delete all company feeds for this user."""
    db, user = user_db
    count = db.query(CompanyFeed).filter(CompanyFeed.user_id == user.id).count()
    db.query(CompanyFeed).filter(CompanyFeed.user_id == user.id).delete()
    db.commit()
    return {"message": f"Deleted {count} company feeds."}
