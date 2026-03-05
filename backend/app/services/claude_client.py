"""
Claude API client for AI-powered job scoring.
Combines deterministic scoring (candidate_profile) with AI semantic analysis.

Scoring modes:
1. With resumes: Full hybrid scoring (60% deterministic + 40% AI using resume text)
2. With target_job_titles only: Simplified title matching (no AI call to save costs)
3. With both: Hybrid scoring with title boost
"""
import logging
import os
import json
from typing import Optional, List
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


def score_job_with_titles_only(
    job_title: str,
    job_company: str,
    job_description: str,
    target_titles: List[str],
    location: str = "",
    remote_type: str = "unknown",
) -> Optional[dict]:
    """
    Score a job using only target job titles (no resume).
    Uses a simplified matching approach focused on title similarity.

    This is used when users haven't uploaded a resume but have specified
    what roles they're targeting.

    Returns dict with:
    - score: 0-100 match score
    - why_good_fit: list of reasons it's a good match
    - missing_gaps: list of potential gaps
    - reason: brief explanation
    - resume_id: None (no resume)
    - tokens_used: 0 (no AI call)
    """
    if not target_titles:
        return None

    job_title_lower = job_title.lower()
    target_titles_lower = [t.lower() for t in target_titles]

    # Title matching score (0-40)
    title_score = 0
    matched_title = None
    for target in target_titles_lower:
        # Exact match
        if target in job_title_lower or job_title_lower in target:
            title_score = 40
            matched_title = target
            break
        # Partial word match (e.g., "engineer" in both)
        target_words = set(target.split())
        job_words = set(job_title_lower.split())
        overlap = target_words & job_words
        word_score = len(overlap) * 10
        if word_score > title_score:
            title_score = word_score
            matched_title = target

    # Deterministic scoring for the rest (skills, domain, seniority, location)
    deterministic = compute_match_score(
        job_title=job_title,
        job_description=job_description,
        location=location,
        remote_type=remote_type,
    )

    # Combine: 40% title match, 60% deterministic (rescaled)
    det_contribution = int(deterministic["score"] * 0.6)
    final_score = title_score + det_contribution
    final_score = max(0, min(100, final_score))

    # Build explanations
    why_good_fit = []
    missing_gaps = []

    if title_score >= 30:
        why_good_fit.append(f"Job title closely matches your target: '{matched_title}'")
    elif title_score >= 15:
        why_good_fit.append(f"Job title has some overlap with your targets")
    else:
        missing_gaps.append("Job title doesn't closely match your target roles")

    # Add relevant deterministic explanations
    why_good_fit.extend(deterministic.get("why_good_fit", [])[:2])
    missing_gaps.extend(deterministic.get("missing_gaps", [])[:2])

    reason = f"Score based on title match with your targets: {', '.join(target_titles[:3])}"
    if final_score >= 75:
        reason = f"Strong match - title aligns with your target roles"
    elif final_score >= 50:
        reason = f"Moderate match - some alignment with target roles"
    else:
        reason = f"Weak match - title differs from your target roles"

    return {
        "score": final_score,
        "why_good_fit": why_good_fit[:4],
        "missing_gaps": missing_gaps[:4],
        "reason": reason,
        "resume_id": None,
        "tokens_used": 0,
        "detail": {
            "title_match_score": title_score,
            "deterministic_contribution": det_contribution,
            "skill_score": deterministic.get("skill_score", 0),
            "domain_score": deterministic.get("domain_score", 0),
            "seniority_score": deterministic.get("seniority_score", 0),
            "location_score": deterministic.get("location_score", 0),
            "ai_score": None,
        },
    }


def score_job_match(
    job_title: str,
    job_company: str,
    job_description: str,
    resumes: list[dict],
    location: str = "",
    remote_type: str = "unknown",
    target_job_titles: Optional[List[str]] = None,
) -> Optional[dict]:
    """
    Score how well a job matches the candidate using a hybrid approach:
    1. Deterministic scoring from candidate_profile (title, skills, domain, seniority, location)
    2. AI semantic analysis for nuance and explanation

    If no resumes but target_job_titles provided, uses simplified title matching.
    If both resumes and target_job_titles provided, adds a title match boost.

    Returns dict with:
    - score: 0-100 match score
    - why_good_fit: list of reasons it's a good match
    - missing_gaps: list of potential gaps
    - reason: brief AI explanation
    - resume_id: ID of best matching resume
    - tokens_used: total tokens consumed
    """
    # If no resumes, fall back to title-only scoring
    if not resumes:
        if target_job_titles:
            return score_job_with_titles_only(
                job_title=job_title,
                job_company=job_company,
                job_description=job_description,
                target_titles=target_job_titles,
                location=location,
                remote_type=remote_type,
            )
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
        ai_result = _ai_score(client, job_title, job_company, job_description, resumes, target_job_titles)
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
    target_job_titles: Optional[List[str]] = None,
) -> Optional[dict]:
    """Run AI-based semantic scoring using Claude."""
    desc_truncated = job_description[:2000] if job_description else "No description available"

    # Build resume context from actual resume content
    resume_summaries = []
    for r in resumes:
        text_preview = r["text"][:1500] if r["text"] else "No text extracted"
        resume_summaries.append(f"Resume #{r['id']} ({r['name']}):\n{text_preview}")

    resumes_text = "\n\n".join(resume_summaries)

    # Build target roles context if provided
    target_roles_context = ""
    if target_job_titles:
        target_roles_context = f"\nThe candidate is specifically targeting these roles: {', '.join(target_job_titles[:5])}\n"

    prompt = f"""You are evaluating job fit for a candidate based on their resume(s).

CANDIDATE RESUMES:
{resumes_text}
{target_roles_context}
JOB TITLE: {job_title}
COMPANY: {job_company}
JOB DESCRIPTION:
{desc_truncated}

Based on the candidate's experience shown in their resume(s), score this job 1-10 for fit.
Consider:
- How well the job title matches roles the candidate is qualified for
- Overlap between required skills and the candidate's demonstrated experience
- Whether the seniority level is appropriate
- Domain/industry alignment

Respond with ONLY a JSON object:
{{
  "score": <1-10>,
  "reason": "<1-2 sentence summary of the fit>",
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
