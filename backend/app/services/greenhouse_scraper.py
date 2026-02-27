import httpx
from typing import List, Dict
import re
from html import unescape

from app.services.candidate_profile import matches_target_title, should_exclude_title

# Greenhouse public API endpoint
GREENHOUSE_API_BASE = "https://boards-api.greenhouse.io/v1/boards"

# Department keywords to filter (case-insensitive)
DEPARTMENT_KEYWORDS = [
    "sales",
    "solutions",
    "engineer",
    "enablement",
    "partner",
    "pre-sales",
    "presales",
    "customer success",
    "technical",
    "field",
    "overlay",
    "alliances",
    "channel",
]


def strip_html(html_content: str) -> str:
    """Remove HTML tags and unescape HTML entities."""
    if not html_content:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', ' ', html_content)
    # Unescape HTML entities
    clean = unescape(clean)
    # Clean up whitespace
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def matches_department(departments: List[Dict]) -> bool:
    """Check if any department matches our keywords."""
    if not departments:
        return True  # If no departments listed, don't filter

    for dept in departments:
        dept_name = dept.get("name", "").lower()
        for keyword in DEPARTMENT_KEYWORDS:
            if keyword in dept_name:
                return True
    return False


def matches_title(title: str) -> bool:
    """Check if job title matches our target titles (from candidate profile)."""
    if should_exclude_title(title):
        return False
    return matches_target_title(title)


def extract_location(job: Dict) -> str:
    """Extract location from Greenhouse job data."""
    location = job.get("location", {})
    if isinstance(location, dict):
        return location.get("name", "")
    return str(location) if location else ""


def determine_remote_type(location: str, title: str) -> str:
    """Determine remote type from location and title strings."""
    combined = f"{location} {title}".lower()

    if "remote" in combined:
        if "hybrid" in combined:
            return "hybrid"
        return "remote"
    if "hybrid" in combined:
        return "hybrid"
    if "onsite" in combined or "on-site" in combined or "office" in combined:
        return "onsite"

    return "unknown"


def fetch_greenhouse_jobs(board_token: str, company_name: str) -> List[Dict]:
    """
    Fetch jobs from Greenhouse public API for a given board token.

    Args:
        board_token: The Greenhouse board token (e.g., "sentinelone")
        company_name: The company name for the job listing

    Returns:
        List of job dictionaries ready for database insertion
    """
    url = f"{GREENHOUSE_API_BASE}/{board_token}/jobs"

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params={"content": "true"})
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as e:
        raise Exception(f"Failed to fetch jobs from Greenhouse: {str(e)}")

    jobs = data.get("jobs", [])
    filtered_jobs = []

    for job in jobs:
        title = job.get("title", "")
        departments = job.get("departments", [])

        # Filter by department keywords
        if not matches_department(departments):
            continue

        # Filter by title keywords
        if not matches_title(title):
            continue

        location = extract_location(job)
        remote_type = determine_remote_type(location, title)

        # Get job description (HTML content)
        content = job.get("content", "")
        description = strip_html(content)

        job_data = {
            "title": title,
            "company": company_name,
            "location": location,
            "remote_type": remote_type,
            "url": job.get("absolute_url", ""),
            "source": "greenhouse",
            "description": description,
            "status": "new",
            "priority": 3,
        }

        filtered_jobs.append(job_data)

    return filtered_jobs


def fetch_all_company_jobs(companies: List[Dict]) -> Dict:
    """
    Fetch jobs from all companies.

    Args:
        companies: List of dicts with 'company_name' and 'greenhouse_board_token'

    Returns:
        Dict with results summary and jobs list
    """
    all_jobs = []
    errors = []
    companies_processed = 0

    for company in companies:
        try:
            jobs = fetch_greenhouse_jobs(
                company["greenhouse_board_token"],
                company["company_name"]
            )
            all_jobs.extend(jobs)
            companies_processed += 1
        except Exception as e:
            errors.append(f"{company['company_name']}: {str(e)}")

    return {
        "jobs": all_jobs,
        "companies_processed": companies_processed,
        "errors": errors
    }
