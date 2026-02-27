"""
Sources router - provides access to source templates for user onboarding.

Templates are curated lists of popular job sources (companies, RSS feeds)
that users can browse and add to their own accounts.
"""
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional, Tuple

from app.dependencies import get_user_db
from app.models.resume import Resume
from app.models.user import User
from app.services.source_templates import get_all_templates, search_templates
from app.services.resume_analyzer import analyze_resume_for_sources

router = APIRouter()


@router.get("/templates")
def get_templates(search: Optional[str] = Query(None, description="Search templates by name, slug, or category")):
    """
    Get available source templates.

    Returns a curated list of popular job sources that users can add to their accounts.
    Optionally filter by search query.

    No authentication required - these are public templates.
    """
    if search:
        results = search_templates(search)
        return {
            "templates": results,
            "total": len(results),
            "query": search,
        }

    all_templates = get_all_templates()
    total = sum(len(templates) for templates in all_templates.values())

    return {
        "templates": all_templates,
        "total": total,
        "summary": {
            "greenhouse": len(all_templates.get("greenhouse", [])),
            "workday": len(all_templates.get("workday", [])),
            "lever": len(all_templates.get("lever", [])),
            "rss": len(all_templates.get("rss", [])),
        },
    }


@router.get("/suggestions")
def get_suggestions(user_db: Tuple[Session, User] = Depends(get_user_db)):
    """
    Get personalized source suggestions based on the user's primary resume.

    Analyzes the user's primary resume text using keyword matching to suggest
    relevant job sources. Returns suggestions sorted by relevance score.

    Requires authentication.
    """
    db, user = user_db

    # Get the user's primary resume
    primary_resume = db.query(Resume).filter(
        Resume.user_id == user.id,
        Resume.is_primary == True
    ).first()

    if not primary_resume or not primary_resume.extracted_text:
        return {
            "suggestions": [],
            "message": "Upload a resume to get personalized source suggestions",
            "has_resume": False,
        }

    # Analyze resume and get suggestions
    suggestions = analyze_resume_for_sources(primary_resume.extracted_text)

    return {
        "suggestions": suggestions,
        "total": len(suggestions),
        "has_resume": True,
        "resume_id": primary_resume.id,
        "resume_name": primary_resume.original_filename,
    }
