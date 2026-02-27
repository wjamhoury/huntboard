"""
Source templates - curated list of popular job sources users can browse and add.

These are NOT auto-added. Users browse and pick which ones they want during
onboarding or from the settings page.
"""

from typing import List, Dict, Any, Optional

# Greenhouse company templates
GREENHOUSE_TEMPLATES = [
    {"name": "Anthropic", "slug": "anthropic", "platform": "greenhouse"},
    {"name": "CrowdStrike", "slug": "crowdstrike", "platform": "greenhouse"},
    {"name": "Datadog", "slug": "datadog", "platform": "greenhouse"},
    {"name": "Palo Alto Networks", "slug": "pabornetworks", "platform": "greenhouse"},
    {"name": "Zscaler", "slug": "zscaler", "platform": "greenhouse"},
    {"name": "Cloudflare", "slug": "cloudflare", "platform": "greenhouse"},
    {"name": "Figma", "slug": "figma", "platform": "greenhouse"},
    {"name": "Notion", "slug": "notion", "platform": "greenhouse"},
    {"name": "Stripe", "slug": "stripe", "platform": "greenhouse"},
    {"name": "OpenAI", "slug": "openai", "platform": "greenhouse"},
    {"name": "MongoDB", "slug": "mongodb", "platform": "greenhouse"},
    {"name": "Confluent", "slug": "confluent", "platform": "greenhouse"},
    {"name": "HashiCorp", "slug": "hashicorp", "platform": "greenhouse"},
    {"name": "Snyk", "slug": "snyk", "platform": "greenhouse"},
    {"name": "Okta", "slug": "okta", "platform": "greenhouse"},
    # Additional cybersecurity companies
    {"name": "SentinelOne", "slug": "sentinelone", "platform": "greenhouse"},
    {"name": "Abnormal Security", "slug": "abnormalsecurity", "platform": "greenhouse"},
    {"name": "1Password", "slug": "1password", "platform": "greenhouse"},
    {"name": "Rubrik", "slug": "rubrik", "platform": "greenhouse"},
    {"name": "Cohesity", "slug": "cohesity", "platform": "greenhouse"},
    {"name": "Axonius", "slug": "axonius", "platform": "greenhouse"},
    {"name": "Drata", "slug": "drata", "platform": "greenhouse"},
    {"name": "Vanta", "slug": "vanta", "platform": "greenhouse"},
    {"name": "Arctic Wolf", "slug": "arcticwolf", "platform": "greenhouse"},
    {"name": "Huntress", "slug": "huntress", "platform": "greenhouse"},
    {"name": "KnowBe4", "slug": "knowbe4", "platform": "greenhouse"},
    {"name": "Recorded Future", "slug": "recordedfuture", "platform": "greenhouse"},
    {"name": "Proofpoint", "slug": "proofpoint", "platform": "greenhouse"},
    # Observability & DevOps
    {"name": "Elastic", "slug": "elastic", "platform": "greenhouse"},
    {"name": "Sumo Logic", "slug": "sumologic", "platform": "greenhouse"},
    {"name": "Cribl", "slug": "cribl", "platform": "greenhouse"},
]

# Workday company templates
WORKDAY_TEMPLATES = [
    {"name": "Cisco", "slug": "cisco", "platform": "workday", "url": "https://cisco.wd5.myworkdayjobs.com/Cisco_Careers"},
    {"name": "Salesforce", "slug": "salesforce", "platform": "workday", "url": "https://salesforce.wd5.myworkdayjobs.com/External_Career_Site"},
    {"name": "VMware", "slug": "vmware", "platform": "workday", "url": "https://vmware.wd1.myworkdayjobs.com/VMware"},
    {"name": "Adobe", "slug": "adobe", "platform": "workday", "url": "https://adobe.wd5.myworkdayjobs.com/external_experienced"},
    {"name": "Dell", "slug": "dell", "platform": "workday", "url": "https://dell.wd1.myworkdayjobs.com/External"},
    {"name": "HP", "slug": "hp", "platform": "workday", "url": "https://hp.wd5.myworkdayjobs.com/ExternalCareerSite"},
    # Additional enterprise companies
    {"name": "CrowdStrike", "slug": "crowdstrike", "platform": "workday", "url": "https://crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers"},
    {"name": "Palo Alto Networks", "slug": "paloaltonetworks", "platform": "workday", "url": "https://paloaltonetworks.wd5.myworkdayjobs.com/Careers"},
    {"name": "Zscaler", "slug": "zscaler", "platform": "workday", "url": "https://zscaler.wd5.myworkdayjobs.com/Careers"},
    {"name": "Fortinet", "slug": "fortinet", "platform": "workday", "url": "https://fortinet.wd1.myworkdayjobs.com/Fortinet"},
    {"name": "Splunk", "slug": "splunk", "platform": "workday", "url": "https://cisco.wd5.myworkdayjobs.com/Splunk_Careers"},
]

# Lever company templates
LEVER_TEMPLATES = [
    {"name": "Tailscale", "slug": "tailscale", "platform": "lever"},
    {"name": "Tines", "slug": "tines", "platform": "lever"},
    {"name": "Temporal", "slug": "temporal", "platform": "lever"},
    {"name": "Kong", "slug": "kong", "platform": "lever"},
    {"name": "Weights & Biases", "slug": "wandb", "platform": "lever"},
    {"name": "Render", "slug": "render", "platform": "lever"},
    {"name": "Fly.io", "slug": "fly-io", "platform": "lever"},
    {"name": "Railway", "slug": "railway", "platform": "lever"},
]

# RSS feed templates
RSS_TEMPLATES = [
    {"name": "Hacker News Jobs", "url": "https://hnrss.org/whoishiring/jobs", "category": "tech_general", "platform": "rss"},
    {"name": "We Work Remotely", "url": "https://weworkremotely.com/remote-jobs.rss", "category": "remote", "platform": "rss"},
    {"name": "RemoteOK", "url": "https://remoteok.com/remote-jobs.rss", "category": "remote", "platform": "rss"},
    {"name": "CyberSecJobs", "url": "https://www.cybersecjobs.com/rss", "category": "cybersecurity", "platform": "rss"},
    # Additional RSS feeds
    {"name": "Remotive - DevOps/SysAdmin", "url": "https://remotive.com/remote-jobs/devops/feed", "category": "devops", "platform": "rss"},
    {"name": "Remotive - Sales", "url": "https://remotive.com/remote-jobs/sales/feed", "category": "sales", "platform": "rss"},
    {"name": "We Work Remotely - DevOps", "url": "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss", "category": "devops", "platform": "rss"},
    {"name": "We Work Remotely - Sales/Marketing", "url": "https://weworkremotely.com/categories/remote-sales-marketing-jobs.rss", "category": "sales", "platform": "rss"},
    {"name": "Jobicy Remote Tech", "url": "https://jobicy.com/feed/job_feed?job_categories=dev,engineering&job_types=full-time", "category": "tech_general", "platform": "rss"},
    {"name": "Built In - Sales Engineering", "url": "https://builtin.com/jobs/sales/solutions-engineer/feed", "category": "sales_engineering", "platform": "rss"},
]


def get_all_templates() -> Dict[str, List[Dict[str, Any]]]:
    """Get all available source templates grouped by platform."""
    return {
        "greenhouse": GREENHOUSE_TEMPLATES,
        "workday": WORKDAY_TEMPLATES,
        "lever": LEVER_TEMPLATES,
        "rss": RSS_TEMPLATES,
    }


def search_templates(query: str) -> List[Dict[str, Any]]:
    """
    Search templates by name, slug, category, or URL.

    Args:
        query: Search string (case-insensitive)

    Returns:
        List of matching templates
    """
    query = query.lower().strip()
    if not query:
        return []

    results = []

    # Search company templates (Greenhouse, Workday, Lever)
    for template in GREENHOUSE_TEMPLATES + WORKDAY_TEMPLATES + LEVER_TEMPLATES:
        if (query in template["name"].lower() or
            query in template["slug"].lower()):
            results.append(template)

    # Search RSS templates
    for template in RSS_TEMPLATES:
        if (query in template["name"].lower() or
            query in template.get("category", "").lower() or
            query in template.get("url", "").lower()):
            results.append(template)

    return results


def get_templates_by_platform(platform: str) -> List[Dict[str, Any]]:
    """Get templates for a specific platform."""
    all_templates = get_all_templates()
    return all_templates.get(platform.lower(), [])


def get_template_by_slug(platform: str, slug: str) -> Optional[Dict[str, Any]]:
    """Find a specific template by platform and slug."""
    templates = get_templates_by_platform(platform)
    for template in templates:
        if template.get("slug") == slug:
            return template
    return None
