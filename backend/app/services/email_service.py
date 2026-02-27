"""
Email service for sending digest emails via AWS SES.

Supports dry run mode (DRY_RUN_EMAIL=true) which logs what would be sent
instead of actually sending. This is useful for development and testing
before SES domain verification is complete.

SES Setup Required for Production:
1. Verify domain huntboard.app in SES
2. Add IAM permissions for SES to EC2 role
3. Request production access (sandbox only allows verified emails)
"""
import os
import logging
from typing import Optional
from datetime import datetime
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Configuration
SENDER_EMAIL = "HuntBoard <noreply@huntboard.app>"
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
DRY_RUN_EMAIL = os.getenv("DRY_RUN_EMAIL", "true").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://huntboard.app")


def _get_ses_client():
    """Get boto3 SES client."""
    return boto3.client("ses", region_name=AWS_REGION)


def _generate_unsubscribe_token(user_id: str) -> str:
    """
    Generate a signed token for unsubscribe links.
    Uses a simple JWT-like token with user_id.
    """
    import hashlib
    import base64
    import json

    # Use a simple hash-based token (in production, use proper JWT with secret)
    secret = os.getenv("JWT_SECRET", "huntboard-digest-secret")
    payload = {"user_id": user_id, "purpose": "unsubscribe"}
    payload_json = json.dumps(payload, sort_keys=True)
    signature = hashlib.sha256(f"{payload_json}{secret}".encode()).hexdigest()[:16]
    token_data = base64.urlsafe_b64encode(f"{payload_json}|{signature}".encode()).decode()
    return token_data


def verify_unsubscribe_token(token: str) -> Optional[str]:
    """
    Verify an unsubscribe token and return the user_id if valid.
    Returns None if token is invalid.
    """
    import hashlib
    import base64
    import json

    try:
        secret = os.getenv("JWT_SECRET", "huntboard-digest-secret")
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        payload_json, signature = decoded.rsplit("|", 1)

        # Verify signature
        expected_signature = hashlib.sha256(f"{payload_json}{secret}".encode()).hexdigest()[:16]
        if signature != expected_signature:
            return None

        payload = json.loads(payload_json)
        if payload.get("purpose") != "unsubscribe":
            return None

        return payload.get("user_id")
    except Exception as e:
        logger.warning(f"Invalid unsubscribe token: {e}")
        return None


def _build_digest_html(
    jobs: list,
    period: str,
    unsubscribe_url: str,
) -> str:
    """
    Build the HTML email body for a job digest.

    Args:
        jobs: List of job dicts with title, company, location, match_score, id
        period: "daily" or "weekly"
        unsubscribe_url: URL for unsubscribe link

    Returns:
        HTML string for email body
    """
    job_count = len(jobs)
    period_display = "weekly" if period == "weekly" else "daily"

    # Build job rows
    job_rows = ""
    for job in jobs:
        score = job.get("match_score", 0) or 0
        score_color = "#10b981" if score >= 80 else "#f59e0b" if score >= 60 else "#6b7280"
        job_url = f"{FRONTEND_URL}/jobs/{job.get('id')}"
        location = job.get("location", "Location not specified") or "Location not specified"

        job_rows += f"""
        <tr>
            <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
                <a href="{job_url}" style="color: #2563eb; text-decoration: none; font-weight: 600; font-size: 16px;">
                    {job.get('title', 'Untitled')}
                </a>
                <div style="color: #4b5563; margin-top: 4px;">
                    {job.get('company', 'Unknown Company')}
                </div>
                <div style="color: #9ca3af; font-size: 14px; margin-top: 2px;">
                    {location}
                </div>
            </td>
            <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 80px;">
                <div style="display: inline-block; background-color: {score_color}; color: white; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 14px;">
                    {score}%
                </div>
            </td>
        </tr>
        """

    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your {period_display} job digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 32px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 12px 24px; border-radius: 8px;">
                <span style="color: white; font-size: 24px; font-weight: 700;">HuntBoard</span>
            </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <!-- Title -->
            <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
                <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">
                    Your {period_display} job digest
                </h1>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 16px;">
                    {job_count} new {"match" if job_count == 1 else "matches"} found for you
                </p>
            </div>

            <!-- Jobs Table -->
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f9fafb;">
                        <th style="padding: 12px 16px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                            Position
                        </th>
                        <th style="padding: 12px 16px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                            Match
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {job_rows}
                </tbody>
            </table>

            <!-- CTA Button -->
            <div style="padding: 24px; text-align: center;">
                <a href="{FRONTEND_URL}/board" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    View All Jobs on HuntBoard
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 14px;">
            <p style="margin: 0;">
                You're receiving this because you signed up for HuntBoard job digests.
            </p>
            <p style="margin: 8px 0 0;">
                <a href="{unsubscribe_url}" style="color: #9ca3af; text-decoration: underline;">
                    Unsubscribe
                </a>
                &nbsp;|&nbsp;
                <a href="{FRONTEND_URL}/settings#notifications" style="color: #9ca3af; text-decoration: underline;">
                    Manage preferences
                </a>
            </p>
        </div>
    </div>
</body>
</html>
"""
    return html


def _build_digest_text(
    jobs: list,
    period: str,
    unsubscribe_url: str,
) -> str:
    """Build plain text version of digest email."""
    job_count = len(jobs)
    period_display = "weekly" if period == "weekly" else "daily"

    lines = [
        f"Your {period_display} HuntBoard job digest",
        f"{job_count} new {'match' if job_count == 1 else 'matches'} found for you",
        "",
        "-" * 50,
        "",
    ]

    for job in jobs:
        score = job.get("match_score", 0) or 0
        job_url = f"{FRONTEND_URL}/jobs/{job.get('id')}"
        location = job.get("location", "Location not specified") or "Location not specified"

        lines.extend([
            f"{job.get('title', 'Untitled')} ({score}% match)",
            f"  {job.get('company', 'Unknown Company')}",
            f"  {location}",
            f"  {job_url}",
            "",
        ])

    lines.extend([
        "-" * 50,
        "",
        f"View all jobs: {FRONTEND_URL}/board",
        "",
        f"Unsubscribe: {unsubscribe_url}",
        f"Manage preferences: {FRONTEND_URL}/settings#notifications",
    ])

    return "\n".join(lines)


def send_digest_email(
    user_email: str,
    user_id: str,
    jobs: list,
    period: str,
) -> bool:
    """
    Send a job digest email to a user.

    Args:
        user_email: Recipient email address
        user_id: User ID for generating unsubscribe token
        jobs: List of job dicts to include in digest
        period: "daily" or "weekly"

    Returns:
        True if email was sent (or would be sent in dry run), False on error
    """
    if not jobs:
        logger.debug(f"No jobs to send in digest for {user_email}")
        return False

    # Generate unsubscribe URL
    token = _generate_unsubscribe_token(user_id)
    unsubscribe_url = f"{FRONTEND_URL}/api/v1/users/unsubscribe?token={token}"

    # Build email content
    subject = f"Your {period} HuntBoard digest: {len(jobs)} new {'match' if len(jobs) == 1 else 'matches'}"
    html_body = _build_digest_html(jobs, period, unsubscribe_url)
    text_body = _build_digest_text(jobs, period, unsubscribe_url)

    if DRY_RUN_EMAIL:
        logger.info(
            f"[DRY RUN] Would send digest email to {user_email}\n"
            f"  Subject: {subject}\n"
            f"  Jobs: {len(jobs)}\n"
            f"  Period: {period}\n"
            f"  Top jobs: {[j.get('title') for j in jobs[:3]]}"
        )
        return True

    try:
        client = _get_ses_client()
        response = client.send_email(
            Source=SENDER_EMAIL,
            Destination={
                "ToAddresses": [user_email],
            },
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": text_body, "Charset": "UTF-8"},
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                },
            },
        )
        logger.info(f"Sent digest email to {user_email}, MessageId: {response.get('MessageId')}")
        return True
    except ClientError as e:
        logger.error(f"Failed to send digest email to {user_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending digest email to {user_email}: {e}")
        return False
