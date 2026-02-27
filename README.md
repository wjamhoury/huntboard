# HuntBoard

**AI-powered job search tracker and career pipeline manager.**

Track applications, auto-import jobs from 60+ companies, and let AI score your best matches.

[huntboard.app](https://huntboard.app) — Free to use

<!-- TODO: Add screenshot of the board -->

## Features

- **Auto-Import Jobs** — Import from Greenhouse, Workday, Lever career pages and RSS feeds
- **AI Match Scoring** — Upload your resume and get AI-powered match scores for each job
- **Swipe to Triage** — Tinder-style card swiping to quickly review new jobs
- **Track Everything** — Kanban board with statuses: New, Saved, Reviewing, Applied, Interviewing, Offer, Rejected, Archived
- **Analytics Dashboard** — Application funnel, score distribution, activity over time
- **Location & Keyword Filters** — Find remote jobs, filter by score, search by keyword
- **Email Digests** — Daily/weekly email summaries of new high-scoring jobs
- **CSV Export** — Export all your job data anytime

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Query, dnd-kit
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy, Alembic
- **Infrastructure**: AWS (EC2, S3, CloudFront, Cognito, SES, ECR)
- **AI**: Anthropic Claude for job-resume matching
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Node.js 20+ (optional, for frontend development)

### Setup

```bash
git clone https://github.com/wjamhoury/huntboard.git
cd huntboard
cp .env.example .env  # Fill in your ANTHROPIC_API_KEY
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

Auth is bypassed in dev mode — you'll be logged in as a test user automatically.

### Commands

```bash
docker compose down             # Stop all services
docker compose logs -f backend  # View backend logs
docker compose exec backend alembic upgrade head  # Run migrations
```

## Deployment

Deployments are automated via GitHub Actions on push to `main`.

Manual deployment:
```bash
make deploy-backend   # Deploy backend to EC2
make deploy-frontend  # Deploy frontend to S3/CloudFront
make deploy-all       # Deploy both
```

See [CLAUDE.md](CLAUDE.md) for detailed deployment and development documentation.

## Security

HuntBoard implements defense-in-depth security:

- **Security Headers** — X-Content-Type-Options, X-Frame-Options, CSP, and more
- **Input Validation** — All inputs validated with Pydantic schemas and length limits
- **XSS Prevention** — DOMPurify sanitization for HTML content
- **SQL Injection Protection** — SQLAlchemy ORM with parameterized queries only
- **Rate Limiting** — Per-user and per-IP rate limits
- **CORS** — Strict origin allowlist, no wildcards
- **S3 Security** — Presigned URLs with 1-hour expiry, server-side encryption

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run tests: `docker compose exec -e AUTH_DEV_MODE=true backend python -m pytest -v tests/`
5. Submit a pull request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Built By

William Jamhoury — [LinkedIn](https://www.linkedin.com/in/williamjamhoury/)
