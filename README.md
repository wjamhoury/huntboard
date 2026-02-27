# HuntBoard

HuntBoard — AI-powered job search tracker and career pipeline manager.

## Features

- 📋 Kanban board with drag-and-drop
- 🌙 Dark mode (with toggle)
- ➕ Add, edit, and delete jobs
- 🔍 Filter and search jobs
- 📊 Track application status
- 💰 Salary tracking
- 📝 Notes for each job

## Quick Start (Docker - Recommended)

### Prerequisites

1. **Install Docker Desktop**: https://www.docker.com/products/docker-desktop
2. **Start Docker Desktop** and make sure it's running

### Setup

```bash
# 1. Navigate to the project folder
cd huntboard

# 2. Run the setup script
./setup.sh
```

That's it! Open http://localhost:5173 in your browser.

### Commands

```bash
# Stop the app
docker compose down

# Start the app
docker compose up -d

# View logs
docker compose logs -f

# Rebuild after changes
docker compose build --no-cache && docker compose up -d
```

---

## Manual Setup (Without Docker)

If you prefer not to use Docker:

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the backend
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Project Structure

```
huntboard/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── database.py      # SQLite config
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── routers/         # API endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   └── services/api.js  # API client
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── setup.sh
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/jobs | List all jobs |
| GET | /api/jobs/{id} | Get single job |
| POST | /api/jobs | Create job |
| PUT | /api/jobs/{id} | Update job |
| PATCH | /api/jobs/{id}/status | Update status only |
| DELETE | /api/jobs/{id} | Delete job |
| GET | /api/health | Health check |

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **Frontend**: React, Tailwind CSS, @dnd-kit
- **Infrastructure**: Docker, Docker Compose

## Troubleshooting

### "Port already in use"
```bash
# Find what's using the port
lsof -i :8000  # or :5173

# Kill it
kill -9 <PID>
```

### "Docker not running"
Open Docker Desktop and wait for it to start completely.

### "Frontend can't connect to backend"
Make sure both containers are running:
```bash
docker compose ps
```

### Clear everything and start fresh
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```
