"""
Tests for the health check endpoint.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db


def test_health_check_returns_200(db: Session):
    """GET /api/health should return 200 with status 'healthy'."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        response = client.get("/api/health")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert data["database"] == "connected"


def test_health_check_includes_version(db: Session):
    """Health check should include version information."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        response = client.get("/api/health")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    # Version should be a string like "1.0.0"
    assert isinstance(data["version"], str)
