# HuntBoard

AI-powered job search tracker and career pipeline manager. Migrated from a single-user SQLite app ("JobHunter") to a multi-tenant PostgreSQL SaaS. Features Kanban board, AI job scoring via Anthropic API, resume management with S3 storage, RSS/company career page feed importing, and batch processing.

## Architecture

### Local Dev
- **Frontend**: React 18 + Vite (port 5173), Tailwind CSS, React Query, dnd-kit
- **Backend**: Python FastAPI (port 8000), SQLAlchemy ORM
- **Database**: PostgreSQL 16 via Docker Compose
- **Auth**: DEV MODE — bypassed entirely. `AUTH_DEV_MODE=true` on backend returns a hardcoded dev user. `VITE_AUTH_DEV_MODE=true` on frontend skips Cognito and uses a fake user object.
- **Proxy**: Vite dev server proxies `/api` → `localhost:8000`

### Production (AWS)
- **Frontend**: React SPA built with Vite, uploaded to S3, served via CloudFront (domain: `huntboard.app`)
- **Backend**: FastAPI in Docker on EC2 (Amazon Linux 2023 ARM64, pulled from ECR). CloudFront routes `/api/*` to EC2 via custom origin on port 80.
- **Database**: PostgreSQL on the same EC2 instance
- **Auth**: AWS Cognito User Pool (`us-east-1_H05jUkMV7`), client ID `5gmo5ojqegpnqqi28cnml0o2fb`. Frontend uses `aws-amplify` v6 for signIn/signUp/fetchAuthSession. Backend validates Cognito JWTs via JWKS endpoint using `python-jose`.
- **Storage**: S3 bucket `huntboard-resumes-prod` for resume PDFs
- **DNS/SSL**: Route53 + ACM certificate, CloudFront distribution
- **Infra-as-Code**: Terraform in `infra/terraform/`
- **Cost target**: <$7/month

## Directory Map

```
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, routers, health check, SPA static serving
│   │   ├── auth.py           # Cognito JWT validation, dev mode bypass
│   │   ├── database.py       # SQLAlchemy engine + session (PostgreSQL)
│   │   ├── dependencies.py   # get_user_db() dependency (returns db session + user)
│   │   ├── logging_config.py # JSON structured logging
│   │   ├── scheduler.py      # APScheduler for nightly batch sync and email digests
│   │   ├── middleware/       # Middleware modules (ErrorHandlerMiddleware)
│   │   ├── models/           # SQLAlchemy models (User, Job, Resume, Feed, Company, BatchRun)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── routers/          # API route handlers (jobs, resumes, feeds, ai, companies, analytics, batch)
│   ├── alembic/              # Database migrations
│   ├── uploads/              # Local resume storage fallback
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.jsx          # Entry point — imports amplifyConfig FIRST
│   │   ├── amplifyConfig.js  # Configures Amplify with Cognito pool (hardcoded IDs)
│   │   ├── App.jsx           # React Router, QueryClient, AuthProvider wrapper
│   │   ├── auth/
│   │   │   ├── AuthProvider.jsx       # Auth context: login, signup, logout, getAccessToken
│   │   │   ├── ProtectedRoute.jsx     # Redirects to /login if not authenticated
│   │   │   ├── LoginPage.jsx          # Email/password + LinkedIn OAuth login
│   │   │   ├── SignupPage.jsx         # Registration with email confirmation
│   │   │   ├── ForgotPasswordPage.jsx # 3-step password reset flow
│   │   │   └── ChangePasswordPage.jsx # Change password for logged-in users
│   │   ├── services/api.js   # Axios instance with auth interceptor, all API methods
│   │   ├── hooks/            # React Query hooks (useJobs, useSources, useTriageJobs, useJobFilters, useSync, useResumes, useJobDetail, useSettings)
│   │   ├── utils/errorHandler.js # Error handling utilities for API calls
│   │   ├── components/       # Reusable components (FilterBar, ListView, ErrorBoundary, ConnectionStatus, SyncScheduleManager, kanban/)
│   │   ├── layouts/AppLayout.jsx  # Sidebar nav, dark mode toggle, mobile nav
│   │   └── pages/            # KanbanPage, ListPage, TriagePage, DashboardPage, ImportPage, ResumesPage, OnboardingPage, SettingsPage, JobDetailPage, LandingPage, PrivacyPage, TermsPage
│   ├── .env                  # Local: VITE_API_URL=http://localhost:8000/api/v1, VITE_AUTH_DEV_MODE=true
│   ├── .env.production       # Prod: VITE_API_URL=https://api.huntboard.app/api/v1, VITE_AUTH_DEV_MODE=false
│   ├── vite.config.js
│   └── Dockerfile
├── infra/terraform/          # All AWS infra: VPC, EC2, S3, CloudFront, Cognito, ECR, IAM, ACM, Route53
├── scripts/
│   ├── deploy-backend.sh     # Build, push to ECR, deploy to EC2
│   ├── deploy-frontend.sh    # Build with prod env vars, sync to S3, invalidate CloudFront
│   └── deploy-all.sh         # Full deploy (backend + frontend)
├── Makefile                  # One-command deploys and utilities
├── docker-compose.yml        # Local dev: postgres + backend + frontend
├── .env                      # Root env (API keys, AWS creds — gitignored)
└── .env.example              # Template for .env
```

## Auth Flow

### Local Dev
1. `VITE_AUTH_DEV_MODE=true` → AuthProvider sets a fake DEV_USER immediately
2. ProtectedRoute sees `isAuthenticated=true`, renders content
3. API interceptor sends `Authorization: Bearer dev-token`
4. Backend sees `AUTH_DEV_MODE=true`, returns hardcoded dev user for all requests

### Production
1. User hits `/board` → ProtectedRoute checks `isAuthenticated` (false) → redirects to `/login`
2. User submits email/password → `signIn()` via aws-amplify → Cognito SRP auth
3. On success, AuthProvider calls `getCurrentUser()` + sets user state
4. ProtectedRoute sees `isAuthenticated=true` → renders AppLayout + page
5. Every API call: axios interceptor calls `fetchAuthSession()` → gets `accessToken` → sends as `Bearer` header
6. Backend: `get_current_user()` extracts JWT → fetches JWKS from Cognito → validates token → returns `{id, email, name}`
7. `get_user_db()` dependency auto-creates User record on first login

## API Routes (all prefixed `/api/v1`)

| Router       | Prefix          | Key Endpoints |
|-------------|-----------------|---------------|
| jobs        | /jobs           | CRUD, bulk delete/status, import-url, check-url, export-matched, export/csv, /{id}/activities |
| resumes     | /resumes        | CRUD, upload (multipart), get text, set primary |
| feeds       | /feeds          | CRUD, refresh, reset, toggle |
| ai          | /ai             | cover-letter-prompt, resume-tailor-prompt, match-analysis |
| companies   | /companies      | CRUD, refresh, reset, toggle |
| analytics   | /analytics      | GET (with optional days param) |
| batch       | /batch          | trigger, status, score-jobs, runs, sources, sync, schedule |
| sources     | /sources        | templates (public), suggestions (auth required) |
| users       | /users          | GET /me, PATCH /me (profile + onboarding + preferences), DELETE /me (account deletion) |
| health      | /api/health     | DB connectivity check (not under /v1) |

## Key Environment Variables

### Backend (set in .env or docker-compose)
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — For AI scoring/analysis
- `AUTH_DEV_MODE` — "true" bypasses Cognito auth entirely
- `COGNITO_USER_POOL_ID` — Cognito pool for JWT validation
- `COGNITO_APP_CLIENT_ID` — Cognito client for audience check
- `AWS_REGION` — Default us-east-1
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — For S3 resume storage
- `S3_RESUME_BUCKET` — Bucket name for resumes
- `USE_LOCAL_STORAGE` — "true" stores resumes locally instead of S3
- `FRONTEND_URL` — Added to CORS allowed origins
- `NIGHTLY_SYNC_HOUR` / `NIGHTLY_SYNC_ENABLED` — Scheduler config
- `DRY_RUN_EMAIL` — "true" logs emails instead of sending via SES (default: true)
- `JWT_SECRET` — Secret for signing email unsubscribe tokens

### Frontend (set in .env / .env.production, must be prefixed VITE_)
- `VITE_API_URL` — Backend API base URL
- `VITE_AUTH_DEV_MODE` — "true" skips Cognito, uses fake user
- `VITE_COGNITO_USER_POOL_ID` — Used by amplifyConfig (currently hardcoded instead)
- `VITE_COGNITO_CLIENT_ID` — Used by amplifyConfig (currently hardcoded instead)
- `VITE_COGNITO_DOMAIN` — For LinkedIn OAuth redirect

## Commands

### One-Command Deploys (Recommended)

```bash
# Deploy backend only
make deploy-backend

# Deploy frontend only
make deploy-frontend

# Deploy both
make deploy-all

# Other useful make targets
make dev              # Start local dev environment
make ssh              # SSH to EC2 production server
make logs             # Tail production logs
make db-backup        # Download database backup to backup-YYYY-MM-DD.sql
```

### Local Development

```bash
# Docker (recommended)
docker compose up -d            # Start all services
docker compose down             # Stop
docker compose logs -f backend  # Tail backend logs

# Manual (without Docker)
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```

**IMPORTANT: Frontend Dependencies**

The frontend Docker container only mounts `src/` and `public/` directories. If you add new npm dependencies:
```bash
# Rebuild the frontend container to pick up new dependencies
docker compose build frontend
docker compose up -d frontend
```
This is required because `node_modules` is baked into the Docker image at build time.

### Database Migrations

```bash
# Run migrations (required after any model changes)
cd backend && alembic upgrade head

# Or via Docker Compose (for local dev):
docker compose exec backend alembic upgrade head

# Run migrations in PRODUCTION:
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 'cd /opt/huntboard && docker compose exec -T backend alembic upgrade head'

# Check current migration state:
docker compose exec backend alembic current  # local
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 'cd /opt/huntboard && docker compose exec -T backend alembic current'  # prod

# Generate a new migration after model changes
cd backend && alembic revision --autogenerate -m "description"
```

**CRITICAL: Production Migration Sync**

After deploying, ALWAYS run migrations in production AND restart the backend:
```bash
# 1. Run migration
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 'cd /opt/huntboard && docker compose exec -T backend alembic upgrade head'

# 2. Restart backend to pick up schema changes
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 'cd /opt/huntboard && docker compose restart backend'
```

If migrations get out of sync (alembic says "head" but columns are missing), manually add columns:
```bash
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 'cd /opt/huntboard && docker compose exec -T db psql -U huntboard -d huntboard -c "ALTER TABLE tablename ADD COLUMN IF NOT EXISTS colname TYPE;"'
```

### Manual Deploy Steps (use `make` commands above instead)

```bash
# Deploy frontend to S3 (after build)
aws s3 sync frontend/dist/ s3://huntboard-frontend-1ad1715d --delete
aws cloudfront create-invalidation --distribution-id E3BXS7N5PX4WPF --paths "/*"

# Deploy backend to production
cd backend && docker build --platform linux/arm64 -t huntboard-backend:latest .
docker tag huntboard-backend:latest 290046508532.dkr.ecr.us-east-1.amazonaws.com/huntboard-backend:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 290046508532.dkr.ecr.us-east-1.amazonaws.com
docker push 290046508532.dkr.ecr.us-east-1.amazonaws.com/huntboard-backend:latest
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 'cd /opt/huntboard && docker compose pull && docker compose up -d'
```

## Production Infrastructure

- **EC2 IP**: 44.206.144.96
- **EC2 Instance ID**: i-062dc7a02dc65bfc3
- **ECR Repository**: 290046508532.dkr.ecr.us-east-1.amazonaws.com/huntboard-backend
- **S3 Frontend Bucket**: huntboard-frontend-1ad1715d
- **CloudFront Distribution ID**: E3BXS7N5PX4WPF
- **SSH Key**: ~/.ssh/huntboard-ec2.pem
- **Security Group**: sg-088068defef00c259 (huntboard-ec2-sg)
- **Production docker-compose**: /opt/huntboard/docker-compose.yml (on EC2)
- **Production .env**: /opt/huntboard/.env (on EC2, contains DB_PASSWORD, ANTHROPIC_API_KEY, SERPAPI_KEY)

### SSH Access / Security Group

The EC2 security group restricts SSH (port 22) to a single IP address for security. If SSH times out during deployment, your public IP has likely changed.

**To fix SSH access:**
```bash
# 1. Get your current public IP
curl -s https://api.ipify.org

# 2. Check current SSH rule
aws ec2 describe-security-groups --group-ids sg-088068defef00c259 \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`22\`].IpRanges[0].CidrIp" --output text

# 3. Remove old IP and add new IP
OLD_IP="<old-ip-from-step-2>"
NEW_IP="$(curl -s https://api.ipify.org)"
aws ec2 revoke-security-group-ingress --group-id sg-088068defef00c259 --protocol tcp --port 22 --cidr ${OLD_IP}
aws ec2 authorize-security-group-ingress --group-id sg-088068defef00c259 --protocol tcp --port 22 --cidr ${NEW_IP}/32

# 4. Test SSH
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 'echo "Connected"'
```

**ECR Token Expiration:** If docker pull fails with "authorization token expired" on EC2, re-authenticate:
```bash
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96 \
  'aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 290046508532.dkr.ecr.us-east-1.amazonaws.com'
```

## Job Source Architecture

Job sources are fully user-specific (multi-tenant). Each user manages their own feeds.

### Source Types
- **RSS Feeds** (`RssFeed` model): User-configured RSS feed URLs
- **Company Feeds** (`CompanyFeed` model): Greenhouse, Workday, or Lever career pages
  - `feed_type`: "greenhouse", "workday", or "lever"
  - `greenhouse_board_token`: For Greenhouse (e.g., "anthropic")
  - `workday_url`: Full Workday careers URL
  - `lever_slug`: For Lever (e.g., "tailscale")
- **Google Jobs**: SerpAPI-powered, standalone source (not user-configured)

### Source Templates
`backend/app/services/source_templates.py` contains curated templates users can browse and add:
- 31 Greenhouse companies, 11 Workday, 8 Lever, 10 RSS feeds
- Endpoint: `GET /api/v1/sources/templates` (public, no auth)
- Search: `GET /api/v1/sources/templates?search=anthropic`

### Import Page UI
The Import Sources page (`frontend/src/pages/ImportPage.jsx`) has these sections:
1. **My Active Sources** — Shows user's feeds with platform badge, enabled toggle, last sync time, job count
2. **Suggested Sources** — Resume-based recommendations (only shows if user has uploaded a resume)
3. **Source Catalog** — Tabbed browse interface for templates (Greenhouse/Workday/Lever/RSS) with search
4. **Add Custom Source** — Expandable form to add custom sources with validation

Supporting components:
- `frontend/src/components/SyncScheduleManager.jsx` — Nightly sync schedule and manual sync controls
- `frontend/src/hooks/useSources.js` — React Query hooks: `useSourceTemplates`, `useSourceSuggestions`, `useMyFeeds`, `useAddFromTemplate`, `useAddCustomSource`, `useToggleSource`, `useDeleteSource`

### Resume-Driven Source Suggestions
The `backend/app/services/resume_analyzer.py` module provides keyword-based source suggestions:
- Analyzes user's primary resume text for keywords (skills, job titles, industry terms)
- Maps keywords to relevant source template slugs using `KEYWORD_SOURCE_MAP`
- Returns top 15 suggestions sorted by relevance score (keyword match count)
- Endpoint: `GET /api/v1/sources/suggestions` (requires auth)
- If no resume uploaded, returns `has_resume: false` with a message to upload one
- Frontend hook: `useSourceSuggestions()` in `useSources.js`

### Key Design Decisions
- **No auto-seeding**: New users start with zero feeds (empty state)
- **No hardcoded company lists**: All syncing uses user's configured feeds from DB
- **Nightly sync iterates per-user**: Each user's enabled feeds are synced independently
- The `candidate_profile.py` file still contains `TARGET_COMPANIES_*` constants but they are NO LONGER USED for syncing (kept for reference only)

## Mobile Responsiveness

### Breakpoints
- **Mobile**: < 768px (`md:` Tailwind breakpoint)
- Tested at 375px (iPhone SE) and 390px (iPhone 14)

### Navigation Pattern

**Mobile (< 768px)**:
- Desktop sidebar is completely hidden (`hidden md:block`)
- Bottom tab bar with 4 primary items: Board, Triage (with badge), List, Sources
- "More" button opens slide-up sheet with: Dashboard, Resumes, Settings, Dark Mode toggle, Sign out
- Component: `frontend/src/components/mobile/MobileBottomNav.jsx`

**Desktop (>= 768px)**:
- Full sidebar navigation visible
- Bottom nav hidden (`md:hidden`)

### Mobile UI Patterns

**Modals and Sheets**:
- On mobile: Slide-up from bottom with rounded top corners (`rounded-t-2xl`)
- On desktop: Centered floating modal (`md:rounded-lg`)
- Example: ConfirmModal, MobileFilterSheet

**Filter Bar**:
- Mobile: Single "Filters" button that opens full-screen `MobileFilterSheet`
- Active filter chips displayed below the button
- Component: `frontend/src/components/mobile/MobileFilterSheet.jsx`
- Desktop: Inline filter inputs

**Kanban Board**:
- Mobile: Horizontal scroll with snap scrolling (`snap-x snap-mandatory`)
- Column tabs at top showing status name and job count
- Tap tab to scroll to column
- Desktop: All columns visible in flex row

**Triage/Swipe Cards**:
- Touch events handled via `onTouchStart`, `onTouchMove`, `onTouchEnd`
- Prevents page scroll while swiping (but allows card content scrolling)
- Card fills most of screen width (`inset-x-4`)
- Large thumb-friendly action buttons at bottom (min 72px touch target)

**Forms/Inputs**:
- Mobile: Larger padding (`py-3`) for better touch targets (min 44px height)
- Desktop: Standard padding (`md:py-2`)
- All inputs use `text-base` to prevent iOS zoom on focus

### Touch Event Handling

```jsx
// Pattern for swipe gestures
const onTouchStart = (e) => {
  const touch = e.touches[0]
  startPos.current = { x: touch.clientX, y: touch.clientY }
}

const onTouchMove = (e) => {
  const touch = e.touches[0]
  // Calculate delta, detect swipe direction
  // Prevent default only when actually swiping (not scrolling content)
  if (isSwiping) e.preventDefault()
}

const onTouchEnd = () => {
  // Trigger action based on swipe threshold
}
```

### CSS Utilities

Located in `frontend/src/index.css`:

```css
/* Hide scrollbar for horizontal scroll */
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }

/* Vertical text for collapsed Kanban columns */
.writing-mode-vertical { writing-mode: vertical-rl; text-orientation: mixed; }

/* Safe area for iOS notch/home indicator */
.safe-area-pb { padding-bottom: env(safe-area-inset-bottom); }

/* Touch action for swipe */
.touch-pan-y { touch-action: pan-y; }
```

### Tailwind Config Extensions

Located in `frontend/tailwind.config.js`:
- `animate-fade-in`, `animate-slide-up`, `animate-slide-down` — Mobile sheet animations
- Safe area padding utilities

### Viewport Configuration

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```
- `user-scalable=no` prevents double-tap zoom which interferes with swipe gestures

### Page-Specific Mobile Notes

- **All pages**: Add `pb-20 md:pb-0` to main content to avoid overlap with bottom nav
- **KanbanPage**: Uses `TouchSensor` with 250ms delay to allow scrolling vs dragging
- **TriagePage**: Card content is scrollable (`overflow-y-auto`) if it overflows
- **JobDetailPanel**: Full-screen on mobile (`inset-0 md:inset-y-0 md:left-auto md:right-0`)

## Rules for Claude Code

- Always read this file before starting work
- Propose changes before implementing — describe what you'll change and why
- Never modify more than 3 files without confirming the plan first
- When debugging, check environment variables and auth flow FIRST
- Target operational cost: <$7/month on AWS
- Always preserve multi-tenant isolation (all queries must filter by user_id)
- Never hardcode credentials or secrets
- Frontend uses Tailwind CSS — no custom CSS unless absolutely necessary
- All API endpoints require authentication via get_user_db dependency (except /sources/templates)
- Test locally with Docker Compose before suggesting production changes
- Backend Docker image must be built for ARM64 (`--platform linux/arm64`) for EC2
- **After deploying backend changes, ALWAYS run migrations in production and restart the backend**
- When adding new frontend dependencies, install them before deploying (`npm install <package>`)
- Use `@heroicons/react` for icons (already installed)

## Frontend Patterns

### React Query Hooks
Custom hooks live in `frontend/src/hooks/`. Pattern for CRUD operations:
- `useXxx()` — Query hook for fetching data
- `useCreateXxx()` — Mutation with automatic cache invalidation
- `useUpdateXxx()` / `useDeleteXxx()` — Mutations that invalidate relevant queries

### Toast Notifications
Use `react-hot-toast` for user feedback:
```javascript
import toast from 'react-hot-toast'
toast.success('Action completed')
toast.error('Something went wrong')
```
Toaster is configured in `App.jsx` with dark mode support.

### Component Organization
- Large page components can define sub-components inline (e.g., `MyActiveSources`, `SourceCatalog` in ImportPage.jsx)
- Reusable components go in `frontend/src/components/`
- UI primitives (ConfirmModal, Skeleton) go in `frontend/src/components/ui/`

## Error Handling Architecture

### Backend Error Handling
- **ErrorHandlerMiddleware** (`backend/app/middleware/error_handler.py`): Global middleware that catches unhandled exceptions and returns user-friendly JSON error responses
- Error messages are logged with full stack traces, but users see friendly messages like:
  - AI scoring fails: "AI scoring is temporarily unavailable. Your jobs have been saved and will be scored on the next sync."
  - Feed sync fails: "Could not reach [source name]. It will be retried on the next sync."
  - Resume parse fails: "Could not extract text from this PDF. Please try a different file."
  - S3 upload fails: "File upload failed. Please try again."
- The middleware is added after CORS in `main.py`

### Frontend Error Handling
- **ErrorBoundary** (`frontend/src/components/ErrorBoundary.jsx`): React class component that catches render errors and shows a friendly "Something went wrong" page with Reload/Go to Board buttons. Shows technical details in dev mode.
- **ConnectionStatus** (`frontend/src/components/ConnectionStatus.jsx`): Banner component that monitors `/api/health` endpoint every 30 seconds. Shows warning banner when connection fails, auto-clears when restored.
- **Error Handler Utility** (`frontend/src/utils/errorHandler.js`): Centralized error handling for API calls:
  - `getErrorMessage(error, operation)` — Returns user-friendly message based on status code
  - `handleApiError(error, operation)` — Shows toast notification with friendly message
  - Status code mappings: 401 → "Session expired", 403 → "No permission", 404 → "Not found", 429 → "Too many requests", 500 → "Server error"
  - Network errors → "Could not connect to the server"
- **React Query Hooks**: All mutation hooks now have `onError` callbacks that use `handleApiError()` to show toast notifications

### Health Check
- Backend: `GET /api/health` (not under /v1) — Checks DB connectivity, returns `{status, version, database}`
- Frontend: `healthApi.check()` — Polls every 30 seconds, triggers ConnectionStatus banner on failure

## Onboarding Flow

New users are guided through a 4-step onboarding wizard before accessing the main app.

### Backend
- `User.onboarding_complete` — Boolean column, defaults to `False` for new users
- `GET /api/v1/users/me` — Returns user profile including `onboarding_complete`
- `PATCH /api/v1/users/me` — Updates profile fields including `onboarding_complete`
- Migration: `1f88923e9ad0_add_onboarding_complete_to_users.py` — Adds column with server_default=true for existing users

### Frontend
- **OnboardingPage.jsx** — 4-step wizard:
  1. Welcome: Introduction to HuntBoard
  2. Resume Upload: Optional PDF upload for job matching
  3. Add Sources: Select from source catalog (Greenhouse, Lever, Workday, RSS)
  4. Complete: Summary + triggers first sync
- **AuthProvider.jsx** — Fetches user profile after login, exposes `onboardingComplete` and `userProfile`
- **ProtectedRoute.jsx** — Redirects to `/onboarding` if `onboarding_complete=false`, redirects away if already complete

### Flow
1. New user signs up → `onboarding_complete=false` by default
2. User navigates to any protected route → ProtectedRoute redirects to `/onboarding`
3. User completes wizard → PATCH updates `onboarding_complete=true`
4. User redirected to `/board` with sources configured
5. Existing users (migrated with `onboarding_complete=true`) → go straight to `/board`

## Triage Feature (Swipe-Based Job Review)

Tinder-style card swiping interface for quickly triaging jobs with "new" status.

### Route
- `/triage` — Accessible from sidebar navigation with badge showing count of new jobs

### Job Statuses
Valid statuses: `new`, `saved`, `reviewing`, `applied`, `interviewing`, `rejected`, `offer`, `archived`
- `saved` was added to support the triage "save for later" action

### UI Components

**TriagePage.jsx** (`frontend/src/pages/TriagePage.jsx`):
- Displays jobs with `status="new"` sorted by `match_score` descending (best matches first)
- Card shows: title, company, location, salary, source badge, match percentage, description snippet
- Swipe gestures:
  - **Swipe RIGHT** or click ✓ → Move to "reviewing" status
  - **Swipe LEFT** or click ✗ → Move to "archived" status
  - **Swipe UP** or click ★ → Move to "saved" status
- Keyboard shortcuts: `→`/`L` = keep, `←`/`H` = archive, `↑`/`K` = save
- Progress indicator: "X of Y jobs remaining"
- Completion screen with stats: "You reviewed X jobs, kept Y, saved Z, archived W"
- Undo button (appears for 5 seconds after each action, reverts last swipe)
- Touch/mouse drag support with visual feedback (card tilt, color overlays)
- Stack effect: shows edges of next 2 cards behind current card

### React Query Hook

**useTriageJobs.js** (`frontend/src/hooks/useTriageJobs.js`):
- `useTriageJobs()` — Fetches jobs with `status="new"`, sorted by `match_score` desc
- `useNewJobsCount()` — Returns count of new jobs (used for navigation badge)
- `useUpdateJobStatus()` — Mutation with optimistic updates (removes card immediately, rollback on error)

### Navigation
- Sidebar nav item with Layers icon and badge showing count of new jobs
- Mobile bottom navigation also shows badge
- Located between "Board" and "List" in nav order

## Job Filtering System

Advanced filtering capabilities across the board, list view, and triage pages.

### Job Model Location Columns

New normalized location fields added to the `Job` model:
- `location_city` — Parsed city name (e.g., "San Francisco")
- `location_state` — US state abbreviation (e.g., "CA")
- `location_country` — Country code (e.g., "US", "UK")
- `is_remote` — Boolean flag for remote jobs
- `is_hybrid` — Boolean flag for hybrid jobs

These fields are automatically populated when jobs are created or updated via the `location_parser.py` service.

### Location Parser Service

`backend/app/services/location_parser.py` — Normalizes location strings:
- Parses "New York, NY" → city="New York", state="NY", country="US"
- Parses "Remote" → is_remote=true
- Parses "Remote - US" → is_remote=true, country="US"
- Parses "San Francisco, CA (Hybrid)" → city="San Francisco", state="CA", is_hybrid=true
- Handles international locations (UK, Canada, Germany, etc.)
- `update_job_location(job)` — Updates a Job model instance with parsed data

### Filter API Parameters

`GET /api/v1/jobs` now supports these filter parameters (all optional, AND logic):

| Parameter | Description | Example |
|-----------|-------------|---------|
| `location` | Filter by location text (case-insensitive ILIKE) | `?location=remote` |
| `keyword` | Search title + description + company | `?keyword=security` |
| `min_score` | Minimum AI match score (0-100) | `?min_score=70` |
| `max_score` | Maximum AI match score (0-100) | `?max_score=100` |
| `source` | Filter by job source | `?source=greenhouse` |
| `status` | Filter by status (comma-separated) | `?status=new,reviewing` |
| `remote_only` | Shortcut for remote jobs | `?remote_only=true` |
| `sort` | Sort order | `?sort=score_desc` |

Sort options: `score_desc`, `score_asc`, `date_desc`, `date_asc`, `company_asc`

### Frontend Filter Components

**FilterBar.jsx** (`frontend/src/components/FilterBar.jsx`):
- Horizontal filter bar with search, location, score, source dropdowns
- Quick filter pills: "All", "Remote", "High Match (80+)"
- Compact mode for mobile (collapsible panel)
- Clear filters button when filters are active

**useJobFilters.js** (`frontend/src/hooks/useJobFilters.js`):
- `useJobFilters()` — Reads/writes filters to URL search params
- `filters` — Current filter state object
- `setFilter(key, value)` — Set a single filter
- `setFilters(obj)` — Set multiple filters at once
- `clearFilters()` — Reset all filters
- `hasActiveFilters` — Boolean if any non-default filters are active
- `apiParams` — Object ready to pass to API calls

Exported constants:
- `QUICK_FILTERS` — Preset filter configurations
- `SOURCE_OPTIONS` — Available source dropdown options
- `SORT_OPTIONS` — Available sort options
- `SCORE_PRESETS` — Score range presets

### URL-Based Filter State

Filters persist in URL query params so they survive page refresh:
- `/board?keyword=security&remote_only=true`
- `/list?min_score=80&sort=score_desc`
- `/triage?location=new+york`

Uses React Router's `useSearchParams()` for state management.

### Integration

FilterBar is integrated into:
- **KanbanPage.jsx** — Full bar with quick filters
- **ListPage.jsx** — Full bar with quick filters
- **TriagePage.jsx** — Compact collapsible filter (status locked to "new")

### Backfill Endpoint

`POST /api/v1/batch/backfill-locations` — One-time operation to parse location fields for existing jobs that haven't been processed.

### Migration

`c5d6e7f8g9h0_add_job_location_columns.py` — Adds location columns and indexes

## User Preferences

User-specific preferences stored in a JSON column on the User model.

### Backend

- `User.preferences` — JSON column storing user preferences (nullable, defaults to empty dict)
- Migration: `d6e7f8g9h0i1_add_user_preferences.py`
- `GET /api/v1/users/me` — Returns user profile including `preferences`
- `PATCH /api/v1/users/me` — Accepts `preferences` object for updates

### Preferences Schema

```json
{
  "default_sort": "date_desc",       // score_desc, score_asc, date_desc, date_asc, company_asc
  "auto_archive_days": 30,           // Days after which to auto-archive (0 = disabled)
  "auto_archive_min_score": 0,       // Minimum score to archive (0 = disabled)
  "email_digest": "weekly",          // "daily", "weekly", "never"
  "email_digest_min_score": 60,      // Only include jobs scoring above this
  "email_digest_day": "monday"       // For weekly: which day to send
}
```

### Frontend

- `useUpdatePreferences()` hook in `frontend/src/hooks/useSettings.js`
- Preferences section in SettingsPage with default sort and auto-archive controls

## Data Export & Account Management

### CSV Export

- `GET /api/v1/jobs/export/csv` — Export all user's jobs as CSV download
- Columns: Title, Company, Location, Status, Source, AI Score, URL, Created At, Updated At
- Frontend: `useExportJobsCsv()` hook triggers download

### Account Deletion

- `DELETE /api/v1/users/me` — Delete user account and all associated data
- Deletes: jobs, resumes (including S3 files), RSS feeds, company feeds, batch runs, user record
- Returns 204 No Content on success
- Frontend: Confirmation modal with "type DELETE to confirm" safety check

### Delete All Jobs

- Uses existing `POST /api/v1/jobs/bulk-delete` endpoint
- Frontend: `useDeleteAllJobs()` hook with confirmation modal

## Settings Page

Enhanced settings page (`frontend/src/pages/SettingsPage.jsx`) with these sections:

### Sections

1. **Setup Wizard** — "Run Setup Wizard Again" button that sets `onboarding_complete=false` and navigates to `/onboarding`
2. **Profile** — Display name (editable), email (read-only), auth method badge, change password (Cognito only)
3. **Job Sources** — Quick link to Import/Sources page with active source count
4. **Preferences** — Default sort order dropdown, auto-archive settings (days + min score)
5. **Sync Schedule** — Enable/disable automatic sync, cron expression, auto-score toggle
6. **Sync History** — Table of recent batch runs with status
7. **Data Management** — Export CSV, Delete All Jobs, Delete Account
8. **About** — App version, Report a Bug link, credits
9. **Email Notifications** — Email digest frequency (daily/weekly/never), day selector, minimum score threshold

### React Query Hooks

`frontend/src/hooks/useSettings.js`:
- `useUpdateProfile()` — Update user profile (name)
- `useUpdatePreferences()` — Update user preferences
- `useRerunOnboarding()` — Reset onboarding status
- `useExportJobsCsv()` — Download jobs as CSV
- `useDeleteAllJobs()` — Delete all user's jobs
- `useDeleteAccount()` — Delete user account

### Rerun Setup Wizard Flow

1. User clicks "Run Setup Wizard Again" in Settings
2. PATCH `/api/v1/users/me` sets `onboarding_complete=false`
3. Navigate to `/onboarding`
4. ProtectedRoute sees `onboarding_complete=false` and shows wizard
5. User completes wizard, PATCH sets `onboarding_complete=true`
6. Redirect to `/board`

## Landing Page

Marketing landing page shown to logged-out visitors at the root URL.

### Route
- `/` — Shows `LandingPage` if not authenticated, redirects to `/board` if authenticated
- Logic handled by `HomeRoute` component in `App.jsx`

### Public Routes (No Auth Required)
- `/` — Landing page
- `/login` — Login page
- `/signup` — Signup page
- `/forgot-password` — Password reset page
- `/privacy` — Privacy Policy page
- `/terms` — Terms of Service page

### LandingPage Sections

**LandingPage.jsx** (`frontend/src/pages/LandingPage.jsx`):

1. **Fixed Navigation** — Logo, Log in link, Get Started button
2. **Hero Section** — Headline, subheadline, CTAs, Kanban board mockup illustration
3. **Features Section** — 4 feature cards:
   - Auto-Import Jobs (Greenhouse, Workday, Lever, RSS)
   - AI Match Scoring (resume-based)
   - Swipe to Triage (Tinder-style)
   - Track Everything (Kanban, analytics)
4. **How It Works** — 3 steps: Upload resume, Add companies, Let HuntBoard work
5. **Companies Section** — Shows sample company names that can be imported
6. **CTA Section** — Final call-to-action with Get Started button
7. **Footer** — Logo, Privacy Policy, Terms of Service, GitHub link, credits

### Supporting Pages

**PrivacyPage.jsx** (`frontend/src/pages/PrivacyPage.jsx`):
- Privacy policy covering data collection, storage, third-party services, user rights
- Consistent dark theme styling with landing page

**TermsPage.jsx** (`frontend/src/pages/TermsPage.jsx`):
- Terms of service covering acceptable use, liability, AI features disclaimer
- Consistent dark theme styling with landing page

### Auth Page Updates

Both `LoginPage.jsx` and `SignupPage.jsx` include:
- "Back to home" link at top that navigates to `/`
- Consistent visual connection to landing page styling

### Routing Logic

In `App.jsx`:
- `HomeRoute` component checks auth state and either shows `LandingPage` or redirects to `/board`
- Catch-all `*` route redirects to `/` (was `/board` before)
- Public routes (`/privacy`, `/terms`, `/forgot-password`) are accessible without authentication

## Password Reset & Auth Improvements

### Cognito Password Requirements
AWS Cognito enforces the following password policy:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Password Reset Flow (Forgot Password)

**Route**: `/forgot-password`

**ForgotPasswordPage.jsx** (`frontend/src/auth/ForgotPasswordPage.jsx`):
3-step password reset flow using Amplify's `resetPassword` and `confirmResetPassword`:

1. **Step 1: Email Input**
   - User enters email address
   - Calls `resetPassword({ username: email })` which triggers Cognito to send verification code
   - Error handling for: UserNotFoundException, LimitExceededException

2. **Step 2: Code + New Password**
   - User enters 6-digit verification code from email
   - User enters new password with real-time strength indicator
   - Shows password requirements checklist with visual feedback
   - Calls `confirmResetPassword({ username, confirmationCode, newPassword })`
   - Error handling for: CodeMismatchException, ExpiredCodeException, InvalidPasswordException

3. **Step 3: Success**
   - Confirmation message with "Go to Login" button
   - Redirects to `/login`

### Change Password (Logged-in Users)

**Route**: `/settings/change-password` (nested under protected routes)

**ChangePasswordPage.jsx** (`frontend/src/auth/ChangePasswordPage.jsx`):
- Current password + new password + confirm new password
- Real-time password strength indicator (Weak/Medium/Strong)
- Password requirements checklist with visual checkmarks
- Show/hide password toggles for all fields
- Confirm password validation with match indicator
- Calls Amplify's `updatePassword({ oldPassword, newPassword })`
- Success → toast notification + redirect to `/settings`
- Error handling for: NotAuthorizedException (wrong current password), InvalidPasswordException, LimitExceededException

Accessible from Settings page "Change Password" button (only shown for email-authenticated users, not LinkedIn OAuth).

### Login Page Improvements

**LoginPage.jsx** enhancements:
- "Forgot password?" link below password field → navigates to `/forgot-password`
- Show/hide password toggle (eye icon)
- "Remember me" checkbox (UX signal; Amplify handles actual session persistence)
- Loading state on submit button (spinner + disabled state)
- Enter key submits the form via `onKeyDown` handler
- Better error handling with specific messages:
  - NotAuthorizedException → "Incorrect email or password"
  - UserNotConfirmedException → "Please verify your email address first"
  - UserNotFoundException → "No account found with this email"

### Signup Page Improvements

**SignupPage.jsx** enhancements:
- Real-time email validation before submit
- Show/hide password toggle (eye icon)
- Password strength indicator bar (Weak/Medium/Strong with color coding)
- Password requirements checklist with live visual feedback:
  - At least 8 characters
  - One uppercase letter
  - One lowercase letter
  - One number
  - One special character
- Better error handling:
  - UsernameExistsException → "An account with this email already exists"
  - InvalidPasswordException → "Password does not meet requirements"

### Session Management

**api.js** improvements:
- On 401 response, attempts to refresh the Cognito session via `fetchAuthSession({ forceRefresh: true })`
- If refresh succeeds, retries the original request with new token
- If refresh fails, shows "Session expired. Please log in again." toast and redirects to `/login`
- Dev mode bypasses redirect behavior

## Job Detail Page

Full detail view when clicking on a job card from any page (board, list, triage).

### Route
- `/jobs/:id` — Protected route within AppLayout

### Components

**JobDetailPage.jsx** (`frontend/src/pages/JobDetailPage.jsx`):

**Header Section**:
- Back button → returns to previous page
- Job title (large)
- Company name with building icon
- Location with map pin icon + remote/hybrid badges
- Source badge (Greenhouse, Workday, Lever, Manual)
- AI Score as circular progress indicator with percentage
- Created/imported date
- "Apply" button → opens job URL in new tab, prompts "Mark as Applied?" if not already applied
- Status dropdown to change status (new → saved → reviewing → applied → interviewing → offer → rejected → archived)

**Tabs**:
1. **Description** — Full job description (rendered as HTML if present, otherwise formatted text). Long descriptions show first 500 chars with "Show more" expand.
2. **AI Analysis** — Shows match score with circular indicator, "Why You're a Good Fit" list, "Potential Gaps" list. If not scored, shows "Score this job" button.
3. **Notes** — Free-text textarea for personal notes. Auto-saves on blur (debounced 1s). Shows saving indicator.
4. **Activity** — Timeline of activities (created, status changes, notes added, scored) with timestamps.

**Keyboard Shortcuts**:
- `Escape` → go back to previous page
- `1-8` → set status (1=new, 2=saved, 3=reviewing, 4=applied, 5=interviewing, 6=offer, 7=rejected, 8=archived)

### Backend

**Job Model** (`backend/app/models/job.py`):
- Added `notes` column (Text, nullable) for user's personal notes

**JobActivity Model** (`backend/app/models/job_activity.py`):
```python
class JobActivity(Base):
    __tablename__ = "job_activities"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)  # "created", "status_change", "note_added", "scored"
    detail = Column(Text, nullable=True)  # e.g., "new -> reviewing" or note excerpt
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

**Activity Logging**:
Activities are automatically logged when:
- Job is created (action: "created")
- Status is changed (action: "status_change", detail: "old -> new")
- Notes are updated (action: "note_added", detail: first 100 chars of note)
- Job is AI scored (action: "scored")

**API Endpoints**:
- `GET /api/v1/jobs/{id}/activities` — Returns list of activities for a job, ordered by most recent first
- `PUT /api/v1/jobs/{id}` — Now accepts `notes` field for updating job notes

### Frontend Hooks

**useJobDetail.js** (`frontend/src/hooks/useJobDetail.js`):
- `useJobDetail(id)` — Fetch single job by ID
- `useJobActivities(id)` — Fetch job activities
- `useUpdateJobNotes()` — Mutation to update job notes
- `useUpdateJobStatusDetail()` — Mutation to update job status (invalidates activities)
- `useScoreJob()` — Mutation to trigger AI scoring for a single job

### Navigation

Clicking a job card navigates to `/jobs/:id`. Implement `onClick={() => navigate(`/jobs/${job.id}`)}` on job cards in:
- KanbanPage (job cards in columns)
- ListPage (list rows)
- TriagePage (optional - clicking card title)

### Migration

`e7f8g9h0i1j2_add_job_notes_and_activities.py`:
- Adds `notes` column to jobs table
- Creates `job_activities` table with indexes on id, job_id, user_id

## Email Digest System

Weekly/daily email summaries of new high-scoring jobs to keep users engaged.

### Configuration

Email digest preferences are stored in the `User.preferences` JSON column:

```json
{
  "email_digest": "weekly",       // "daily", "weekly", "never"
  "email_digest_min_score": 60,   // Only include jobs scoring above this (0-100)
  "email_digest_day": "monday"    // For weekly: which day to send
}
```

The `User.last_digest_sent` column (DateTime) tracks when the last digest was sent.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DRY_RUN_EMAIL` | Set to "true" to log emails instead of sending via SES | `true` |
| `JWT_SECRET` | Secret for signing unsubscribe tokens | `huntboard-digest-secret` |
| `AWS_REGION` | AWS region for SES | `us-east-1` |
| `FRONTEND_URL` | Base URL for email links | `https://huntboard.app` |

### Backend Services

**email_service.py** (`backend/app/services/email_service.py`):
- `send_digest_email(user_email, user_id, jobs, period)` — Send digest via SES (or log in dry run mode)
- `verify_unsubscribe_token(token)` — Validate signed unsubscribe token, returns user_id
- `_generate_unsubscribe_token(user_id)` — Create signed token for unsubscribe links
- `_build_digest_html(jobs, period, unsubscribe_url)` — Generate HTML email template
- `_build_digest_text(jobs, period, unsubscribe_url)` — Generate plain text fallback

**digest_scheduler.py** (`backend/app/services/digest_scheduler.py`):
- `run_digest_for_all_users()` — Main entry point called by APScheduler daily at 8 AM UTC
- `run_digest_for_user(db, user)` — Process and send digest for a single user
- `send_test_digest(user_id)` — Send a test digest to a specific user (for debugging)

### Scheduler Integration

The digest job runs daily at 8 AM UTC (5 hours after the nightly sync at 3 AM):
- Daily users receive an email every day
- Weekly users receive an email only on their preferred day
- "never" users are skipped

Added to `scheduler.py`:
```python
scheduler.add_job(
    run_digest_for_all_users,
    CronTrigger(hour=8, minute=0),  # 8 AM UTC
    id="email_digest",
    name="Email digest sender",
    replace_existing=True,
    misfire_grace_time=3600,
)
```

### Unsubscribe Flow

1. Digest emails include an unsubscribe link: `/api/v1/users/unsubscribe?token=xxx`
2. Token is a base64-encoded JSON payload with HMAC signature
3. `GET /api/v1/users/unsubscribe` endpoint (no auth required):
   - Validates token signature
   - Sets `user.preferences.email_digest = "never"`
   - Returns HTML confirmation page
4. Users can re-enable digests in Settings

### Email Template

The HTML email includes:
- HuntBoard branded header
- Job count summary ("X new matches")
- Table of jobs with title, company, location, and match score badge
- "View All Jobs on HuntBoard" CTA button
- Footer with unsubscribe link and settings link

### Frontend UI

**SettingsPage.jsx** — Email Notifications section (`#notifications` anchor):
- Digest frequency dropdown (Daily / Weekly / Never)
- Day selector (only shown for weekly)
- Minimum score slider (0-100)
- Info box showing when emails will be sent
- Save button
- Last digest sent timestamp

### AWS SES Setup (Production)

**Prerequisites** (before enabling real email sending):

1. **Verify domain in SES**:
   ```bash
   aws ses verify-domain-identity --domain huntboard.app --region us-east-1
   ```
   Add the TXT record to Route53 as instructed.

2. **Request production access**:
   - SES starts in sandbox mode (can only send to verified emails)
   - Request production access in AWS Console → SES → Account dashboard

3. **Add IAM permissions** to EC2 role:
   ```json
   {
     "Effect": "Allow",
     "Action": ["ses:SendEmail", "ses:SendRawEmail"],
     "Resource": "*"
   }
   ```

4. **Enable real sending**:
   Set `DRY_RUN_EMAIL=false` in production `.env` on EC2.

### Migration

`f8g9h0i1j2k3_add_last_digest_sent.py`:
- Adds `last_digest_sent` column to users table

### Testing

Test the digest system in dry run mode:
```bash
# SSH to EC2
ssh -i ~/.ssh/huntboard-ec2.pem ec2-user@44.206.144.96

# Run test digest for a specific user
docker compose exec backend python -c "from app.services.digest_scheduler import send_test_digest; send_test_digest('user-id-here')"

# Check logs for dry run output
docker compose logs -f backend | grep "DRY RUN"
```
