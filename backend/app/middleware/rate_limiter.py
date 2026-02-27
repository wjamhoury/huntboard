"""
Rate limiting utilities and key functions.

Provides rate limiting key functions for different scenarios:
- Per-user rate limiting for authenticated endpoints
- Per-IP rate limiting for unauthenticated endpoints
"""
import logging
from typing import Optional

from fastapi import Request

logger = logging.getLogger(__name__)


def get_user_id_or_ip(request: Request) -> str:
    """
    Get a rate limit key based on user ID (if authenticated) or IP address.

    For authenticated users, rate limits are tracked per-user to prevent
    one user from affecting others.

    For unauthenticated requests, rate limits are tracked per-IP.
    """
    # Try to get user from request state (set by auth middleware)
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"

    # Fall back to IP address
    return get_client_ip(request)


def get_client_ip(request: Request) -> str:
    """
    Extract the client's real IP address from the request.

    Handles common proxy headers (X-Forwarded-For, X-Real-IP) to get
    the actual client IP when behind load balancers or proxies.
    """
    # Check X-Forwarded-For header (common with proxies/load balancers)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, first is the client
        return forwarded_for.split(",")[0].strip()

    # Check X-Real-IP header (nginx convention)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct connection IP
    if request.client:
        return request.client.host

    return "unknown"


# Rate limit strings for common scenarios
RATE_LIMIT_AUTH_ENDPOINTS = "10/minute"  # Login, signup, forgot password
RATE_LIMIT_PUBLIC_ENDPOINTS = "30/minute"  # Health check, templates
RATE_LIMIT_STANDARD = "100/minute"  # Standard authenticated endpoints
RATE_LIMIT_EXPENSIVE = "10/minute"  # AI operations, scraping
RATE_LIMIT_UPLOAD = "5/minute"  # File uploads
