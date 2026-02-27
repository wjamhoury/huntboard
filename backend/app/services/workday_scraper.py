import httpx
from typing import List, Dict
import re
from html import unescape
from urllib.parse import urlparse

from app.services.candidate_profile import matches_target_title, should_exclude_title


def strip_html(html_content: str) -> str:
    """Remove HTML tags and unescape HTML entities."""
    if not html_content:
        return ""
    clean = re.sub(r'<[^>]+>', ' ', html_content)
    clean = unescape(clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def matches_title(title: str) -> bool:
    """Check if job title matches target titles (from candidate profile)."""
    if should_exclude_title(title):
        return False
    return matches_target_title(title)


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


def parse_workday_url(workday_url: str) -> Dict:
    """
    Parse a Workday URL to extract company and career site.

    Expected formats:
    - https://crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers
    - https://paloaltonetworks.wd5.myworkdayjobs.com/Careers
    - https://crowdstrike.wd5.myworkdayjobs.com/en-US/crowdstrikecareers
    """
    parsed = urlparse(workday_url)
    host = parsed.netloc  # e.g., "crowdstrike.wd5.myworkdayjobs.com"
    path_parts = [p for p in parsed.path.strip('/').split('/') if p]

    # Extract company from subdomain
    company = host.split('.')[0]  # e.g., "crowdstrike"

    # Career site is typically the last path part (skip locale like en-US)
    career_site = path_parts[-1] if path_parts else "careers"

    return {
        "host": host,
        "company": company,
        "career_site": career_site,
        "base_url": f"https://{host}"
    }


def fetch_workday_jobs(workday_url: str, company_name: str) -> List[Dict]:
    """
    Fetch jobs from Workday career page.

    Args:
        workday_url: The Workday career page URL
        company_name: The company name for the job listing

    Returns:
        List of job dictionaries ready for database insertion
    """
    parsed = parse_workday_url(workday_url)

    # Workday JSON API endpoint
    api_url = f"{parsed['base_url']}/wday/cxs/{parsed['company']}/{parsed['career_site']}/jobs"

    # Browser-like headers - Workday is picky about these
    headers = {
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json",
        "Origin": parsed['base_url'],
        "Referer": f"{workday_url}/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    }

    # Request body for Workday API
    payload = {
        "appliedFacets": {},
        "limit": 20,
        "offset": 0,
        "searchText": ""
    }

    all_jobs = []
    offset = 0
    max_pages = 20  # Safety limit (20 jobs per page * 20 = 400 max)

    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            for page in range(max_pages):
                payload["offset"] = offset

                response = client.post(api_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

                job_postings = data.get("jobPostings", [])
                if not job_postings:
                    break

                for job in job_postings:
                    title = job.get("title", "")

                    # Filter by title keywords
                    if not matches_title(title):
                        continue

                    # Extract location
                    location = job.get("locationsText", "") or ""

                    remote_type = determine_remote_type(location, title)

                    # Build job URL
                    external_path = job.get("externalPath", "")
                    job_url = f"{parsed['base_url']}/en-US{external_path}" if external_path else ""

                    # Get job description from bulletFields
                    description_parts = []
                    for bullet in job.get("bulletFields", []):
                        if bullet:
                            description_parts.append(str(bullet))
                    description = "\n".join(description_parts)

                    job_data = {
                        "title": title,
                        "company": company_name,
                        "location": location,
                        "remote_type": remote_type,
                        "url": job_url,
                        "source": "workday",
                        "description": description,
                        "status": "new",
                        "priority": 3,
                    }

                    all_jobs.append(job_data)

                # Check if there are more pages
                total = data.get("total", 0)
                offset += len(job_postings)
                if offset >= total:
                    break

    except httpx.HTTPStatusError as e:
        # Provide more helpful error for common issues
        if e.response.status_code == 400:
            raise Exception(f"Workday API rejected request (400). The career site path may be incorrect.")
        elif e.response.status_code == 404:
            raise Exception(f"Workday career page not found (404). Check the URL.")
        raise Exception(f"Failed to fetch jobs from Workday: {str(e)}")
    except Exception as e:
        raise Exception(f"Error fetching Workday jobs: {str(e)}")

    return all_jobs
