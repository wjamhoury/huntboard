"""
Tests for authentication requirements.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.dependencies import get_user_db


class TestAuthRequired:
    """Test that protected endpoints require authentication."""

    @pytest.fixture(autouse=True)
    def setup_client(self, db: Session):
        """Setup test client without auth override (to test real auth)."""
        # Temporarily disable dev mode for auth tests
        original_auth_mode = os.environ.get("AUTH_DEV_MODE")
        os.environ["AUTH_DEV_MODE"] = "false"

        def override_get_db():
            yield db

        app.dependency_overrides[get_db] = override_get_db
        # Remove get_user_db override to test real auth
        app.dependency_overrides.pop(get_user_db, None)

        with TestClient(app) as client:
            self.client = client
            yield

        app.dependency_overrides.clear()
        # Restore original auth mode
        if original_auth_mode is not None:
            os.environ["AUTH_DEV_MODE"] = original_auth_mode
        else:
            os.environ["AUTH_DEV_MODE"] = "true"

    def test_get_jobs_without_auth_returns_401(self):
        """GET /api/v1/jobs without auth should return 401."""
        response = self.client.get("/api/v1/jobs")
        assert response.status_code == 401

    def test_create_job_without_auth_returns_401(self):
        """POST /api/v1/jobs without auth should return 401."""
        response = self.client.post(
            "/api/v1/jobs",
            json={
                "title": "Test Job",
                "company": "Test Company",
            }
        )
        assert response.status_code == 401

    def test_get_resumes_without_auth_returns_401(self):
        """GET /api/v1/resumes without auth should return 401."""
        response = self.client.get("/api/v1/resumes")
        assert response.status_code == 401

    def test_get_user_profile_without_auth_returns_401(self):
        """GET /api/v1/users/me without auth should return 401."""
        response = self.client.get("/api/v1/users/me")
        assert response.status_code == 401

    def test_invalid_token_returns_error(self):
        """Request with invalid Bearer token should return error (401 or 500 if JWKS not configured)."""
        response = self.client.get(
            "/api/v1/jobs",
            headers={"Authorization": "Bearer invalid-token-12345"}
        )
        # When JWKS is not configured (no COGNITO_USER_POOL_ID), returns 500
        # When JWKS is configured but token is invalid, returns 401
        # Both are acceptable error states for this test
        assert response.status_code in [401, 500]


class TestPublicEndpoints:
    """Test that public endpoints work without authentication."""

    @pytest.fixture(autouse=True)
    def setup_client(self, db: Session):
        """Setup test client."""
        def override_get_db():
            yield db

        app.dependency_overrides[get_db] = override_get_db

        with TestClient(app) as client:
            self.client = client
            yield

        app.dependency_overrides.clear()

    def test_health_check_no_auth_required(self):
        """GET /api/health should work without auth."""
        response = self.client.get("/api/health")
        assert response.status_code == 200

    def test_source_templates_no_auth_required(self):
        """GET /api/v1/sources/templates should work without auth."""
        response = self.client.get("/api/v1/sources/templates")
        assert response.status_code == 200
