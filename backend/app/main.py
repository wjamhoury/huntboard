import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.logging_config import setup_logging
from app.database import engine, Base, SessionLocal
from app.routers import jobs, resumes, feeds, ai, companies, analytics, batch, sources, users
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.models.batch_run import BatchRun  # Import to register model

# Scheduler (extracted to avoid circular imports)
from app.scheduler import scheduler, setup_scheduler

# Setup JSON logging
setup_logging()
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info("Starting HuntBoard API")
    setup_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down HuntBoard API")
    scheduler.shutdown()

app = FastAPI(
    title="HuntBoard API",
    version="1.0.0",
    description="Personal job search tracking application",
    lifespan=lifespan
)

# CORS configuration
origins = [o for o in [
    "http://localhost:5173",
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
] if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error handler middleware (catches unhandled exceptions)
app.add_middleware(ErrorHandlerMiddleware)

# Rate limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers with /api/v1 prefix
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(resumes.router, prefix="/api/v1/resumes", tags=["resumes"])
app.include_router(feeds.router, prefix="/api/v1/feeds", tags=["feeds"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["companies"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(batch.router, prefix="/api/v1/batch", tags=["batch"])
app.include_router(sources.router, prefix="/api/v1/sources", tags=["sources"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint - checks DB connectivity and returns version."""
    version = os.getenv("APP_VERSION", "1.0.0")

    # Check database connectivity
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "version": version,
                "database": "disconnected",
                "error": str(e)
            }
        )

    return {
        "status": "healthy",
        "version": version,
        "database": db_status
    }


# Serve static files in production
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't serve SPA for API routes - let them 404 properly
        if full_path.startswith("api/"):
            return JSONResponse(
                status_code=404,
                content={"detail": "Not found"}
            )

        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return JSONResponse(
            status_code=404,
            content={"detail": "Not found"}
        )
