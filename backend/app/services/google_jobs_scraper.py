"""
Google Jobs scraper.
Uses SerpAPI to search Google Jobs for relevant positions.
Also provides a career page crawler for target companies.
"""
import httpx
import logging
import os
import re
from typing import List, Dict
from html import unescape
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

from app.services.candidate_profile import (
    TARGET_TITLES,
    should_exclude_title,
    matches_target_title,
)


# Search queries for Google Jobs
GOOGLE_JOBS_QUERIES = [
    '"solutions engineer" cybersecurity remote',
    '"sales engineer" SaaS security remote',
    '"solutions architect" cloud security',
    '"partner solutions engineer"',
    '"technical enablement manager" SaaS',
    '"pre-sales engineer" security',
    '"customer engineer" cloud',
]


def _clean_text(text: str) -> str:
    if not text:
        return ""
    clean = re.sub(r'<[^>]+>', ' ', text)
    clean = unescape(clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def determine_remote_type(location: str, title: str) -> str:
    combined = f"{location} {title}".lower()
    if "remote" in combined:
        if "hybrid" in combined:
            return "hybrid"
        return "remote"
    if "hybrid" in combined:
        return "hybrid"
    if "onsite" in combined or "on-site" in combined:
        return "onsite"
    return "unknown"


async def scrape_google_jobs(query: str, max_results: int = 20) -> List[Dict]:
    """Scrape Google Jobs results via SerpAPI."""
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        logger.warning("Google Jobs: SERPAPI_KEY not set, skipping")
        return []

    jobs = []
    try:
        params = {
            "engine": "google_jobs",
            "q": query,
            "api_key": api_key,
            "num": min(max_results, 10),
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get("https://serpapi.com/search", params=params)
            response.raise_for_status()
            data = response.json()

        for job in data.get("jobs_results", [])[:max_results]:
            location = job.get("location", "")
            title = job.get("title", "")
            remote_type = determine_remote_type(location, title)

            job_data = {
                "title": title[:255],
                "company": job.get("company_name", "Unknown")[:255],
                "location": location[:255],
                "remote_type": remote_type,
                "url": job.get("apply_options", [{}])[0].get("link", "") if job.get("apply_options") else "",
                "source": "google_jobs",
                "description": job.get("description", "")[:2000],
                "status": "new",
                "priority": 3,
            }
            jobs.append(job_data)

    except Exception as e:
        logger.error(f"SerpAPI Google Jobs error: {e}")

    return jobs


async def crawl_career_page(career_url: str, company_name: str) -> List[Dict]:
    """
    Crawl a company's careers page to find relevant job listings.
    Uses httpx + BeautifulSoup for static pages, Playwright for JS-rendered.
    """
    jobs = []

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as client:
            response = await client.get(career_url, headers=headers)
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "html.parser")

        # Find all links that look like job postings
        job_links = soup.find_all("a", href=True)

        for link in job_links:
            href = link.get("href", "")
            text = link.get_text(strip=True)

            if not text or len(text) < 5 or len(text) > 200:
                continue

            # Check if this looks like a job posting link
            job_url_patterns = [
                "/jobs/", "/careers/", "/positions/",
                "/job/", "/opening/", "/role/",
                "greenhouse.io", "lever.co", "workday",
            ]

            is_job_link = any(p in href.lower() for p in job_url_patterns)
            if not is_job_link:
                continue

            # Check title relevance
            if not matches_target_title(text) and not any(
                kw in text.lower() for kw in ["solution", "sales engineer", "pre-sales", "enablement"]
            ):
                continue

            if should_exclude_title(text):
                continue

            # Build full URL
            if href.startswith("/"):
                from urllib.parse import urljoin
                href = urljoin(career_url, href)

            job_data = {
                "title": text[:255],
                "company": company_name,
                "location": "",
                "remote_type": "unknown",
                "url": href,
                "source": f"career_page:{company_name.lower().replace(' ', '_')}",
                "description": "",
                "status": "new",
                "priority": 3,
            }
            jobs.append(job_data)

    except Exception as e:
        logger.error(f"Career page crawl error for {company_name}: {e}")

    return jobs
