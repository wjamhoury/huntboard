"""
Location parser service for normalizing job location strings.

Parses location strings from job listings and extracts:
- city, state, country
- is_remote, is_hybrid flags
"""

import re
from typing import Optional, TypedDict


class ParsedLocation(TypedDict):
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    is_remote: bool
    is_hybrid: bool


# US state abbreviations to full names
US_STATES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
}

# Reverse mapping: full state name to abbreviation
STATE_TO_ABBREV = {v.lower(): k for k, v in US_STATES.items()}

# Country codes and common country names
COUNTRY_CODES = {
    'US': 'US', 'USA': 'US', 'UNITED STATES': 'US', 'U.S.': 'US', 'U.S.A.': 'US',
    'UK': 'UK', 'UNITED KINGDOM': 'UK', 'GB': 'UK', 'ENGLAND': 'UK',
    'CA': 'CA', 'CANADA': 'CA',
    'DE': 'DE', 'GERMANY': 'DE',
    'FR': 'FR', 'FRANCE': 'FR',
    'AU': 'AU', 'AUSTRALIA': 'AU',
    'IN': 'IN', 'INDIA': 'IN',
    'SG': 'SG', 'SINGAPORE': 'SG',
    'JP': 'JP', 'JAPAN': 'JP',
    'IL': 'IL', 'ISRAEL': 'IL',
    'NL': 'NL', 'NETHERLANDS': 'NL',
    'IE': 'IE', 'IRELAND': 'IE',
    'CH': 'CH', 'SWITZERLAND': 'CH',
    'SE': 'SE', 'SWEDEN': 'SE',
    'ES': 'ES', 'SPAIN': 'ES',
    'IT': 'IT', 'ITALY': 'IT',
    'BR': 'BR', 'BRAZIL': 'BR',
    'MX': 'MX', 'MEXICO': 'MX',
}

# Remote work indicators
REMOTE_KEYWORDS = ['remote', 'work from home', 'wfh', 'anywhere', 'distributed', 'telecommute']
HYBRID_KEYWORDS = ['hybrid', 'flexible', 'partial remote', 'some remote']


def parse_location(location_str: Optional[str]) -> ParsedLocation:
    """
    Parse a location string and extract normalized components.

    Examples:
        "New York, NY" -> city="New York", state="NY", country="US"
        "Remote" -> is_remote=True
        "Remote - US" -> is_remote=True, country="US"
        "San Francisco, CA (Hybrid)" -> city="San Francisco", state="CA", is_hybrid=True
        "London, UK" -> city="London", country="UK"
        "Austin, Texas" -> city="Austin", state="TX", country="US"
    """
    result: ParsedLocation = {
        'city': None,
        'state': None,
        'country': None,
        'is_remote': False,
        'is_hybrid': False,
    }

    if not location_str:
        return result

    # Normalize input
    location = location_str.strip()
    location_lower = location.lower()

    # Check for remote indicators
    for keyword in REMOTE_KEYWORDS:
        if keyword in location_lower:
            result['is_remote'] = True
            break

    # Check for hybrid indicators
    for keyword in HYBRID_KEYWORDS:
        if keyword in location_lower:
            result['is_hybrid'] = True
            break

    # If only "Remote" with possibly a country, handle specially
    if location_lower.startswith('remote'):
        # Try to extract country from "Remote - US" or "Remote (US)" patterns
        country_match = re.search(r'remote\s*[-–—/]\s*(\w+)', location_lower)
        if not country_match:
            country_match = re.search(r'remote\s*\(([^)]+)\)', location_lower)

        if country_match:
            country_str = country_match.group(1).strip().upper()
            if country_str in COUNTRY_CODES:
                result['country'] = COUNTRY_CODES[country_str]
        return result

    # Remove remote/hybrid indicators and parenthetical notes for parsing location
    clean_location = re.sub(r'\s*\([^)]*\)', '', location)  # Remove (Hybrid), (Remote), etc.
    clean_location = re.sub(r'\s*[-–—/]\s*(remote|hybrid|wfh).*$', '', clean_location, flags=re.IGNORECASE)
    clean_location = clean_location.strip()

    if not clean_location:
        return result

    # Split by comma and analyze parts
    parts = [p.strip() for p in clean_location.split(',')]

    if len(parts) == 1:
        # Single value: could be city, state, or country
        part = parts[0]
        part_upper = part.upper()
        part_lower = part.lower()

        # Check if it's a country
        if part_upper in COUNTRY_CODES:
            result['country'] = COUNTRY_CODES[part_upper]
        # Check if it's a US state abbreviation
        elif part_upper in US_STATES:
            result['state'] = part_upper
            result['country'] = 'US'
        # Check if it's a US state full name
        elif part_lower in STATE_TO_ABBREV:
            result['state'] = STATE_TO_ABBREV[part_lower]
            result['country'] = 'US'
        else:
            # Assume it's a city
            result['city'] = _title_case(part)

    elif len(parts) == 2:
        # Two parts: typically "City, State" or "City, Country"
        city_part = parts[0]
        second_part = parts[1].strip()
        second_upper = second_part.upper()
        second_lower = second_part.lower()

        # Check if second part is US state abbreviation
        if second_upper in US_STATES:
            result['city'] = _title_case(city_part)
            result['state'] = second_upper
            result['country'] = 'US'
        # Check if second part is US state full name
        elif second_lower in STATE_TO_ABBREV:
            result['city'] = _title_case(city_part)
            result['state'] = STATE_TO_ABBREV[second_lower]
            result['country'] = 'US'
        # Check if second part is a country
        elif second_upper in COUNTRY_CODES:
            result['city'] = _title_case(city_part)
            result['country'] = COUNTRY_CODES[second_upper]
        else:
            # Assume "City, Region/Province" - just store city
            result['city'] = _title_case(city_part)

    elif len(parts) >= 3:
        # Three or more parts: typically "City, State, Country" or "City, Region, Country"
        city_part = parts[0]
        state_part = parts[1].strip()
        country_part = parts[-1].strip()

        state_upper = state_part.upper()
        state_lower = state_part.lower()
        country_upper = country_part.upper()

        result['city'] = _title_case(city_part)

        # Check if second part is US state
        if state_upper in US_STATES:
            result['state'] = state_upper
        elif state_lower in STATE_TO_ABBREV:
            result['state'] = STATE_TO_ABBREV[state_lower]

        # Check country
        if country_upper in COUNTRY_CODES:
            result['country'] = COUNTRY_CODES[country_upper]
        elif result['state'] and result['state'] in US_STATES:
            result['country'] = 'US'

    return result


def _title_case(s: str) -> str:
    """
    Convert string to title case, handling common edge cases.
    """
    # Handle already uppercase abbreviations
    if len(s) <= 3 and s.isupper():
        return s

    # Standard title case
    return ' '.join(word.capitalize() for word in s.split())


def update_job_location(job, location_str: Optional[str] = None):
    """
    Update a Job model instance with parsed location data.
    Uses job.location if location_str is not provided.

    Args:
        job: SQLAlchemy Job model instance
        location_str: Optional location string to parse (defaults to job.location)
    """
    location_to_parse = location_str if location_str is not None else job.location
    parsed = parse_location(location_to_parse)

    job.location_city = parsed['city']
    job.location_state = parsed['state']
    job.location_country = parsed['country']
    job.is_remote = parsed['is_remote']
    job.is_hybrid = parsed['is_hybrid']

    return job
