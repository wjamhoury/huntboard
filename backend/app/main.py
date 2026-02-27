import logging
import os
import time
from contextlib import asynccontextmanager

import sentry_sdk
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
from app.routers import jobs, resumes, feeds, ai, companies, analytics, batch, sources, users, admin
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.request_logger import RequestLoggerMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.models.batch_run import BatchRun  # Import to register model

# Scheduler (extracted to avoid circular imports)
from app.scheduler import scheduler, setup_scheduler

# Setup JSON logging
setup_logging()
logger = logging.getLogger(__name__)

# Initialize Sentry if DSN is configured
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("ENVIRONMENT", "production"),
        traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
        profiles_sample_rate=0.1,
        send_default_pii=False,  # Don't send personally identifiable information
    )
    logger.info("Sentry initialized for error monitoring")
else:
    logger.info("Sentry DSN not configured, error monitoring disabled")

# Track app start time for uptime calculation
APP_START_TIME = time.time()
APP_VERSION = "1.0.0"

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

# Security headers middleware (adds X-Frame-Options, CSP, etc.)
app.add_middleware(SecurityHeadersMiddleware)

# Error handler middleware (catches unhandled exceptions)
app.add_middleware(ErrorHandlerMiddleware)

# Request logger middleware (logs all requests with timing)
app.add_middleware(RequestLoggerMiddleware)

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
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])


@app.get("/api/health")
async def health_check():
    """
    Comprehensive health check endpoint.
    Checks: database, S3, Anthropic API key, Cognito config.
    Returns detailed status for each check.
    """
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError

    version = os.getenv("APP_VERSION", "1.0.0")
    checks = {}
    overall_healthy = True

    # Check database connectivity
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        checks["database"] = "connected"
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        checks["database"] = "disconnected"
        overall_healthy = False

    # Check S3 connectivity (if configured)
    s3_bucket = os.getenv("S3_RESUME_BUCKET")
    use_local_storage = os.getenv("USE_LOCAL_STORAGE", "false").lower() == "true"

    if use_local_storage:
        checks["s3"] = "not_configured (using local storage)"
    elif s3_bucket:
        try:
            s3_client = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))
            s3_client.head_bucket(Bucket=s3_bucket)
            checks["s3"] = "connected"
        except NoCredentialsError:
            checks["s3"] = "no_credentials"
            # Not critical - may use local storage fallback
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code == "404":
                checks["s3"] = "bucket_not_found"
            elif error_code == "403":
                checks["s3"] = "access_denied"
            else:
                checks["s3"] = f"error: {error_code}"
        except Exception as e:
            checks["s3"] = f"error: {str(e)}"
    else:
        checks["s3"] = "not_configured"

    # Check Anthropic API key is configured
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key and len(anthropic_key) > 10:
        checks["anthropic_key"] = "configured"
    else:
        checks["anthropic_key"] = "not_configured"
        # Not critical - AI features will just be disabled

    # Check Cognito configuration
    cognito_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    cognito_client_id = os.getenv("COGNITO_APP_CLIENT_ID")
    auth_dev_mode = os.getenv("AUTH_DEV_MODE", "false").lower() == "true"

    if auth_dev_mode:
        checks["cognito"] = "dev_mode"
    elif cognito_pool_id and cognito_client_id:
        checks["cognito"] = "configured"
    else:
        checks["cognito"] = "not_configured"
        if not auth_dev_mode:
            overall_healthy = False  # Auth is required in production

    # Calculate uptime
    uptime_seconds = int(time.time() - APP_START_TIME)

    # Return health status
    status_code = 200 if overall_healthy else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if overall_healthy else "unhealthy",
            "version": version,
            "checks": checks,
            "uptime_seconds": uptime_seconds
        }
    )


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
