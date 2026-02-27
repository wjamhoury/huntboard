"""
Lever job board scraper.
Uses the public Lever API (JSON) at https://api.lever.co/v0/postings/{company}
"""
import httpx
from typing import List, Dict
from app.services.candidate_profile import matches_target_title, should_exclude_title


LEVER_API_BASE = "https://api.lever.co/v0/postings"


def determine_remote_type(location: str, title: str) -> str:
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


def fetch_lever_jobs(company_slug: str, company_name: str) -> List[Dict]:
    """
    Fetch jobs from Lever's public JSON API.

    Args:
        company_slug: Lever company slug (e.g., "tailscale")
        company_name: Display name for the company

    Returns:
        List of job dicts ready for DB insertion
    """
    url = f"{LEVER_API_BASE}/{company_slug}"

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params={"mode": "json"})
            response.raise_for_status()
            postings = response.json()
    except httpx.HTTPError as e:
        raise Exception(f"Failed to fetch Lever jobs for {company_name}: {e}")

    filtered_jobs = []
    for posting in postings:
        title = posting.get("text", "")

        if should_exclude_title(title):
            continue
        if not matches_target_title(title):
            continue

        categories = posting.get("categories", {})
        location = categories.get("location", "") or ""
        team = categories.get("team", "") or ""
        commitment = categories.get("commitment", "") or ""

        remote_type = determine_remote_type(location, title)

        # Build description from lists
        desc_parts = []
        for section in posting.get("lists", []):
            section_text = section.get("text", "")
            content = section.get("content", "")
            if section_text:
                desc_parts.append(section_text)
            if content:
                # Strip HTML
                import re
                from html import unescape
                clean = re.sub(r'<[^>]+>', ' ', content)
                clean = unescape(clean)
                clean = re.sub(r'\s+', ' ', clean).strip()
                desc_parts.append(clean)

        # Also grab the description/additional fields
        desc_body = posting.get("descriptionPlain", "") or ""
        additional = posting.get("additionalPlain", "") or ""
        if desc_body:
            desc_parts.insert(0, desc_body)
        if additional:
            desc_parts.append(additional)

        description = "\n\n".join(desc_parts)

        job_url = posting.get("hostedUrl", "") or posting.get("applyUrl", "")

        job_data = {
            "title": title,
            "company": company_name,
            "location": location,
            "remote_type": remote_type,
            "url": job_url,
            "source": "lever",
            "description": description[:5000],
            "status": "new",
            "priority": 3,
        }
        filtered_jobs.append(job_data)

    return filtered_jobs
