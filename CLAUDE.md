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
│   │   └── utils/               # errorHandler.js
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
| `User` | User profile, preferences, onboarding status |
| `Job` | Job listings with status, AI score, notes, parsed location |
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
| Swipe Triage | `frontend/src/pages/TriagePage.jsx`, `hooks/useTriageJobs.js` |
| AI Scoring | `backend/app/services/anthropic_client.py`, `routers/ai.py` |
| Source Templates | `backend/app/services/source_templates.py`, `routers/sources.py` |
| Onboarding | `frontend/src/pages/OnboardingPage.jsx`, `User.onboarding_complete` |
| Filters | `frontend/src/components/FilterBar.jsx`, `hooks/useJobFilters.js` |
| Email Digests | `backend/app/services/email_service.py`, `digest_scheduler.py` |
| CSV Export | `backend/app/routers/jobs.py` (`/export/csv`) |
| Mobile UI | `frontend/src/components/mobile/MobileBottomNav.jsx`, `MobileFilterSheet.jsx` |

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
