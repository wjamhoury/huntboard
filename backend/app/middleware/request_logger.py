"""
Request logging middleware.
Logs all requests with method, path, status code, and duration.
Adds request_id to each request for tracing.
"""
import logging
import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Paths to exclude from access logging (too noisy)
EXCLUDED_PATHS = {
    "/api/health",
    "/favicon.ico",
}


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests with timing and request IDs."""

    async def dispatch(self, request: Request, call_next):
        # Generate a unique request ID
        request_id = str(uuid.uuid4())[:8]

        # Store request_id in request state for use in other parts of the app
        request.state.request_id = request_id

        # Record start time
        start_time = time.time()

        # Process the request
        response = await call_next(request)

        # Calculate duration
        duration_ms = round((time.time() - start_time) * 1000, 2)

        # Skip logging for excluded paths
        if request.url.path not in EXCLUDED_PATHS:
            # Get client IP (handle X-Forwarded-For for proxied requests)
            client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            if not client_ip:
                client_ip = request.client.host if request.client else "unknown"

            # Log the request
            logger.info(
                f"{request.method} {request.url.path} - {response.status_code} ({duration_ms}ms)",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                    "user_agent": request.headers.get("User-Agent", "")[:100],
                }
            )

        # Add request_id to response headers for debugging
        response.headers["X-Request-ID"] = request_id

        return response
