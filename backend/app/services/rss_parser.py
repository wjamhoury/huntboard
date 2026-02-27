import feedparser
import logging
import re
from typing import List, Dict, Any, Optional
from html import unescape

logger = logging.getLogger(__name__)


def matches_keywords(job_data: Dict[str, Any], keywords: List[str]) -> bool:
    """Check if job matches any of the keywords."""
    # Combine title, company, and description for matching
    text = " ".join([
        job_data.get("title", ""),
        job_data.get("company", ""),
        job_data.get("description", "")
    ]).lower()

    for keyword in keywords:
        if keyword.lower() in text:
            return True
    return False


def clean_html(text: str) -> str:
    """Remove HTML tags and clean up text."""
    if not text:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities
    clean = unescape(clean)
    # Normalize whitespace
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def extract_company_from_title(title: str) -> tuple[str, str]:
    """
    Try to extract company name from job title.
    Common patterns: "Job Title at Company" or "Job Title - Company"
    Returns (job_title, company)
    """
    # Pattern: "Title at Company"
    if " at " in title:
        parts = title.rsplit(" at ", 1)
        if len(parts) == 2:
            return parts[0].strip(), parts[1].strip()

    # Pattern: "Title - Company"
    if " - " in title:
        parts = title.rsplit(" - ", 1)
        if len(parts) == 2:
            return parts[0].strip(), parts[1].strip()

    # Pattern: "Title | Company"
    if " | " in title:
        parts = title.rsplit(" | ", 1)
        if len(parts) == 2:
            return parts[0].strip(), parts[1].strip()

    return title, "Unknown"


def detect_remote_type(text: str) -> str:
    """Detect if job is remote, hybrid, or onsite based on text."""
    text_lower = text.lower()

    if "fully remote" in text_lower or "100% remote" in text_lower:
        return "remote"
    if "hybrid" in text_lower:
        return "hybrid"
    if "on-site" in text_lower or "onsite" in text_lower or "in-office" in text_lower:
        return "onsite"
    if "remote" in text_lower:
        return "remote"

    return "unknown"


def extract_salary(text: str) -> tuple[Optional[int], Optional[int]]:
    """Try to extract salary range from text."""
    # Pattern: $XXX,XXX - $XXX,XXX or $XXXk - $XXXk
    patterns = [
        r'\$(\d{1,3}(?:,\d{3})*)\s*[-–]\s*\$(\d{1,3}(?:,\d{3})*)',  # $100,000 - $150,000
        r'\$(\d{2,3})k\s*[-–]\s*\$(\d{2,3})k',  # $100k - $150k
        r'(\d{1,3}(?:,\d{3})*)\s*[-–]\s*(\d{1,3}(?:,\d{3})*)\s*(?:USD|usd)',  # 100,000 - 150,000 USD
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            min_sal = match.group(1).replace(',', '')
            max_sal = match.group(2).replace(',', '')

            # Handle "k" notation
            if 'k' in pattern:
                min_sal = int(min_sal) * 1000
                max_sal = int(max_sal) * 1000
            else:
                min_sal = int(min_sal)
                max_sal = int(max_sal)

            return min_sal, max_sal

    return None, None


def extract_location_from_entry(entry) -> str:
    """Extract location from various feed formats."""
    # Try common location fields
    if hasattr(entry, 'location'):
        return str(entry.location)
    if hasattr(entry, 'georss_point'):
        return str(entry.georss_point)

    # Check for location in tags/categories
    if hasattr(entry, 'tags'):
        for tag in entry.tags:
            term = tag.get('term', '').lower()
            if any(loc in term for loc in ['remote', 'usa', 'europe', 'worldwide']):
                return tag.get('term', '')

    # Try to extract from title or description
    return ""


def extract_company_from_entry(entry, title: str) -> tuple[str, str]:
    """
    Extract company from entry metadata or fall back to title parsing.
    Different feeds store company info differently.
    """
    # Remotive uses author field for company
    if hasattr(entry, 'author') and entry.author:
        return title, entry.author

    # Some feeds use dc:creator
    if hasattr(entry, 'author_detail') and entry.author_detail:
        author = entry.author_detail.get('name', '')
        if author:
            return title, author

    # WeWorkRemotely puts company in the title after the job title
    # Format: "Company: Job Title"
    if ": " in title and not title.startswith("http"):
        parts = title.split(": ", 1)
        if len(parts) == 2:
            return parts[1].strip(), parts[0].strip()

    # Fall back to standard title parsing
    return extract_company_from_title(title)


def parse_feed(feed_url: str, feed_name: str) -> List[Dict[str, Any]]:
    """
    Parse an RSS feed and return a list of job dictionaries.
    Handles multiple feed formats from different job boards.
    """
    jobs = []

    try:
        # Add headers to avoid being blocked
        feed = feedparser.parse(
            feed_url,
            agent='HuntBoard/1.0 (Job Search Application)'
        )

        if feed.bozo and not feed.entries:
            # Feed parsing error with no entries
            return []

        for entry in feed.entries:
            title = entry.get('title', '')
            if not title:
                continue

            # Clean the title
            title = clean_html(title)

            # Extract job title and company (handles different formats)
            job_title, company = extract_company_from_entry(entry, title)

            # Get description/summary (try multiple fields)
            description = ""
            if hasattr(entry, 'content') and entry.content:
                description = clean_html(entry.content[0].get('value', ''))
            elif hasattr(entry, 'summary'):
                description = clean_html(entry.summary)
            elif hasattr(entry, 'description'):
                description = clean_html(entry.description)

            # Get link
            link = entry.get('link', '')

            # Detect remote type from title and description
            combined_text = f"{title} {description}"
            remote_type = detect_remote_type(combined_text)

            # Try to extract salary
            salary_min, salary_max = extract_salary(combined_text)

            # Extract location
            location = extract_location_from_entry(entry)
            if not location:
                # Try to find location in description
                if "remote" in combined_text.lower():
                    location = "Remote"

            # Use feed name as source
            source = f"rss:{feed_name}"

            job = {
                "title": job_title[:255],  # Truncate to fit column
                "company": company[:255] if company else "Unknown",
                "location": location[:255] if location else "",
                "remote_type": remote_type,
                "url": link,
                "source": source[:100],
                "description": description[:5000],  # Limit description size
                "salary_min": salary_min,
                "salary_max": salary_max,
                "status": "new",
                "priority": 3,
            }

            jobs.append(job)

    except Exception as e:
        logger.error(f"Error parsing feed {feed_url}: {e}")

    return jobs
