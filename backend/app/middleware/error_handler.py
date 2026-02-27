"""
Global error handler middleware for consistent error responses.
Catches unhandled exceptions and returns user-friendly error messages.
"""
import logging
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from anthropic import APIError as AnthropicAPIError, AuthenticationError as AnthropicAuthError

logger = logging.getLogger(__name__)


# Error type to user-friendly message mapping
ERROR_MESSAGES = {
    "AnthropicAPIError": "AI scoring is temporarily unavailable. Your jobs have been saved and will be scored on the next sync.",
    "AnthropicAuthError": "AI scoring is temporarily unavailable. Your jobs have been saved and will be scored on the next sync.",
    "AuthenticationError": "AI scoring is temporarily unavailable. Your jobs have been saved and will be scored on the next sync.",
    "APIConnectionError": "AI scoring is temporarily unavailable. Your jobs have been saved and will be scored on the next sync.",
    "RateLimitError": "AI service is rate limited. Please try again in a few minutes.",
    "ConnectionError": "Could not connect to external service. Please try again.",
    "TimeoutError": "Request timed out. Please try again.",
    "S3UploadError": "File upload failed. Please try again.",
    "PDFExtractionError": "Could not extract text from this PDF. Please try a different file.",
    "FeedSyncError": "Could not sync feed. It will be retried on the next sync.",
}


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware to catch unhandled exceptions and return friendly error messages."""

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            # Log the full error with traceback
            logger.error(
                f"Unhandled error on {request.method} {request.url.path}: {str(e)}",
                exc_info=True,
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "error_type": type(e).__name__,
                }
            )

            # Get user-friendly message based on error type
            error_type = type(e).__name__
            user_message = ERROR_MESSAGES.get(
                error_type,
                "An unexpected error occurred. Please try again."
            )

            # Check for specific error categories
            if isinstance(e, (AnthropicAPIError, AnthropicAuthError)):
                user_message = ERROR_MESSAGES["AnthropicAPIError"]
            elif "S3" in str(e) or "boto" in str(e).lower():
                user_message = ERROR_MESSAGES["S3UploadError"]
            elif "PDF" in str(e) or "pdf" in str(e):
                user_message = ERROR_MESSAGES["PDFExtractionError"]

            return JSONResponse(
                status_code=500,
                content={
                    "detail": user_message,
                    "error_type": error_type,
                }
            )


class S3UploadError(Exception):
    """Custom exception for S3 upload failures."""
    pass


class PDFExtractionError(Exception):
    """Custom exception for PDF text extraction failures."""
    pass


class FeedSyncError(Exception):
    """Custom exception for feed sync failures."""
    pass
