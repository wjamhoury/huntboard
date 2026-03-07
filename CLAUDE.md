# HuntBoard

AI-powered job search tracker and career pipeline manager. FastAPI + PostgreSQL backend on EC2 (ARM64), React + Vite frontend on S3/CloudFront, Cognito auth, S3 resume storage. Multi-tenant SaaS with Kanban board, AI job scoring via Anthropic API, swipe-to-triage, auto-import from Greenhouse/Workday/Lever/RSS, nightly sync, and email digests.

## Architecture

```
User → CloudFront → S3 (React SPA)
                 ↘ EC2 (FastAPI) → PostgreSQL
                              ↘ S3 (Resumes)
```

**Key Services:**
- **Nightly Sync** — APScheduler runs at 3 AM UTC, syncs all user feeds
- **AI Scoring** — Anthropic Claude scores jobs against user's resume
- **Email Digests** — Daily/weekly summaries at 8 AM UTC
- **Swipe Triage** — Tinder-style interface for reviewing new jobs

**Production:**
- Domain: `huntboard.app`
- EC2: Amazon Linux 2023 ARM64 (Graviton)
- Cognito User Pool: `us-east-1_H05jUkMV7`
- Cognito Client ID: `5gmo5ojqegpnqqi28cnml0o2fb`

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, middleware, routers
│   │   ├── auth.py              # Cognito JWT validation, dev mode bypass
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── dependencies.py      # get_user_db() — returns (db, user)
│   │   ├── scheduler.py         # APScheduler for nightly sync + digests
│   │   ├── models/              # User, Job, Resume, RssFeed, CompanyFeed, JobActivity, UsageEvent, BatchRun
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # jobs, resumes, feeds, companies, ai, analytics, batch, sources, users, admin
│   │   ├── services/            # AI scoring, syncing, email, location parsing, usage tracking
│   │   └── middleware/          # Error handling, rate limiting, security headers, request logging
│   ├── tests/                   # pytest suite (44 tests, including tenant isolation)
│   ├── alembic/                 # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.jsx             # Entry point — configures Amplify FIRST
│   │   ├── App.jsx              # React Router, QueryClient, AuthProvider
│   │   ├── auth/                # AuthProvider, ProtectedRoute, Login/Signup/ForgotPassword pages
│   │   ├── pages/               # KanbanPage, TriagePage, ListPage, JobDetailPage, SettingsPage, etc.
│   │   ├── hooks/               # React Query hooks (useJobs, useTriageJobs, useJobFilters, etc.)
│   │   ├── components/          # FilterBar, ErrorBoundary, ConnectionStatus, kanban/, mobile/
│   │   ├── services/api.js      # Axios instance with auth interceptor
│   │   └── utils/               # errorHandler.js, scoreColors.js
│   ├── .env                     # Local dev config
│   └── .env.production          # Production config
├── infra/terraform/             # AWS infra: VPC, EC2, S3, CloudFront, Cognito, ECR, IAM
├── scripts/                     # deploy-backend.sh, deploy-frontend.sh, deploy-all.sh
├── .github/workflows/           # test.yml (CI), deploy.yml (CD)
├── docker-compose.yml           # Local dev: postgres + backend + frontend
└── Makefile                     # deploy-backend, deploy-frontend, deploy-all, ssh, logs
```

## Development Setup

### Prerequisites

- Docker Desktop
- Node.js 20+
- Python 3.12+
- AWS CLI (for deployment)

### Quick Start

```bash
# Clone and setup
git clone https://github.com/wjamhoury/huntboard.git
cd huntboard
cp .env.example .env  # Add your ANTHROPIC_API_KEY

# Start everything
docker compose up --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

Dev mode (`AUTH_DEV_MODE=true`) bypasses Cognito entirely — uses a hardcoded dev user.

### Common Commands

```bash
# Stop services
docker compose down

# View logs
docker compose logs -f backend

# Run tests
docker compose exec -e AUTH_DEV_MODE=true backend python -m pytest -v tests/

# Run migrations
docker compose exec backend alembic upgrade head

# Generate migration after model change
cd backend && alembic revision --autogenerate -m "description"

# Rebuild after dependency changes
docker compose build frontend && docker compose up -d frontend
```

### Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection (set in docker-compose) |
| `ANTHROPIC_API_KEY` | For AI scoring |
| `AUTH_DEV_MODE` | `true` bypasses auth |
| `AWS_ACCESS_KEY_ID` | For S3 resume storage |
| `AWS_SECRET_ACCESS_KEY` | For S3 resume storage |
| `S3_RESUME_BUCKET` | Resume bucket name |
| `USE_LOCAL_STORAGE` | `true` to skip S3 |
| `VITE_API_URL` | Backend URL (frontend) |
| `VITE_AUTH_DEV_MODE` | `true` skips Cognito (frontend) |

## Database

PostgreSQL 16 (Docker locally, on EC2 in production).

### Models

| Model | Purpose |
|-------|---------|
| `User` | User profile, preferences, onboarding status, target_job_titles |
| `Job` | Job listings with status, AI score, resume_id, notes, parsed location |
| `Resume` | PDF storage references, extracted text |
| `RssFeed` | User's RSS feed subscriptions |
| `CompanyFeed` | Greenhouse/Workday/Lever feeds |
| `JobActivity` | Activity log (status changes, notes, scoring) |
| `UsageEvent` | Lightweight usage tracking |
| `BatchRun` | Sync run history |

### Migrations

```bash
# Local
docker compose exec backend alembic upgrade head

# Production
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 \
  'cd /opt/huntboard && docker compose exec -T backend alembic upgrade head && docker compose restart backend'
```

## Authentication

### Cognito (Production)

- User Pool: `us-east-1_H05jUkMV7`
- Client ID: `5gmo5ojqegpnqqi28cnml0o2fb`
- Frontend uses `aws-amplify` v6 (configured in `main.jsx` BEFORE other imports)
- Backend validates JWTs via JWKS endpoint (`auth.py`)

### Dev Mode

Set `AUTH_DEV_MODE=true` (backend) and `VITE_AUTH_DEV_MODE=true` (frontend) to bypass auth.

## API Conventions

- All endpoints under `/api/v1/` except `/api/health`
- All protected endpoints require `Authorization: Bearer <token>`
- Tenant isolation: every query filters by `user_id` via `get_user_db()` dependency
- Rate limiting: 30/min public, 100/min authenticated, 5/min uploads, 10/min AI

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check (no auth) |
| `GET /api/v1/jobs` | List jobs (supports filters: keyword, location, min_score, status, source, sort) |
| `POST /api/v1/jobs` | Create job |
| `GET /api/v1/jobs/{id}` | Job detail |
| `GET /api/v1/jobs/{id}/activities` | Job activity log |
| `GET /api/v1/jobs/export/csv` | Export jobs as CSV |
| `GET /api/v1/resumes` | List resumes |
| `POST /api/v1/resumes/upload` | Upload resume (multipart) |
| `GET /api/v1/feeds` | List RSS feeds |
| `GET /api/v1/companies` | List company feeds |
| `GET /api/v1/sources/templates` | Browse source catalog (no auth) |
| `POST /api/v1/batch/sync` | Trigger manual sync |
| `POST /api/v1/batch/backfill-resumes` | Assign primary resume to all jobs without one |
| `GET /api/v1/analytics/dashboard` | Dashboard data |
| `GET /api/v1/users/me` | Current user profile |
| `DELETE /api/v1/users/me` | Delete account |

## Key Features

| Feature | Files |
|---------|-------|
| Kanban Board | `frontend/src/pages/KanbanPage.jsx`, `components/kanban/` |
| Swipe Triage | `frontend/src/pages/TriagePage.jsx`, `hooks/useTriageJobs.js` |
| AI Scoring | `backend/app/services/claude_client.py`, `nightly_sync.py`, `routers/batch.py` |
| Source Templates | `backend/app/services/source_templates.py`, `routers/sources.py` |
| Onboarding | `frontend/src/pages/OnboardingPage.jsx`, `User.onboarding_complete` |
| Filters | `frontend/src/components/FilterBar.jsx`, `hooks/useJobFilters.js` |
| Email Digests | `backend/app/services/email_service.py`, `digest_scheduler.py` |
| CSV Export | `backend/app/routers/jobs.py` (`/export/csv`) |
| Mobile UI | `frontend/src/components/mobile/MobileBottomNav.jsx`, `MobileFilterSheet.jsx` |

### Kanban Drag-and-Drop

The Kanban board uses `@dnd-kit/core` for drag-and-drop functionality with the following architecture:

**Components:**
- `KanbanPage.jsx` — Main page with `DndContext`, `DragOverlay`, and drag event handlers
- `KanbanColumn.jsx` — Droppable column using `useDroppable` hook
- `JobCard.jsx` — Sortable card using `useSortable` hook, shows placeholder when dragging
- `JobCardOverlay.jsx` — Floating card preview shown during drag

**Key Features:**
- **DragOverlay** — Shows a lifted card preview with shadow during drag
- **Droppable Columns** — Each column is a drop target with visual highlighting
- **Optimistic Updates** — Status changes update UI immediately, rollback on API failure
- **Touch Support** — Long-press (200ms) activates drag on mobile without interfering with scroll
- **Placeholder** — Original card position shows a dashed placeholder during drag

**Collision Detection:** Uses `pointerWithin` for reliable cross-column drops

### Score Color Utility

All job match score displays use a shared utility for consistent colors across the app:

**File:** `frontend/src/utils/scoreColors.js`

**Color scheme (matches email digests):**
- 80-100: Green (great match)
- 60-79: Yellow/Amber (good match)
- 40-59: Orange (moderate match)
- 0-39: Red (weak match)

**Exports:**
- `getScoreBadgeClasses(score)` — Tailwind classes for badge background + text
- `getScoreBorderClass(score)` — Tailwind classes for left border on job cards
- `getScoreTextClasses(score)` — Tailwind classes for text color only
- `getScoreStrokeClass(score)` — SVG stroke classes for circular progress
- `getScoreHexColor(score)` — Hex color for charts
- `SCORE_RANGE_COLORS` — Color map for histogram ranges

**Job Card Visual Indicators:**
- **Left border** — Colored based on match_score (green=80+, yellow=60-79, orange=40-59, red=0-39, gray=unscored)
- **Score badge** — Shows numeric score with matching background color
- Both use the shared `scoreColors.js` utility for consistency

### Page Structure

**Settings Page (`/settings`):**
- Profile (display name)
- Preferences (sort order, auto-archive)
- Link to Sources & Target Roles (`/import`)
- Data Management (export, delete)
- About section

**Import/Sources Page (`/import`):**
- My Active Sources (collapsible accordion)
- Suggested Sources (collapsible, based on resume)
- Browse Source Catalog (collapsible, default collapsed)
- Add Custom Source (expandable form)
- Target Roles (tag editor)
- Resume Manager
- Sync Schedule Manager

## AI Scoring Pipeline

The AI scoring system is the core value proposition of HuntBoard. It automatically scores job matches against user's resumes or target job titles.

### Scoring Architecture

```
Job Import → Queue for Scoring → Hybrid Score (60% deterministic + 40% AI) → Auto-archive low scores
```

**Files involved:**
- `backend/app/services/claude_client.py` — Hybrid scoring logic (deterministic + Claude API)
- `backend/app/services/candidate_profile.py` — Deterministic scoring rules (title/skill/domain/seniority/location)
- `backend/app/services/nightly_sync.py` — Orchestrates import + scoring
- `backend/app/routers/batch.py` — Manual scoring endpoints

### Supported Resume Formats

HuntBoard accepts PDF resumes for AI scoring. Users can upload:
- Traditional PDF resumes
- **LinkedIn PDF exports** — Users can export their LinkedIn profile as a PDF (Profile → More → Save to PDF) and upload it directly. The AI scorer handles LinkedIn PDFs just like traditional resumes.

Both onboarding and the Resumes page include guidance on how to export a LinkedIn profile as PDF.

### Scoring Modes

1. **With Resumes** — Full hybrid scoring:
   - 60% deterministic (title alignment, skill match, domain, seniority, location)
   - 40% AI semantic analysis (Claude Haiku reads resume text and job description)
   - **ALL user resumes** are passed to the AI (not just primary) — Claude selects best match
   - Returns best-matching `resume_id`

2. **With Target Job Titles Only** (no resume) — Simplified matching:
   - Title matching against user's `target_job_titles` (0-40 points)
   - 60% deterministic component for skills/domain/seniority/location
   - No AI API call (saves costs)
   - `resume_id` is null

3. **With Both** — Hybrid scoring with title boost:
   - Uses resumes for full AI analysis
   - Boosts score if job title matches a target title

### Scoring Trigger Points

Jobs are scored automatically at these points:

| Trigger | Location | Behavior |
|---------|----------|----------|
| Nightly sync (3 AM UTC) | `scheduler.py` → `nightly_sync.run_nightly_sync_for_all_users()` | Scores all unscored jobs for user |
| Manual sync | `POST /api/v1/batch/trigger` | Scores all unscored jobs for the user |
| Selective sync | `POST /api/v1/batch/sync` | Scores if `score_after: true` |
| Manual score | `POST /api/v1/batch/score-jobs` | Scores specific job IDs or all unscored |
| Resume upload | `POST /api/v1/resumes` | Scores all unscored jobs in background |

### Auto-Archive Logic

Low-scoring jobs are auto-archived during sync with these protections:

```python
should_archive = (
    score < 75  # MIN_MATCH_SCORE
    and source not in ("manual", "import_url")  # Never archive user-created
    and status not in ("applied", "interviewing", "offer")  # Never archive active
    and status in ("new", "reviewing")  # Only auto-imported jobs
)
```

### Target Job Titles

Users can specify target roles in addition to (or instead of) uploading a resume.

**User model:**
```python
target_job_titles = Column(JSON, nullable=True, default=list)
# Example: ["Solutions Engineer", "Sales Engineer", "Technical Account Manager"]
```

**Where to set:**
- During onboarding (required if resume skipped)
- On the Import/Sources page (`/import`) — dedicated Target Roles section

### Score Fields on Job Model

| Field | Type | Description |
|-------|------|-------------|
| `match_score` | Integer | 0-100 overall score |
| `resume_id` | FK to Resume | Which resume best matched (null if title-only) |
| `why_good_fit` | JSON | Array of reasons it's a good match |
| `missing_gaps` | JSON | Array of potential gaps |
| `score_detail` | JSON | Breakdown (title_score, skill_score, domain_score, seniority_score, location_score, ai_score) |
| `general_notes` | String | AI's summary explanation |
| `scored_at` | DateTime | When last scored |

### Debugging Scoring Issues

```bash
# Check unscored jobs for a user
docker compose exec backend python -c "
from app.database import SessionLocal
from app.models.job import Job
from app.models.user import User
db = SessionLocal()
user = db.query(User).filter(User.email == 'william.jamhoury@gmail.com').first()
unscored = db.query(Job).filter(Job.user_id == user.id, Job.match_score == None).count()
print(f'Unscored jobs: {unscored}')
"

# Manually trigger scoring for a user
curl -X POST https://huntboard.app/api/v1/batch/trigger \
  -H "Authorization: Bearer <token>"
```

## Deployment

### Automated (Recommended)

Push to `main` triggers GitHub Actions:
- `test.yml` — Runs backend tests + frontend build
- `deploy.yml` — Deploys changed components (backend or frontend)

### Manual

```bash
make deploy-backend   # Build ARM64 image, push to ECR, deploy to EC2
make deploy-frontend  # Build, sync to S3, invalidate CloudFront
make deploy-all       # Both
```

### Infrastructure

| Resource | Value |
|----------|-------|
| EC2 IP | `44.206.144.96` |
| EC2 Instance ID | `i-062dc7a02dc65bfc3` |
| ECR Repository | `290046508532.dkr.ecr.us-east-1.amazonaws.com/huntboard-backend` |
| S3 Frontend Bucket | `huntboard-frontend-1ad1715d` |
| CloudFront Distribution | `E3BXS7N5PX4WPF` |
| Security Group | `sg-088068defef00c259` |
| SSH Key | `~/.ssh/huntboard-ec2.pem` |

### Frontend Build Environment

These must be set during build:

```bash
VITE_API_URL=https://huntboard.app/api/v1
VITE_AUTH_DEV_MODE=false
VITE_COGNITO_USER_POOL_ID=us-east-1_H05jUkMV7
VITE_COGNITO_CLIENT_ID=5gmo5ojqegpnqqi28cnml0o2fb
VITE_COGNITO_DOMAIN=huntboard.auth.us-east-1.amazoncognito.com
VITE_SENTRY_DSN=  # Optional, from GitHub secrets
```

## SSH / EC2 Troubleshooting

### SSH Timeout (IP Changed)

```bash
# Get your current IP
curl -s https://api.ipify.org

# Update security group
OLD_IP=$(aws ec2 describe-security-groups --group-ids sg-088068defef00c259 \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`22\`].IpRanges[0].CidrIp" --output text)
NEW_IP="$(curl -s https://api.ipify.org)/32"

aws ec2 revoke-security-group-ingress --group-id sg-088068defef00c259 --protocol tcp --port 22 --cidr ${OLD_IP}
aws ec2 authorize-security-group-ingress --group-id sg-088068defef00c259 --protocol tcp --port 22 --cidr ${NEW_IP}

# Test
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 'echo "Connected"'
```

### ECR Token Expired

```bash
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 \
  'aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 290046508532.dkr.ecr.us-east-1.amazonaws.com'
```

### View Logs

```bash
make logs  # or:
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 'cd /opt/huntboard && docker compose logs -f --tail=100 backend'
```

## Testing

```bash
# Run all tests
docker compose exec -e AUTH_DEV_MODE=true backend python -m pytest -v tests/

# Run specific test file
docker compose exec -e AUTH_DEV_MODE=true backend python -m pytest -v tests/test_tenant_isolation.py
```

**CRITICAL:** The `test_tenant_isolation.py` tests verify multi-tenant data isolation. All tests must pass.

## GitHub Secrets (CI/CD)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `EC2_HOST` | `44.206.144.96` |
| `EC2_SSH_KEY` | Contents of `huntboard-ec2.pem` |
| `ECR_REGISTRY` | `290046508532.dkr.ecr.us-east-1.amazonaws.com` |
| `COGNITO_USER_POOL_ID` | `us-east-1_H05jUkMV7` |
| `COGNITO_CLIENT_ID` | `5gmo5ojqegpnqqi28cnml0o2fb` |
| `COGNITO_DOMAIN` | `huntboard.auth.us-east-1.amazoncognito.com` |
| `FRONTEND_BUCKET` | `huntboard-frontend-1ad1715d` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E3BXS7N5PX4WPF` |
| `VITE_SENTRY_DSN` | Frontend Sentry DSN (optional) |

## Known Issues / TODO

**Known Issues:**
- `npm audit` shows 22 low/moderate vulnerabilities in `@aws-sdk` (transitive from aws-amplify) — not fixable without Amplify breaking changes
- Pydantic deprecation warnings about class-based `Config` — non-blocking
- Frontend bundle is 1.2MB — consider code-splitting

**Future Features:**
- AI Active Search (paid tier) — proactively find jobs matching profile
- LinkedIn Sign-In — OAuth integration
- Stripe billing — premium features
- Browser extension — save jobs from any page

## Rules for Development

1. Always read this file before starting work
2. Propose changes before implementing — describe what and why
3. Never modify more than 3 files without confirming plan
4. All queries must filter by `user_id` (tenant isolation)
5. Never hardcode credentials
6. Test locally with Docker Compose before production changes
7. Backend images must be ARM64 (`--platform linux/arm64`)
8. After backend deploy, always run migrations and restart
9. Use `@heroicons/react` for icons
10. Use Tailwind CSS — no custom CSS unless necessary
