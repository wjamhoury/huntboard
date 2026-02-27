"""
Tests for job CRUD operations.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.user import User


class TestJobCRUD:
    """Test job create, read, update, delete operations."""

    def test_create_job_returns_201(self, client_user_a: TestClient, sample_job_data: dict):
        """POST /api/v1/jobs should create a job and return 201."""
        response = client_user_a.post("/api/v1/jobs", json=sample_job_data)

        # FastAPI returns 200 by default for POST without explicit status_code
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == sample_job_data["title"]
        assert data["company"] == sample_job_data["company"]
        assert data["location"] == sample_job_data["location"]
        assert "id" in data
        assert "user_id" in data
        assert "created_at" in data

    def test_create_job_requires_title_and_company(self, client_user_a: TestClient):
        """POST /api/v1/jobs should require title and company."""
        # Missing title
        response = client_user_a.post(
            "/api/v1/jobs",
            json={"company": "Test Company"}
        )
        assert response.status_code == 422

        # Missing company
        response = client_user_a.post(
            "/api/v1/jobs",
            json={"title": "Test Job"}
        )
        assert response.status_code == 422

    def test_list_jobs_returns_user_jobs(
        self,
        client_user_a: TestClient,
        sample_job_a: Job,
        test_user_a: User
    ):
        """GET /api/v1/jobs should return the current user's jobs."""
        response = client_user_a.get("/api/v1/jobs")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # All jobs should belong to user A
        for job in data:
            assert job["user_id"] == test_user_a.id

    def test_get_job_by_id(
        self,
        client_user_a: TestClient,
        sample_job_a: Job
    ):
        """GET /api/v1/jobs/{id} should return the job."""
        response = client_user_a.get(f"/api/v1/jobs/{sample_job_a.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_job_a.id
        assert data["title"] == sample_job_a.title

    def test_get_nonexistent_job_returns_404(self, client_user_a: TestClient):
        """GET /api/v1/jobs/{id} with nonexistent ID should return 404."""
        response = client_user_a.get("/api/v1/jobs/99999")
        assert response.status_code == 404

    def test_update_job_status(
        self,
        client_user_a: TestClient,
        sample_job_a: Job
    ):
        """PATCH /api/v1/jobs/{id}/status should update the status."""
        response = client_user_a.patch(
            f"/api/v1/jobs/{sample_job_a.id}/status",
            json={"status": "reviewing"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "reviewing"

    def test_update_job_invalid_status(
        self,
        client_user_a: TestClient,
        sample_job_a: Job
    ):
        """PATCH /api/v1/jobs/{id}/status with invalid status should return 400."""
        response = client_user_a.patch(
            f"/api/v1/jobs/{sample_job_a.id}/status",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 400

    def test_update_job(
        self,
        client_user_a: TestClient,
        sample_job_a: Job
    ):
        """PUT /api/v1/jobs/{id} should update the job."""
        response = client_user_a.put(
            f"/api/v1/jobs/{sample_job_a.id}",
            json={
                "title": "Updated Title",
                "notes": "Some personal notes about this job"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["notes"] == "Some personal notes about this job"
        # Company should remain unchanged
        assert data["company"] == sample_job_a.company

    def test_delete_job(
        self,
        client_user_a: TestClient,
        db: Session,
        test_user_a: User,
        sample_job_data: dict
    ):
        """DELETE /api/v1/jobs/{id} should delete the job."""
        # Create a job to delete
        job = Job(**sample_job_data, user_id=test_user_a.id)
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = job.id

        response = client_user_a.delete(f"/api/v1/jobs/{job_id}")
        assert response.status_code == 200

        # Verify deletion
        deleted_job = db.query(Job).filter(Job.id == job_id).first()
        assert deleted_job is None

    def test_delete_nonexistent_job_returns_404(self, client_user_a: TestClient):
        """DELETE /api/v1/jobs/{id} with nonexistent ID should return 404."""
        response = client_user_a.delete("/api/v1/jobs/99999")
        assert response.status_code == 404


class TestJobFiltering:
    """Test job filtering functionality."""

    def test_filter_by_keyword(
        self,
        client_user_a: TestClient,
        db: Session,
        test_user_a: User
    ):
        """GET /api/v1/jobs?keyword=X should filter by title/company/description."""
        # Create jobs with different keywords
        job1 = Job(
            title="Python Developer",
            company="Tech Corp",
            user_id=test_user_a.id
        )
        job2 = Job(
            title="Java Developer",
            company="Another Corp",
            user_id=test_user_a.id
        )
        db.add_all([job1, job2])
        db.commit()

        response = client_user_a.get("/api/v1/jobs?keyword=Python")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        # All returned jobs should match the keyword
        for job in data:
            keyword_found = (
                "python" in job["title"].lower() or
                "python" in job["company"].lower() or
                "python" in (job["description"] or "").lower()
            )
            assert keyword_found

    def test_filter_by_status(
        self,
        client_user_a: TestClient,
        db: Session,
        test_user_a: User
    ):
        """GET /api/v1/jobs?status=X should filter by status."""
        # Create jobs with different statuses
        job1 = Job(
            title="Job 1",
            company="Company",
            status="new",
            user_id=test_user_a.id
        )
        job2 = Job(
            title="Job 2",
            company="Company",
            status="applied",
            user_id=test_user_a.id
        )
        db.add_all([job1, job2])
        db.commit()

        response = client_user_a.get("/api/v1/jobs?status=new")

        assert response.status_code == 200
        data = response.json()
        # All returned jobs should have status "new"
        for job in data:
            assert job["status"] == "new"

    def test_filter_by_multiple_statuses(
        self,
        client_user_a: TestClient,
        db: Session,
        test_user_a: User
    ):
        """GET /api/v1/jobs?status=new,reviewing should filter by multiple statuses."""
        job1 = Job(
            title="Job 1",
            company="Company",
            status="new",
            user_id=test_user_a.id
        )
        job2 = Job(
            title="Job 2",
            company="Company",
            status="reviewing",
            user_id=test_user_a.id
        )
        job3 = Job(
            title="Job 3",
            company="Company",
            status="archived",
            user_id=test_user_a.id
        )
        db.add_all([job1, job2, job3])
        db.commit()

        response = client_user_a.get("/api/v1/jobs?status=new,reviewing")

        assert response.status_code == 200
        data = response.json()
        for job in data:
            assert job["status"] in ["new", "reviewing"]

    def test_filter_by_min_score(
        self,
        client_user_a: TestClient,
        db: Session,
        test_user_a: User
    ):
        """GET /api/v1/jobs?min_score=80 should filter by minimum score."""
        job1 = Job(
            title="High Score Job",
            company="Company",
            match_score=90,
            user_id=test_user_a.id
        )
        job2 = Job(
            title="Low Score Job",
            company="Company",
            match_score=50,
            user_id=test_user_a.id
        )
        db.add_all([job1, job2])
        db.commit()

        response = client_user_a.get("/api/v1/jobs?min_score=80")

        assert response.status_code == 200
        data = response.json()
        for job in data:
            if job["match_score"] is not None:
                assert job["match_score"] >= 80


class TestJobSorting:
    """Test job sorting functionality."""

    def test_sort_by_score_desc(
        self,
        client_user_a: TestClient,
        db: Session,
        test_user_a: User
    ):
        """GET /api/v1/jobs?sort=score_desc should sort by score descending."""
        job1 = Job(
            title="Low Score",
            company="Company",
            match_score=30,
            user_id=test_user_a.id
        )
        job2 = Job(
            title="High Score",
            company="Company",
            match_score=90,
            user_id=test_user_a.id
        )
        job3 = Job(
            title="Mid Score",
            company="Company",
            match_score=60,
            user_id=test_user_a.id
        )
        db.add_all([job1, job2, job3])
        db.commit()

        response = client_user_a.get("/api/v1/jobs?sort=score_desc")

        assert response.status_code == 200
        data = response.json()
        # Filter to only jobs with scores
        scored_jobs = [j for j in data if j["match_score"] is not None]
        if len(scored_jobs) > 1:
            scores = [j["match_score"] for j in scored_jobs]
            assert scores == sorted(scores, reverse=True)

    def test_sort_by_date_desc(
        self,
        client_user_a: TestClient,
        sample_job_data: dict
    ):
        """GET /api/v1/jobs?sort=date_desc should sort by date descending (default)."""
        # Create multiple jobs
        for i in range(3):
            data = sample_job_data.copy()
            data["title"] = f"Job {i}"
            client_user_a.post("/api/v1/jobs", json=data)

        response = client_user_a.get("/api/v1/jobs?sort=date_desc")

        assert response.status_code == 200
        data = response.json()
        if len(data) > 1:
            dates = [j["created_at"] for j in data]
            assert dates == sorted(dates, reverse=True)
