def generate_cover_letter_prompt(job_title: str, company: str, job_description: str, resume_text: str) -> str:
    """Generate a prompt for Claude to write a tailored cover letter."""

    prompt = f"""Write a cover letter for the following job application. The letter should sound like it was written by a real person, not a template.

## JOB DETAILS
**Position:** {job_title}
**Company:** {company}

**Job Description:**
{job_description if job_description else "No job description provided."}

---

## CANDIDATE'S RESUME
{resume_text if resume_text else "No resume provided."}

---

## WRITING REQUIREMENTS

**Tone:** Professional and conversational. Write like you're talking to a smart colleague, not addressing a royal court. Be confident without being arrogant. Be enthusiastic without being desperate.

**Structure:**
- Opening: Start with something specific about why this role or company caught your attention. Get to the point quickly.
- Middle (1-2 paragraphs): Connect your actual experience to what they need. Use real examples from the resume. Be specific, not generic.
- Closing: Brief, forward-looking, and confident. No groveling.

**Length:** 250-350 words. Hiring managers are busy.

**CRITICAL STYLE RULES - MUST FOLLOW:**
- NEVER use em-dashes (—). Use commas, periods, or rewrite the sentence instead.
- NEVER use semicolons. Use shorter sentences.
- NEVER start with "I am writing to apply" or "I am excited to apply" or similar
- NEVER use phrases like "I believe I would be a great fit" or "I am confident that"
- NEVER use "leverage," "synergy," "utilize," or corporate buzzwords
- NEVER use "passion" or "passionate" - show interest through specifics instead
- NEVER end with "I look forward to hearing from you" - be more original
- Use contractions naturally (I'm, I've, don't, won't) when it sounds right
- Keep sentences punchy. If a sentence has more than 25 words, split it.
- Use "and" instead of "&"
- Write actively, not passively ("I built X" not "X was built by me")

**What makes a good cover letter:**
- It sounds like a specific person wrote it for a specific job
- It shows you understand what the company actually does
- It connects your experience to their needs with concrete examples
- It has personality without being unprofessional
- Someone could read it aloud without cringing

**Output format:**
First, the complete cover letter ready to copy and use.

Then, under a "## Interview Prep" heading, list 2-3 specific talking points based on the strongest connections between the resume and job requirements.

Write the cover letter now:"""

    return prompt


def generate_resume_tailor_prompt(job_title: str, company: str, job_description: str, resume_text: str) -> str:
    """Generate a prompt for Claude to suggest resume tailoring."""

    prompt = f"""You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist. Analyze the following resume against the job description and provide specific recommendations to tailor the resume for this role.

## TARGET JOB
**Position:** {job_title}
**Company:** {company}

**Job Description:**
{job_description if job_description else "No job description provided."}

---

## CURRENT RESUME
{resume_text if resume_text else "No resume provided."}

---

## ANALYSIS REQUESTED

Please provide:

### 1. KEYWORD GAP ANALYSIS
- List important keywords/skills from the job description that are missing or underrepresented in the resume
- Identify which keywords the candidate likely has experience with but hasn't highlighted

### 2. EXPERIENCE REFRAMING
For each relevant position in the resume, suggest:
- Bullet points to add or modify to better match job requirements
- Metrics or achievements that could be quantified
- Technical skills or tools that should be emphasized

### 3. SKILLS SECTION OPTIMIZATION
- Recommend which skills to add, remove, or reorder
- Suggest specific technical terms or certifications to include

### 4. SUMMARY/OBJECTIVE REWRITE
Write a new professional summary (3-4 sentences) tailored specifically for this role

### 5. ATS OPTIMIZATION TIPS
- Formatting suggestions to improve ATS parsing
- Keyword placement recommendations

### 6. RED FLAGS OR GAPS
- Identify any potential concerns a recruiter might have
- Suggest how to address or mitigate these in the resume or cover letter

### 7. PRIORITY ACTIONS
List the top 5 changes that would have the biggest impact, in order of importance

Please provide your analysis now:"""

    return prompt


def generate_resume_match_prompt(job_title: str, company: str, job_description: str, resumes: list) -> str:
    """Generate a prompt for Claude to analyze which resume best matches the job."""

    resumes_text = ""
    for i, resume in enumerate(resumes, 1):
        resumes_text += f"""
---
### RESUME {i}: {resume['filename']}
{resume['text'] if resume['text'] else "No text extracted."}
"""

    prompt = f"""You are an expert career advisor and recruiter. Analyze the following job posting against multiple resumes to determine which resume is the best match and provide detailed guidance.

## TARGET POSITION
**Job Title:** {job_title}
**Company:** {company}

**Job Description:**
{job_description if job_description else "No job description provided."}

---

## CANDIDATE'S RESUMES
{resumes_text if resumes_text else "No resumes provided."}

---

## ANALYSIS REQUESTED

### 1. RESUME RANKING (Score each 1-10)

For each resume, provide:
- **Score:** X/10
- **Summary:** One sentence explaining the score
- **Best for this role:** Yes/No

| Resume | Score | Key Strength | Main Gap |
|--------|-------|--------------|----------|
| (fill in for each resume) |

### 2. RECOMMENDED RESUME
Clearly state which resume is the BEST FIT for this specific job and why.

### 3. MATCHING SKILLS & EXPERIENCE
List the specific skills, experiences, and qualifications from the recommended resume that directly match the job requirements:
- ✅ (matching item 1)
- ✅ (matching item 2)
- etc.

### 4. GAPS & MISSING REQUIREMENTS
List requirements from the job description that are NOT evident in the recommended resume:
- ❌ (gap 1)
- ❌ (gap 2)
- etc.

### 5. BULLET POINTS TO EMPHASIZE
From the recommended resume, list the specific bullet points or experiences that should be highlighted when applying:
1. (bullet point or experience to emphasize)
2. (bullet point or experience to emphasize)
3. etc.

### 6. INTERVIEW TALKING POINTS
Based on the match analysis, suggest 3-5 talking points the candidate should prepare:
1. (talking point)
2. (talking point)
3. etc.

### 7. OVERALL ASSESSMENT
- **Match Level:** Strong Match / Moderate Match / Weak Match
- **Application Recommendation:** Highly Recommend / Recommend / Consider / Skip
- **Key Advice:** (one paragraph of strategic advice for this application)

Please provide your complete analysis now:"""

    return prompt
