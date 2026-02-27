# HuntBoard

AI-powered job search tracker and career pipeline manager. Features Kanban board, AI job scoring via Anthropic API, resume management, RSS/company career page feed importing, and batch processing.

**Live at**: [huntboard.app](https://huntboard.app)

## Features

- **Kanban Board** — Drag-and-drop job tracking across statuses (New, Saved, Reviewing, Applied, Interviewing, Offer, Rejected, Archived)
- **AI Match Scoring** — Upload your resume and get AI-powered match scores for each job
- **Swipe to Triage** — Tinder-style card swiping to quickly review new jobs
- **Auto-Import Jobs** — Import from Greenhouse, Workday, Lever career pages and RSS feeds
- **Nightly Sync** — Automatic job syncing with configurable schedule
- **Email Digests** — Daily/weekly email summaries of new high-scoring jobs
- **Dark Mode** — System-aware with manual toggle
- **Mobile Responsive** — Full mobile support with bottom navigation and touch gestures

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Query, dnd-kit
- **Backend**: Python FastAPI, SQLAlchemy ORM, PostgreSQL
- **Auth**: AWS Cognito
- **Infrastructure**: AWS (EC2 ARM64, S3, CloudFront, ECR)
- **CI/CD**: GitHub Actions

## Quick Start (Local Development)

### Prerequisites

- Docker Desktop: https://www.docker.com/products/docker-desktop
- Node.js 20+ (for frontend development)

### Setup

```bash
# Clone the repo
git clone https://github.com/wjamhoury/huntboard.git
cd huntboard

# Copy environment template
cp .env.example .env

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

Open http://localhost:5173 in your browser. Auth is bypassed in dev mode.

### Commands

```bash
# Stop all services
docker compose down

# Rebuild after dependency changes
docker compose build --no-cache && docker compose up -d

# Run backend tests
docker compose exec -e AUTH_DEV_MODE=true backend python -m pytest -v tests/

# Run database migrations
docker compose exec backend alembic upgrade head
```

## Project Structure

```
huntboard/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── auth.py           # Cognito JWT validation
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routers/          # API route handlers
│   │   ├── services/         # Business logic (AI scoring, syncing, etc.)
│   │   └── middleware/       # Request logging, error handling
│   ├── tests/                # pytest test suite
│   ├── alembic/              # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── auth/             # Auth pages and context
│   │   ├── components/       # Reusable React components
│   │   ├── hooks/            # React Query hooks
│   │   ├── pages/            # Page components
│   │   └── services/api.js   # API client
│   └── package.json
├── infra/terraform/          # AWS infrastructure as code
├── scripts/                  # Deployment scripts
├── .github/workflows/        # CI/CD pipelines
└── docker-compose.yml        # Local development
```

## API Documentation

When running locally, visit http://localhost:8000/docs for Swagger UI.

Key endpoints:
- `GET /api/v1/jobs` — List jobs with filtering and sorting
- `POST /api/v1/jobs` — Create a job
- `GET /api/v1/resumes` — List user's resumes
- `POST /api/v1/feeds` — Add an RSS feed
- `POST /api/v1/companies` — Add a company feed (Greenhouse/Workday/Lever)
- `POST /api/v1/batch/sync` — Trigger manual sync
- `GET /api/health` — Health check

## Deployment

Deployments are automated via GitHub Actions on push to `main`. See `CLAUDE.md` for detailed deployment documentation.

Manual deployment:
```bash
make deploy-backend   # Deploy backend only
make deploy-frontend  # Deploy frontend only
make deploy-all       # Deploy both
```

## Security

HuntBoard implements defense-in-depth security measures:

- **Security Headers** — X-Content-Type-Options, X-Frame-Options, CSP, and more
- **Input Validation** — All inputs validated with Pydantic schemas and length limits
- **XSS Prevention** — DOMPurify sanitization for HTML content
- **SQL Injection Protection** — SQLAlchemy ORM with parameterized queries only
- **Rate Limiting** — Per-user and per-IP rate limits via slowapi
- **CORS** — Strict origin allowlist, no wildcards
- **S3 Security** — Presigned URLs with 1-hour expiry, server-side encryption

For security vulnerability reports, please email [security contact] or open a private GitHub issue.

See `CLAUDE.md` for detailed security documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT
