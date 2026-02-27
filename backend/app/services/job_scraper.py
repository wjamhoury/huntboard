import httpx
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional
from urllib.parse import urlparse
import re


async def fetch_page(url: str) -> str:
    """Fetch HTML content from a URL."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.text


def get_meta_content(soup: BeautifulSoup, property_name: str) -> Optional[str]:
    """Get content from meta tag by property or name."""
    # Try og: property first
    meta = soup.find("meta", property=property_name)
    if meta and meta.get("content"):
        return meta["content"].strip()

    # Try name attribute
    meta = soup.find("meta", attrs={"name": property_name})
    if meta and meta.get("content"):
        return meta["content"].strip()

    return None


def clean_text(text: str) -> str:
    """Clean and normalize text."""
    if not text:
        return ""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_greenhouse(soup: BeautifulSoup, url: str) -> Dict[str, Any]:
    """Extract job data from Greenhouse job boards."""
    data = {}

    # Title
    title_el = soup.find("h1", class_="app-title") or soup.find("h1")
    if title_el:
        data["title"] = clean_text(title_el.get_text())

    # Company from URL or page
    parsed = urlparse(url)
    if "boards.greenhouse.io" in parsed.netloc:
        # URL format: boards.greenhouse.io/companyname/jobs/123
        path_parts = parsed.path.strip("/").split("/")
        if path_parts:
            data["company"] = path_parts[0].replace("-", " ").title()

    # Try og:site_name for company
    site_name = get_meta_content(soup, "og:site_name")
    if site_name and "company" not in data:
        data["company"] = site_name

    # Location
    location_el = soup.find("div", class_="location") or soup.find(string=re.compile(r"Location", re.I))
    if location_el:
        if hasattr(location_el, 'find_next'):
            next_el = location_el.find_next()
            if next_el:
                data["location"] = clean_text(next_el.get_text())
        elif location_el.parent:
            data["location"] = clean_text(location_el.parent.get_text().replace("Location", ""))

    # Description
    content_el = soup.find("div", id="content") or soup.find("div", class_="content")
    if content_el:
        data["description"] = clean_text(content_el.get_text())

    return data


def extract_lever(soup: BeautifulSoup, url: str) -> Dict[str, Any]:
    """Extract job data from Lever job boards."""
    data = {}

    # Title
    title_el = soup.find("h2", class_="posting-headline") or soup.find("h2")
    if title_el:
        # Lever sometimes has title in a child div
        title_text = title_el.find("div") or title_el
        data["title"] = clean_text(title_text.get_text())

    # Company from URL
    parsed = urlparse(url)
    if "jobs.lever.co" in parsed.netloc:
        path_parts = parsed.path.strip("/").split("/")
        if path_parts:
            data["company"] = path_parts[0].replace("-", " ").title()

    # Location
    location_el = soup.find("div", class_="posting-categories")
    if location_el:
        location_span = location_el.find("span", class_="location")
        if location_span:
            data["location"] = clean_text(location_span.get_text())

    # Description
    desc_el = soup.find("div", class_="posting-description") or soup.find("div", attrs={"data-qa": "job-description"})
    if desc_el:
        data["description"] = clean_text(desc_el.get_text())

    return data


def extract_workday(soup: BeautifulSoup, url: str) -> Dict[str, Any]:
    """Extract job data from Workday job boards."""
    data = {}

    # Title from og:title or page title
    title = get_meta_content(soup, "og:title")
    if title:
        # Workday titles often include company name, try to clean
        data["title"] = clean_text(title.split(" - ")[0] if " - " in title else title)

    # Company from subdomain
    parsed = urlparse(url)
    subdomain = parsed.netloc.split(".")[0]
    if subdomain != "www":
        data["company"] = subdomain.replace("-", " ").title()

    # Description from og:description
    desc = get_meta_content(soup, "og:description")
    if desc:
        data["description"] = clean_text(desc)

    # Try to find location
    location_el = soup.find(string=re.compile(r"Location", re.I))
    if location_el and location_el.parent:
        next_sibling = location_el.parent.find_next_sibling()
        if next_sibling:
            data["location"] = clean_text(next_sibling.get_text())

    return data


def extract_linkedin(soup: BeautifulSoup, url: str) -> Dict[str, Any]:
    """Extract job data from LinkedIn."""
    data = {}

    # Title from og:title
    title = get_meta_content(soup, "og:title")
    if title:
        # LinkedIn titles format: "Job Title at Company | LinkedIn"
        if " at " in title:
            parts = title.split(" at ")
            data["title"] = clean_text(parts[0])
            if len(parts) > 1:
                company_part = parts[1].split("|")[0]
                data["company"] = clean_text(company_part)
        else:
            data["title"] = clean_text(title.split("|")[0])

    # Description
    desc = get_meta_content(soup, "og:description")
    if desc:
        data["description"] = clean_text(desc)

    # Try to find company name element
    company_el = soup.find("a", class_="topcard__org-name-link")
    if company_el:
        data["company"] = clean_text(company_el.get_text())

    # Location
    location_el = soup.find("span", class_="topcard__flavor--bullet")
    if location_el:
        data["location"] = clean_text(location_el.get_text())

    return data


def extract_generic(soup: BeautifulSoup, url: str) -> Dict[str, Any]:
    """Generic extraction for unknown job board types."""
    data = {}

    # Title: og:title or <title>
    title = get_meta_content(soup, "og:title")
    if not title:
        title_el = soup.find("title")
        if title_el:
            title = title_el.get_text()
    if title:
        # Clean common suffixes
        for suffix in [" | ", " - ", " :: "]:
            if suffix in title:
                title = title.split(suffix)[0]
        data["title"] = clean_text(title)

    # Company: og:site_name
    site_name = get_meta_content(soup, "og:site_name")
    if site_name:
        data["company"] = clean_text(site_name)

    # Description: og:description or meta description
    desc = get_meta_content(soup, "og:description") or get_meta_content(soup, "description")
    if desc:
        data["description"] = clean_text(desc)

    # Try to find location by looking for common patterns
    for pattern in [r"Location:\s*(.+)", r"📍\s*(.+)", r"Based in\s*(.+)"]:
        match = re.search(pattern, soup.get_text(), re.I)
        if match:
            data["location"] = clean_text(match.group(1).split("\n")[0])
            break

    return data


async def scrape_job_url(url: str) -> Dict[str, Any]:
    """
    Scrape job information from a URL.
    Returns a dictionary with extracted job data.
    """
    html = await fetch_page(url)
    soup = BeautifulSoup(html, "html.parser")

    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    # Route to appropriate extractor
    if "greenhouse.io" in domain:
        data = extract_greenhouse(soup, url)
    elif "lever.co" in domain:
        data = extract_lever(soup, url)
    elif "myworkdayjobs.com" in domain or "workday.com" in domain:
        data = extract_workday(soup, url)
    elif "linkedin.com" in domain:
        data = extract_linkedin(soup, url)
    else:
        data = extract_generic(soup, url)

    # Always include the URL
    data["url"] = url

    # Set defaults for missing fields
    data.setdefault("title", "")
    data.setdefault("company", "")
    data.setdefault("location", "")
    data.setdefault("description", "")

    # Detect remote type
    combined_text = f"{data.get('title', '')} {data.get('description', '')} {data.get('location', '')}".lower()
    if "fully remote" in combined_text or "100% remote" in combined_text:
        data["remote_type"] = "remote"
    elif "hybrid" in combined_text:
        data["remote_type"] = "hybrid"
    elif "on-site" in combined_text or "onsite" in combined_text:
        data["remote_type"] = "onsite"
    elif "remote" in combined_text:
        data["remote_type"] = "remote"
    else:
        data["remote_type"] = "unknown"

    return data
