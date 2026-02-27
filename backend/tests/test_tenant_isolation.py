"""
CRITICAL: Tests for multi-tenant isolation.

These tests verify that users cannot access other users' data.
All resources (jobs, resumes, feeds) must be properly isolated.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Callable

from app.models.job import Job
from app.models.resume import Resume
from app.models.rss_feed import RssFeed
from app.models.company_feed import CompanyFeed
from app.models.user import User


class TestJobTenantIsolation:
    """Test that users cannot access other users' jobs."""

    def test_user_b_cannot_list_user_a_jobs(
        self,
        make_client: Callable[[User], TestClient],
        sample_job_a: Job,
        test_user_a: User,
        test_user_b: User
    ):
        """User B should NOT see User A's jobs when listing."""
        # User A lists their jobs (should see the sample job)
        client_a = make_client(test_user_a)
        response_a = client_a.get("/api/v1/jobs")
        assert response_a.status_code == 200
        jobs_a = response_a.json()
        job_ids_a = [j["id"] for j in jobs_a]
        assert sample_job_a.id in job_ids_a

        # User B lists their jobs (should NOT see User A's job)
        client_b = make_client(test_user_b)
        response_b = client_b.get("/api/v1/jobs")
        assert response_b.status_code == 200
        jobs_b = response_b.json()
        job_ids_b = [j["id"] for j in jobs_b]
        assert sample_job_a.id not in job_ids_b

    def test_user_b_cannot_get_user_a_job_by_id(
        self,
        client_user_b: TestClient,
        sample_job_a: Job
    ):
        """User B should get 404 (not 403) when trying to access User A's job by ID."""
        response = client_user_b.get(f"/api/v1/jobs/{sample_job_a.id}")

        # IMPORTANT: Should return 404, not 403
        # This prevents information leakage about job IDs
        assert response.status_code == 404

    def test_user_b_cannot_update_user_a_job(
        self,
        client_user_b: TestClient,
        sample_job_a: Job
    ):
        """User B should get 404 when trying to update User A's job."""
        response = client_user_b.put(
            f"/api/v1/jobs/{sample_job_a.id}",
            json={"title": "Hacked Title"}
        )
        assert response.status_code == 404

    def test_user_b_cannot_update_user_a_job_status(
        self,
        client_user_b: TestClient,
        sample_job_a: Job
    ):
        """User B should get 404 when trying to update User A's job status."""
        response = client_user_b.patch(
            f"/api/v1/jobs/{sample_job_a.id}/status",
            json={"status": "archived"}
        )
        assert response.status_code == 404

    def test_user_b_cannot_delete_user_a_job(
        self,
        client_user_b: TestClient,
        sample_job_a: Job,
        db: Session
    ):
        """User B should get 404 when trying to delete User A's job."""
        response = client_user_b.delete(f"/api/v1/jobs/{sample_job_a.id}")
        assert response.status_code == 404

        # Verify job still exists
        job = db.query(Job).filter(Job.id == sample_job_a.id).first()
        assert job is not None

    def test_user_b_cannot_get_user_a_job_activities(
        self,
        client_user_b: TestClient,
        sample_job_a: Job
    ):
        """User B should get 404 when trying to access User A's job activities."""
        response = client_user_b.get(f"/api/v1/jobs/{sample_job_a.id}/activities")
        assert response.status_code == 404


class TestResumeTenantIsolation:
    """Test that users cannot access other users' resumes."""

    @pytest.fixture
    def sample_resume_a(self, db: Session, test_user_a: User) -> Resume:
        """Create a sample resume owned by User A."""
        resume = Resume(
            user_id=test_user_a.id,
            s3_key=f"resumes/{test_user_a.id}/test_resume.pdf",
            original_filename="test_resume.pdf",
            file_size_bytes=1024,
            content_type="application/pdf",
            extracted_text="Sample resume text for testing",
            is_primary=True,
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        return resume

    def test_user_b_cannot_list_user_a_resumes(
        self,
        make_client: Callable[[User], TestClient],
        sample_resume_a: Resume,
        test_user_a: User,
        test_user_b: User
    ):
        """User B should NOT see User A's resumes when listing."""
        # User A lists their resumes
        client_a = make_client(test_user_a)
        response_a = client_a.get("/api/v1/resumes")
        assert response_a.status_code == 200
        resumes_a = response_a.json()
        resume_ids_a = [r["id"] for r in resumes_a]
        assert sample_resume_a.id in resume_ids_a

        # User B lists their resumes (should NOT see User A's resume)
        client_b = make_client(test_user_b)
        response_b = client_b.get("/api/v1/resumes")
        assert response_b.status_code == 200
        resumes_b = response_b.json()
        resume_ids_b = [r["id"] for r in resumes_b]
        assert sample_resume_a.id not in resume_ids_b

    def test_user_b_cannot_get_user_a_resume_by_id(
        self,
        client_user_b: TestClient,
        sample_resume_a: Resume
    ):
        """User B should get 404 when trying to access User A's resume by ID."""
        response = client_user_b.get(f"/api/v1/resumes/{sample_resume_a.id}")
        assert response.status_code == 404

    def test_user_b_cannot_get_user_a_resume_text(
        self,
        client_user_b: TestClient,
        sample_resume_a: Resume
    ):
        """User B should get 404 when trying to access User A's resume text."""
        response = client_user_b.get(f"/api/v1/resumes/{sample_resume_a.id}/text")
        assert response.status_code == 404

    def test_user_b_cannot_delete_user_a_resume(
        self,
        client_user_b: TestClient,
        sample_resume_a: Resume,
        db: Session
    ):
        """User B should get 404 when trying to delete User A's resume."""
        response = client_user_b.delete(f"/api/v1/resumes/{sample_resume_a.id}")
        assert response.status_code == 404

        # Verify resume still exists
        resume = db.query(Resume).filter(Resume.id == sample_resume_a.id).first()
        assert resume is not None

    def test_user_b_cannot_set_user_a_resume_as_primary(
        self,
        client_user_b: TestClient,
        sample_resume_a: Resume
    ):
        """User B should get 404 when trying to set User A's resume as primary."""
        response = client_user_b.patch(f"/api/v1/resumes/{sample_resume_a.id}/primary")
        assert response.status_code == 404


class TestFeedTenantIsolation:
    """Test that users cannot access other users' feeds."""

    @pytest.fixture
    def sample_rss_feed_a(self, db: Session, test_user_a: User) -> RssFeed:
        """Create a sample RSS feed owned by User A."""
        feed = RssFeed(
            user_id=test_user_a.id,
            name="Test RSS Feed",
            url="https://example.com/jobs.rss",
            is_active=True,
        )
        db.add(feed)
        db.commit()
        db.refresh(feed)
        return feed

    @pytest.fixture
    def sample_company_feed_a(self, db: Session, test_user_a: User) -> CompanyFeed:
        """Create a sample company feed owned by User A."""
        feed = CompanyFeed(
            user_id=test_user_a.id,
            company_name="Anthropic",
            feed_type="greenhouse",
            greenhouse_board_token="anthropic",
            is_active=True,
        )
        db.add(feed)
        db.commit()
        db.refresh(feed)
        return feed

    def test_user_b_cannot_list_user_a_rss_feeds(
        self,
        make_client: Callable[[User], TestClient],
        sample_rss_feed_a: RssFeed,
        test_user_a: User,
        test_user_b: User
    ):
        """User B should NOT see User A's RSS feeds when listing."""
        # User A lists their RSS feeds
        client_a = make_client(test_user_a)
        response_a = client_a.get("/api/v1/feeds")
        assert response_a.status_code == 200
        feeds_a = response_a.json()
        rss_ids_a = [f["id"] for f in feeds_a]
        assert sample_rss_feed_a.id in rss_ids_a

        # User B lists their RSS feeds (should NOT see User A's feeds)
        client_b = make_client(test_user_b)
        response_b = client_b.get("/api/v1/feeds")
        assert response_b.status_code == 200
        feeds_b = response_b.json()
        rss_ids_b = [f["id"] for f in feeds_b]
        assert sample_rss_feed_a.id not in rss_ids_b

    def test_user_b_cannot_list_user_a_company_feeds(
        self,
        make_client: Callable[[User], TestClient],
        sample_company_feed_a: CompanyFeed,
        test_user_a: User,
        test_user_b: User
    ):
        """User B should NOT see User A's company feeds when listing."""
        # User A lists their company feeds
        client_a = make_client(test_user_a)
        response_a = client_a.get("/api/v1/companies")
        assert response_a.status_code == 200
        feeds_a = response_a.json()
        company_ids_a = [f["id"] for f in feeds_a]
        assert sample_company_feed_a.id in company_ids_a

        # User B lists their company feeds (should NOT see User A's feeds)
        client_b = make_client(test_user_b)
        response_b = client_b.get("/api/v1/companies")
        assert response_b.status_code == 200
        feeds_b = response_b.json()
        company_ids_b = [f["id"] for f in feeds_b]
        assert sample_company_feed_a.id not in company_ids_b

    def test_user_b_cannot_delete_user_a_rss_feed(
        self,
        make_client: Callable[[User], TestClient],
        sample_rss_feed_a: RssFeed,
        test_user_b: User,
        db: Session
    ):
        """User B should get 404 when trying to delete User A's RSS feed."""
        client_b = make_client(test_user_b)
        response = client_b.delete(f"/api/v1/feeds/{sample_rss_feed_a.id}")
        assert response.status_code == 404

        # Verify feed still exists
        feed = db.query(RssFeed).filter(RssFeed.id == sample_rss_feed_a.id).first()
        assert feed is not None

    def test_user_b_cannot_delete_user_a_company_feed(
        self,
        make_client: Callable[[User], TestClient],
        sample_company_feed_a: CompanyFeed,
        test_user_b: User,
        db: Session
    ):
        """User B should get 404 when trying to delete User A's company feed."""
        client_b = make_client(test_user_b)
        response = client_b.delete(f"/api/v1/companies/{sample_company_feed_a.id}")
        assert response.status_code == 404

        # Verify feed still exists
        feed = db.query(CompanyFeed).filter(CompanyFeed.id == sample_company_feed_a.id).first()
        assert feed is not None

    def test_user_b_cannot_toggle_user_a_rss_feed(
        self,
        make_client: Callable[[User], TestClient],
        sample_rss_feed_a: RssFeed,
        test_user_b: User
    ):
        """User B should get 404 when trying to toggle User A's RSS feed."""
        client_b = make_client(test_user_b)
        response = client_b.patch(f"/api/v1/feeds/{sample_rss_feed_a.id}/toggle")
        assert response.status_code == 404

    def test_user_b_cannot_toggle_user_a_company_feed(
        self,
        make_client: Callable[[User], TestClient],
        sample_company_feed_a: CompanyFeed,
        test_user_b: User
    ):
        """User B should get 404 when trying to toggle User A's company feed."""
        client_b = make_client(test_user_b)
        response = client_b.patch(f"/api/v1/companies/{sample_company_feed_a.id}/toggle")
        assert response.status_code == 404


class TestBulkOperationIsolation:
    """Test that bulk operations respect tenant isolation."""

    def test_bulk_delete_only_affects_own_jobs(
        self,
        make_client: Callable[[User], TestClient],
        db: Session,
        test_user_a: User,
        test_user_b: User,
        sample_job_data: dict
    ):
        """Bulk delete should only delete the requesting user's jobs."""
        # Create jobs for both users
        job_a = Job(**sample_job_data, user_id=test_user_a.id)
        job_b_data = sample_job_data.copy()
        job_b_data["title"] = "User B's Job"
        job_b = Job(**job_b_data, user_id=test_user_b.id)
        db.add_all([job_a, job_b])
        db.commit()
        db.refresh(job_a)
        db.refresh(job_b)

        # Store IDs before API call
        job_a_id = job_a.id
        job_b_id = job_b.id

        # User B tries to bulk delete both jobs (including User A's)
        client_b = make_client(test_user_b)
        response = client_b.post(
            "/api/v1/jobs/bulk-delete",
            json={"ids": [job_a_id, job_b_id]}
        )
        assert response.status_code == 200

        # Expire the session to force fresh queries
        db.expire_all()

        # User A's job should still exist
        job_a_check = db.query(Job).filter(Job.id == job_a_id).first()
        assert job_a_check is not None

        # User B's job should be deleted
        job_b_check = db.query(Job).filter(Job.id == job_b_id).first()
        assert job_b_check is None

    def test_bulk_status_update_only_affects_own_jobs(
        self,
        make_client: Callable[[User], TestClient],
        db: Session,
        test_user_a: User,
        test_user_b: User,
        sample_job_data: dict
    ):
        """Bulk status update should only update the requesting user's jobs."""
        # Create jobs for both users (sample_job_data already has status="new")
        job_a = Job(**sample_job_data, user_id=test_user_a.id)
        job_b_data = sample_job_data.copy()
        job_b_data["title"] = "User B's Job"
        job_b = Job(**job_b_data, user_id=test_user_b.id)
        db.add_all([job_a, job_b])
        db.commit()
        db.refresh(job_a)
        db.refresh(job_b)

        # User B tries to update status for both jobs
        client_b = make_client(test_user_b)
        response = client_b.patch(
            "/api/v1/jobs/bulk-status",
            json={"ids": [job_a.id, job_b.id], "status": "archived"}
        )
        assert response.status_code == 200

        # Refresh from DB
        db.refresh(job_a)
        db.refresh(job_b)

        # User A's job status should be unchanged
        assert job_a.status == "new"

        # User B's job status should be updated
        assert job_b.status == "archived"
