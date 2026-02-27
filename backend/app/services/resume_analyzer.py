"""
Resume analyzer service for suggesting relevant job sources based on resume content.

Uses keyword matching (v1) to identify relevant companies/job sources
based on skills, job titles, and industry terms found in the user's resume.
"""

import re
from typing import List, Dict, Any

# Map keywords found in resumes to relevant source template slugs
KEYWORD_SOURCE_MAP = {
    # Cybersecurity keywords
    "cybersecurity": ["crowdstrike", "paloaltonetworks", "zscaler", "okta", "snyk"],
    "soc": ["crowdstrike", "paloaltonetworks"],
    "siem": ["crowdstrike", "splunk"],
    "zero trust": ["zscaler", "paloaltonetworks", "okta"],
    "endpoint": ["crowdstrike", "paloaltonetworks"],
    "sase": ["zscaler", "paloaltonetworks"],
    "cloud security": ["zscaler", "paloaltonetworks", "cloudflare"],
    "devsecops": ["snyk", "hashicorp", "gitlab"],
    "penetration test": ["crowdstrike", "paloaltonetworks"],
    "threat": ["crowdstrike", "paloaltonetworks", "recordedfuture"],
    "vulnerability": ["snyk", "crowdstrike", "paloaltonetworks"],
    "incident response": ["crowdstrike", "paloaltonetworks"],
    "malware": ["crowdstrike", "paloaltonetworks", "sentinelone"],
    "firewall": ["paloaltonetworks", "fortinet", "zscaler"],
    "identity": ["okta", "1password"],
    "compliance": ["drata", "vanta"],
    "security awareness": ["knowbe4", "proofpoint"],

    # Engineering keywords
    "python": ["anthropic", "stripe", "datadog", "mongodb"],
    "react": ["figma", "notion", "stripe", "vercel"],
    "javascript": ["figma", "notion", "stripe", "vercel"],
    "typescript": ["figma", "notion", "stripe", "vercel"],
    "kubernetes": ["hashicorp", "datadog", "confluent"],
    "aws": ["hashicorp", "datadog", "mongodb"],
    "azure": ["hashicorp", "datadog"],
    "gcp": ["hashicorp", "datadog"],
    "data engineer": ["databricks", "confluent", "mongodb"],
    "machine learning": ["anthropic", "openai", "databricks"],
    "artificial intelligence": ["anthropic", "openai"],
    "ai": ["anthropic", "openai"],
    "llm": ["anthropic", "openai"],
    "devops": ["hashicorp", "datadog", "gitlab"],
    "observability": ["datadog", "elastic", "cribl", "sumologic"],
    "monitoring": ["datadog", "elastic"],
    "api": ["stripe", "cloudflare", "confluent"],
    "infrastructure": ["hashicorp", "datadog"],
    "terraform": ["hashicorp"],
    "docker": ["hashicorp", "datadog"],
    "ci/cd": ["gitlab", "hashicorp"],
    "kafka": ["confluent"],
    "streaming": ["confluent", "databricks"],
    "database": ["mongodb", "databricks", "confluent"],
    "backend": ["stripe", "anthropic", "mongodb"],
    "frontend": ["figma", "notion", "vercel"],
    "full stack": ["stripe", "notion", "figma"],
    "golang": ["hashicorp", "cloudflare", "tailscale"],
    "go": ["hashicorp", "cloudflare", "tailscale"],
    "rust": ["cloudflare", "figma"],
    "vpn": ["tailscale"],
    "networking": ["cloudflare", "tailscale", "paloaltonetworks"],

    # Sales/SE keywords
    "solutions engineer": ["paloaltonetworks", "crowdstrike", "zscaler", "datadog", "hashicorp", "mongodb"],
    "sales engineer": ["paloaltonetworks", "crowdstrike", "zscaler", "datadog"],
    "technical enablement": ["paloaltonetworks", "crowdstrike", "okta"],
    "partner": ["paloaltonetworks", "crowdstrike", "okta"],
    "pre-sales": ["paloaltonetworks", "crowdstrike", "zscaler", "datadog"],
    "channel": ["paloaltonetworks", "crowdstrike", "zscaler"],
    "demo": ["paloaltonetworks", "crowdstrike", "datadog"],
    "proof of concept": ["paloaltonetworks", "crowdstrike", "datadog"],
    "poc": ["paloaltonetworks", "crowdstrike", "datadog"],
    "customer success": ["datadog", "mongodb", "okta"],
    "technical account": ["crowdstrike", "paloaltonetworks", "datadog"],
    "enterprise": ["salesforce", "cisco", "vmware"],
    "account executive": ["salesforce", "crowdstrike", "paloaltonetworks"],
    "business development": ["salesforce", "crowdstrike"],

    # Data & Analytics keywords
    "data science": ["databricks", "anthropic", "openai"],
    "analytics": ["databricks", "datadog", "elastic"],
    "etl": ["databricks", "confluent"],
    "data warehouse": ["databricks", "mongodb"],
    "sql": ["databricks", "mongodb"],
    "spark": ["databricks"],
    "hadoop": ["databricks", "confluent"],

    # Design keywords
    "design": ["figma", "notion"],
    "ux": ["figma", "notion"],
    "ui": ["figma", "notion"],
    "product design": ["figma", "notion"],
}


def analyze_resume_for_sources(resume_text: str) -> List[Dict[str, Any]]:
    """
    Analyze resume text and return suggested source templates
    ranked by relevance (number of keyword matches).

    Args:
        resume_text: The extracted text content from the user's resume

    Returns:
        List of template dictionaries with relevance_score added,
        sorted by score descending (top 15 suggestions)
    """
    if not resume_text:
        return []

    text_lower = resume_text.lower()
    slug_scores: Dict[str, int] = {}

    for keyword, slugs in KEYWORD_SOURCE_MAP.items():
        # Count occurrences of keyword in resume (word boundary matching)
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(keyword) + r'\b'
        count = len(re.findall(pattern, text_lower))
        if count > 0:
            for slug in slugs:
                slug_scores[slug] = slug_scores.get(slug, 0) + count

    # Sort by score descending
    sorted_slugs = sorted(slug_scores.items(), key=lambda x: x[1], reverse=True)

    # Match slugs back to templates
    from app.services.source_templates import (
        GREENHOUSE_TEMPLATES,
        WORKDAY_TEMPLATES,
        LEVER_TEMPLATES,
    )

    # Build lookup dictionary by slug
    all_templates: Dict[str, Dict[str, Any]] = {}
    for t in GREENHOUSE_TEMPLATES:
        all_templates[t["slug"]] = t
    for t in WORKDAY_TEMPLATES:
        # Workday may have same company as Greenhouse - prefer Workday if it has URL
        if t["slug"] not in all_templates:
            all_templates[t["slug"]] = t
    for t in LEVER_TEMPLATES:
        if t["slug"] not in all_templates:
            all_templates[t["slug"]] = t

    suggestions = []
    for slug, score in sorted_slugs[:15]:  # Top 15 suggestions
        if slug in all_templates:
            template = all_templates[slug].copy()
            template["relevance_score"] = score
            suggestions.append(template)

    return suggestions
