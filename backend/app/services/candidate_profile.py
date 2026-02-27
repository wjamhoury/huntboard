"""
Candidate profile module - extracts and structures the candidate's background
from resume text for use in job matching and filtering.

This is the single source of truth for:
- Target titles and seniority
- Skill weights and domain expertise
- Negative filters (roles to exclude)
- Keyword priorities
"""

# ──────────────────────────────────────────────────────────────────────
# TARGET TITLES (ordered by relevance)
# ──────────────────────────────────────────────────────────────────────
TARGET_TITLES = [
    "solutions engineer",
    "sales engineer",
    "solutions architect",
    "partner solutions architect",
    "partner solutions engineer",
    "technical enablement manager",
    "sales enablement",
    "customer success architect",
    "technical account manager",
    "customer engineer",
    "field engineer",
    "pre-sales engineer",
    "presales engineer",
    "pre-sales consultant",
    "demo engineer",
    "overlay engineer",
    "technical sales engineer",
    "sales consultant",
    "systems engineer",  # in context of pre-sales / vendor SE roles
    "partner engineer",
    "channel solutions engineer",
    "field solutions architect",
    "enterprise solutions engineer",
    "senior solutions engineer",
    "staff solutions engineer",
    "principal solutions engineer",
    "director of solutions engineering",
    "se manager",
    "solutions engineering manager",
]

# Abbreviated forms that need word-boundary matching
TARGET_TITLE_ABBREVIATIONS = [
    "se ",
    " se,",
    " se-",
    "sa ",
    " sa,",
    " sa-",
]

# ──────────────────────────────────────────────────────────────────────
# SENIORITY LEVEL
# ──────────────────────────────────────────────────────────────────────
SENIORITY_LEVEL = "senior"  # 10+ years experience, director-level titles
MIN_YEARS_EXPERIENCE = 8
ACCEPTABLE_SENIORITY_LABELS = [
    "senior", "staff", "principal", "lead", "director", "manager",
    "mid-senior", "mid-senior level",
]
REJECT_SENIORITY_LABELS = [
    "entry", "entry level", "junior", "intern", "internship",
    "associate", "graduate", "new grad",
]

# ──────────────────────────────────────────────────────────────────────
# CORE SKILLS (weighted 1-10 for matching priority)
# ──────────────────────────────────────────────────────────────────────
SKILL_WEIGHTS = {
    # Pre-sales & customer-facing (highest weight)
    "technical discovery": 10,
    "product demonstrations": 10,
    "proof of concept": 10,
    "poc": 10,
    "pre-sales": 10,
    "presales": 10,
    "demos": 9,
    "rfp": 9,
    "rfi": 9,
    "competitive positioning": 9,
    "executive briefings": 9,
    "technical storytelling": 9,

    # Enablement
    "technical enablement": 9,
    "sales enablement": 9,
    "partner enablement": 9,
    "training development": 8,
    "lms": 7,
    "onboarding": 7,
    "certification program": 8,

    # Partner / Channel
    "partner": 8,
    "channel": 8,
    "co-sell": 8,
    "oem": 7,
    "partner portal": 7,
    "deal registration": 6,

    # Cybersecurity domain
    "cybersecurity": 9,
    "cyber recovery": 8,
    "ransomware": 8,
    "siem": 7,
    "endpoint security": 7,
    "zero trust": 8,
    "cloud security": 8,
    "security architecture": 8,
    "pentest": 6,

    # Cloud & Infrastructure
    "aws": 7,
    "azure": 7,
    "cloud platforms": 7,
    "saas": 8,
    "virtualization": 6,
    "vmware": 6,
    "hyper-v": 5,
    "citrix": 5,

    # Identity & Access
    "identity": 7,
    "iam": 7,
    "okta": 7,
    "saml": 6,
    "sso": 6,
    "active directory": 5,

    # Tools
    "salesforce": 5,
    "jira": 4,
    "confluence": 4,

    # GTM & Business
    "enterprise": 7,
    "b2b": 7,
    "mid-market": 6,
    "fortune 500": 7,
    "customer-facing": 8,
    "gtm": 7,
    "go-to-market": 7,
}

# ──────────────────────────────────────────────────────────────────────
# DOMAIN EXPERTISE
# ──────────────────────────────────────────────────────────────────────
DOMAIN_KEYWORDS = [
    "cybersecurity",
    "cloud security",
    "saas",
    "enterprise software",
    "security",
    "identity",
    "cloud infrastructure",
    "devops",
    "data protection",
    "backup",
    "disaster recovery",
    "networking",
]

# ──────────────────────────────────────────────────────────────────────
# NEGATIVE FILTERS - Roles to EXCLUDE
# ──────────────────────────────────────────────────────────────────────
EXCLUDE_TITLE_PATTERNS = [
    # Pure software engineering
    "software engineer",
    "software developer",
    "backend engineer",
    "frontend engineer",
    "full stack engineer",
    "fullstack engineer",
    "full-stack engineer",
    "devops engineer",
    "sre ",
    "site reliability",
    "data engineer",
    "data scientist",
    "machine learning engineer",
    "ml engineer",
    "ai engineer",
    "platform engineer",
    "infrastructure engineer",
    "security engineer",  # pure infra security, not SE
    "qa engineer",
    "test engineer",
    "mobile engineer",
    "ios engineer",
    "android engineer",
    "embedded engineer",

    # Support-only roles
    "help desk",
    "helpdesk",
    "desktop support",
    "it support",
    "technical support specialist",
    "support technician",
    "it technician",
    "it administrator",
    "network administrator",

    # Entry-level / intern
    "intern",
    "internship",
    "junior",
    "entry level",
    "entry-level",
    "graduate program",
    "new grad",

    # Commission-only / pure sales
    "commission only",
    "commission-only",
    "business development representative",
    "bdr",
    "sdr",
    "sales development representative",
    "account executive",  # pure quota-carrying AE, not technical
    "account manager",  # unless "technical account manager"
    "inside sales",
    "outside sales rep",
    "territory manager",

    # Other non-fits
    "recruiter",
    "talent acquisition",
    "hr ",
    "human resources",
    "marketing manager",
    "product manager",
    "program manager",
    "project manager",
    "scrum master",
    "ux designer",
    "ui designer",
    "graphic designer",
    "content writer",
    "copywriter",
    "legal",
    "finance",
    "accountant",
    "controller",
]

# Titles that look like negatives but ARE good fits (override exclusions)
TITLE_OVERRIDES_KEEP = [
    "technical account manager",
    "solutions engineer",
    "sales engineer",
    "se manager",
    "security solutions",
    "security sales engineer",
    "partner solutions",
    "systems engineer" ,  # vendor SE roles
]

# ──────────────────────────────────────────────────────────────────────
# LOCATION PREFERENCES
# ──────────────────────────────────────────────────────────────────────
PREFERRED_REMOTE_TYPES = ["remote", "hybrid"]
PREFERRED_LOCATIONS = [
    "remote",
    "united states",
    "usa",
    "us",
    "burlington",
    "vermont",
    "new york",
    "boston",
    "northeast",
    "east coast",
]

# ──────────────────────────────────────────────────────────────────────
# COMPANY DOMAIN TARGETS (for career page discovery)
# ──────────────────────────────────────────────────────────────────────
TARGET_COMPANY_DOMAINS = [
    "cybersecurity",
    "cloud security",
    "identity security",
    "endpoint security",
    "network security",
    "saas",
    "cloud infrastructure",
    "devops tools",
    "data protection",
    "observability",
    "siem",
    "xdr",
    "zero trust",
]

# ──────────────────────────────────────────────────────────────────────
# TARGET COMPANIES (for direct scraping)
# ──────────────────────────────────────────────────────────────────────
TARGET_COMPANIES_GREENHOUSE = [
    {"company_name": "Okta", "token": "okta"},
    {"company_name": "Datadog", "token": "datadog"},
    {"company_name": "Cloudflare", "token": "cloudflare"},
    {"company_name": "Elastic", "token": "elastic"},
    {"company_name": "SentinelOne", "token": "sentinelone"},
    {"company_name": "Snyk", "token": "snyk"},
    {"company_name": "HashiCorp", "token": "hashicorp"},
    {"company_name": "Lacework", "token": "lacework"},
    {"company_name": "Abnormal Security", "token": "abnormalsecurity"},
    {"company_name": "Wiz", "token": "waboratory"},
    {"company_name": "Cribl", "token": "criaboratories"},
    {"company_name": "Tines", "token": "taboratories"},
    {"company_name": "1Password", "token": "1password"},
    {"company_name": "Tailscale", "token": "tailscale"},
    {"company_name": "Sumo Logic", "token": "sumologic"},
    {"company_name": "Recorded Future", "token": "recordedfuture"},
    {"company_name": "Mimecast", "token": "mimecast"},
    {"company_name": "Proofpoint", "token": "proofpoint"},
    {"company_name": "KnowBe4", "token": "knowbe4"},
    {"company_name": "Rubrik", "token": "rubrik"},
    {"company_name": "Cohesity", "token": "cohesity"},
    {"company_name": "Druva", "token": "druva"},
    {"company_name": "Axonius", "token": "axonius"},
    {"company_name": "Orca Security", "token": "aboratories"},
    {"company_name": "Drata", "token": "drata"},
    {"company_name": "Vanta", "token": "vanta"},
    {"company_name": "Arctic Wolf", "token": "arcticwolf"},
    {"company_name": "Huntress", "token": "huntress"},
    {"company_name": "Torq", "token": "torq"},
]

TARGET_COMPANIES_WORKDAY = [
    {"company_name": "CrowdStrike", "url": "https://crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers"},
    {"company_name": "Palo Alto Networks", "url": "https://paloaltonetworks.wd5.myworkdayjobs.com/Careers"},
    {"company_name": "Zscaler", "url": "https://zscaler.wd5.myworkdayjobs.com/Careers"},
    {"company_name": "Fortinet", "url": "https://fortinet.wd1.myworkdayjobs.com/Fortinet"},
    {"company_name": "Cisco", "url": "https://cisco.wd5.myworkdayjobs.com/Cisco_Careers"},
    {"company_name": "Splunk", "url": "https://cisco.wd5.myworkdayjobs.com/Splunk_Careers"},
]

TARGET_COMPANIES_LEVER = [
    {"company_name": "Tailscale", "slug": "tailscale"},
    {"company_name": "Tines", "slug": "tines"},
    {"company_name": "Temporal", "slug": "temporal"},
    {"company_name": "Kong", "slug": "kong"},
    {"company_name": "Weights & Biases", "slug": "wandb"},
    {"company_name": "Render", "slug": "render"},
    {"company_name": "Fly.io", "slug": "fly-io"},
    {"company_name": "Railway", "slug": "railway"},
]


def should_exclude_title(title: str) -> bool:
    """Check if a job title should be excluded based on negative filters."""
    title_lower = title.lower()

    # First check overrides - if it matches an override, keep it
    for override in TITLE_OVERRIDES_KEEP:
        if override in title_lower:
            return False

    # Check exclusion patterns
    for pattern in EXCLUDE_TITLE_PATTERNS:
        if pattern in title_lower:
            return True

    return False


def matches_target_title(title: str) -> bool:
    """Check if a job title matches our target titles."""
    title_lower = f" {title.lower()} "

    for target in TARGET_TITLES:
        if target in title_lower:
            return True

    for abbrev in TARGET_TITLE_ABBREVIATIONS:
        if abbrev in title_lower:
            return True

    return False


def calculate_title_alignment_score(job_title: str) -> int:
    """
    Score how well a job title aligns with target titles.
    Returns 0-25 (component of total 100-point score).
    """
    title_lower = job_title.lower()

    # Exact match with primary targets
    primary_titles = [
        "solutions engineer", "sales engineer", "solutions architect",
        "partner solutions architect", "partner solutions engineer",
        "technical enablement manager",
    ]
    for t in primary_titles:
        if t in title_lower:
            return 25

    # Strong match with secondary targets
    secondary_titles = [
        "pre-sales", "presales", "customer engineer", "field engineer",
        "sales enablement", "customer success architect",
        "technical account manager", "demo engineer",
    ]
    for t in secondary_titles:
        if t in title_lower:
            return 20

    # Partial match
    partial_titles = [
        "solutions", "enablement", "partner engineer", "overlay",
        "sales consultant", "systems engineer",
    ]
    for t in partial_titles:
        if t in title_lower:
            return 12

    return 0


def calculate_skill_match_score(text: str) -> int:
    """
    Score skill alignment from job description text.
    Returns 0-35 (component of total 100-point score).
    """
    text_lower = text.lower()
    matched_weight = 0
    max_possible = sum(sorted(SKILL_WEIGHTS.values(), reverse=True)[:15])  # Top 15 skills

    for skill, weight in SKILL_WEIGHTS.items():
        if skill in text_lower:
            matched_weight += weight

    # Normalize to 0-35 range
    raw_score = (matched_weight / max_possible) * 35 if max_possible > 0 else 0
    return min(35, int(raw_score))


def calculate_domain_score(text: str) -> int:
    """
    Score domain alignment.
    Returns 0-20 (component of total 100-point score).
    """
    text_lower = text.lower()
    matches = sum(1 for kw in DOMAIN_KEYWORDS if kw in text_lower)
    # 3+ domain matches = full score
    return min(20, int((matches / 3) * 20))


def calculate_seniority_score(title: str, description: str) -> int:
    """
    Score seniority alignment.
    Returns 0-10 (component of total 100-point score).
    """
    combined = f"{title} {description}".lower()

    # Reject if clearly entry-level
    for label in REJECT_SENIORITY_LABELS:
        if label in combined:
            return 0

    # Good if senior+
    for label in ACCEPTABLE_SENIORITY_LABELS:
        if label in combined:
            return 10

    # Check for years of experience mentioned
    import re
    years_match = re.search(r'(\d+)\+?\s*years?\s*(of\s+)?experience', combined)
    if years_match:
        years = int(years_match.group(1))
        if years >= 7:
            return 10
        elif years >= 4:
            return 7
        elif years >= 2:
            return 4
        else:
            return 0

    # No seniority signal - neutral
    return 5


def calculate_location_score(location: str, remote_type: str) -> int:
    """
    Score location fit.
    Returns 0-10 (component of total 100-point score).
    """
    if remote_type == "remote":
        return 10

    location_lower = location.lower()
    for pref in PREFERRED_LOCATIONS:
        if pref in location_lower:
            return 8 if remote_type == "hybrid" else 6

    if remote_type == "hybrid":
        return 4

    return 2  # Onsite in unknown location


def compute_match_score(
    job_title: str,
    job_description: str,
    location: str = "",
    remote_type: str = "unknown",
) -> dict:
    """
    Compute a comprehensive match score (0-100) for a job.

    Returns:
        {
            "score": int (0-100),
            "title_score": int,
            "skill_score": int,
            "domain_score": int,
            "seniority_score": int,
            "location_score": int,
            "why_good_fit": [str],
            "missing_gaps": [str],
        }
    """
    title_score = calculate_title_alignment_score(job_title)
    skill_score = calculate_skill_match_score(job_description)
    domain_score = calculate_domain_score(job_description)
    seniority_score = calculate_seniority_score(job_title, job_description)
    location_score = calculate_location_score(location, remote_type)

    total = title_score + skill_score + domain_score + seniority_score + location_score

    # Build explanations
    why_good_fit = []
    missing_gaps = []

    if title_score >= 20:
        why_good_fit.append(f"Title '{job_title}' aligns well with target roles")
    elif title_score >= 12:
        why_good_fit.append(f"Title has partial alignment with target roles")
    else:
        missing_gaps.append("Title does not match target SE/pre-sales/enablement roles")

    if skill_score >= 20:
        why_good_fit.append("Strong overlap with core pre-sales and security skills")
    elif skill_score >= 10:
        why_good_fit.append("Some relevant skill overlap")
    else:
        missing_gaps.append("Limited overlap with core skill set")

    if domain_score >= 12:
        why_good_fit.append("Strong domain fit (cybersecurity/SaaS/cloud)")
    elif domain_score >= 6:
        why_good_fit.append("Some domain relevance")
    else:
        missing_gaps.append("Outside primary domain expertise (security/SaaS/cloud)")

    if seniority_score >= 7:
        why_good_fit.append("Appropriate seniority level")
    elif seniority_score == 0:
        missing_gaps.append("Role appears too junior for experience level")

    if location_score >= 8:
        why_good_fit.append("Remote or preferred location")
    elif location_score <= 3:
        missing_gaps.append("Location may require relocation")

    # Check for specific high-value keywords
    desc_lower = job_description.lower()
    if "proof of concept" in desc_lower or "poc" in desc_lower:
        why_good_fit.append("Involves POC/proof-of-concept work")
    if "partner" in desc_lower and "enablement" in desc_lower:
        why_good_fit.append("Partner enablement component")

    return {
        "score": min(100, total),
        "title_score": title_score,
        "skill_score": skill_score,
        "domain_score": domain_score,
        "seniority_score": seniority_score,
        "location_score": location_score,
        "why_good_fit": why_good_fit,
        "missing_gaps": missing_gaps,
    }
