"""
Claude API client for AI-powered job scoring.
Combines deterministic scoring (candidate_profile) with AI semantic analysis.
"""
import logging
import os
import json
from typing import Optional
from anthropic import Anthropic

from app.services.candidate_profile import compute_match_score

logger = logging.getLogger(__name__)


# Use Haiku for cost-effective scoring
MODEL = "claude-3-haiku-20240307"


def get_client() -> Optional[Anthropic]:
    """Get Anthropic client if API key is configured."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    return Anthropic(api_key=api_key)


def score_job_match(
    job_title: str,
    job_company: str,
    job_description: str,
    resumes: list[dict],
    location: str = "",
    remote_type: str = "unknown",
) -> Optional[dict]:
    """
    Score how well a job matches the candidate using a hybrid approach:
    1. Deterministic scoring from candidate_profile (title, skills, domain, seniority, location)
    2. AI semantic analysis for nuance and explanation

    Returns dict with:
    - score: 0-100 match score
    - why_good_fit: list of reasons it's a good match
    - missing_gaps: list of potential gaps
    - reason: brief AI explanation
    - resume_id: ID of best matching resume
    - tokens_used: total tokens consumed
    """
    if not resumes:
        return None

    # Step 1: Deterministic scoring
    deterministic = compute_match_score(
        job_title=job_title,
        job_description=job_description,
        location=location,
        remote_type=remote_type,
    )

    det_score = deterministic["score"]

    # Step 2: AI scoring for semantic analysis
    client = get_client()
    ai_score = None
    ai_reason = ""
    best_resume_id = None
    tokens_used = 0

    if client:
        ai_result = _ai_score(client, job_title, job_company, job_description, resumes)
        if ai_result:
            ai_score = ai_result["score"]
            ai_reason = ai_result["reason"]
            best_resume_id = ai_result.get("resume_id")
            tokens_used = ai_result.get("tokens_used", 0)

            # Merge AI insights into explanations
            if ai_result.get("why_good_fit"):
                for reason in ai_result["why_good_fit"]:
                    if reason not in deterministic["why_good_fit"]:
                        deterministic["why_good_fit"].append(reason)
            if ai_result.get("missing_gaps"):
                for gap in ai_result["missing_gaps"]:
                    if gap not in deterministic["missing_gaps"]:
                        deterministic["missing_gaps"].append(gap)

    # Step 3: Blend scores (60% deterministic, 40% AI)
    if ai_score is not None:
        # AI returns 1-10, convert to 0-100
        ai_normalized = ai_score * 10
        final_score = int(det_score * 0.6 + ai_normalized * 0.4)
    else:
        final_score = det_score

    final_score = max(0, min(100, final_score))

    return {
        "score": final_score,
        "why_good_fit": deterministic["why_good_fit"],
        "missing_gaps": deterministic["missing_gaps"],
        "reason": ai_reason or _build_summary(deterministic),
        "resume_id": best_resume_id,
        "tokens_used": tokens_used,
        "detail": {
            "title_score": deterministic["title_score"],
            "skill_score": deterministic["skill_score"],
            "domain_score": deterministic["domain_score"],
            "seniority_score": deterministic["seniority_score"],
            "location_score": deterministic["location_score"],
            "deterministic_total": det_score,
            "ai_score": ai_score,
        },
    }


def _ai_score(
    client: Anthropic,
    job_title: str,
    job_company: str,
    job_description: str,
    resumes: list[dict],
) -> Optional[dict]:
    """Run AI-based semantic scoring using Claude."""
    desc_truncated = job_description[:2000] if job_description else "No description available"

    resume_summaries = []
    for r in resumes:
        text_preview = r["text"][:1000] if r["text"] else "No text extracted"
        resume_summaries.append(f"Resume #{r['id']} ({r['name']}):\n{text_preview}")

    resumes_text = "\n\n".join(resume_summaries)

    prompt = f"""You are evaluating job fit for a Solutions Engineer / Pre-Sales professional with 10+ years experience in cybersecurity, enterprise SaaS, cloud security, identity management, and technical enablement.

The candidate's strengths:
- Technical discovery, product demos, POCs for enterprise accounts
- Partner enablement, training, certification programs
- Cybersecurity domain (SIEM, endpoint security, zero trust, cloud security)
- Cloud platforms (AWS, Azure), IAM (Okta, SAML, SSO)
- Executive briefings and technical storytelling

JOB TITLE: {job_title}
COMPANY: {job_company}
JOB DESCRIPTION:
{desc_truncated}

CANDIDATE RESUMES:
{resumes_text}

Score this job 1-10 for fit AND provide specific reasons.

Respond with ONLY a JSON object:
{{
  "score": <1-10>,
  "reason": "<1-2 sentence summary>",
  "why_good_fit": ["<specific reason 1>", "<specific reason 2>"],
  "missing_gaps": ["<gap 1>", "<gap 2>"],
  "best_resume_id": <id of best matching resume>
}}"""

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        content = response.content[0].text.strip()

        # Handle markdown code blocks
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        result = json.loads(content)
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        # Validate resume_id
        resume_id = result.get("best_resume_id")
        if resume_id is not None:
            try:
                resume_id = int(resume_id)
            except (ValueError, TypeError):
                resume_id = None

        return {
            "score": max(1, min(10, int(result.get("score", 5)))),
            "reason": result.get("reason", ""),
            "why_good_fit": result.get("why_good_fit", []),
            "missing_gaps": result.get("missing_gaps", []),
            "resume_id": resume_id,
            "tokens_used": tokens_used,
        }

    except Exception as e:
        logger.error(f"Claude API error: {e}")
        return None


def _build_summary(deterministic: dict) -> str:
    """Build a human-readable summary from deterministic scoring."""
    score = deterministic["score"]
    parts = []

    if score >= 75:
        parts.append("Strong match")
    elif score >= 50:
        parts.append("Moderate match")
    else:
        parts.append("Weak match")

    if deterministic["title_score"] >= 20:
        parts.append("with excellent title alignment")
    if deterministic["skill_score"] >= 20:
        parts.append("and strong skill overlap")
    if deterministic["domain_score"] >= 12:
        parts.append("in a relevant domain")

    return ". ".join(parts) + "." if parts else "Score based on profile analysis."
