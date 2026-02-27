"""
Test fixtures for HuntBoard backend tests.

Provides:
- Test database session with rollback after each test
- FastAPI test client with dependency overrides
- Test user fixtures for multi-tenant isolation testing
"""
import os
import pytest
from typing import Generator, Tuple, Callable
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

# Set test environment variables before importing app modules
os.environ.setdefault("AUTH_DEV_MODE", "true")
os.environ.setdefault("S3_RESUME_BUCKET", "test-bucket")
os.environ.setdefault("USE_LOCAL_STORAGE", "true")

from app.database import Base, get_db
from app.main import app
from app.dependencies import get_user_db
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.rss_feed import RssFeed
from app.models.company_feed import CompanyFeed

# Test database URL from environment or default
TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://huntboard:huntboard_dev_password@localhost:5432/huntboard"
)

# Create test engine
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Test user constants
TEST_USER_A_ID = "test-user-a-0000-0000-000000000001"
TEST_USER_A_EMAIL = "test_user_a@example.com"

TEST_USER_B_ID = "test-user-b-0000-0000-000000000002"
TEST_USER_B_EMAIL = "test_user_b@example.com"


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test.
    Uses transactions for isolation and rolls back after test.
    """
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def test_user_a(db: Session) -> User:
    """Create test user A in the database."""
    user = db.query(User).filter(User.id == TEST_USER_A_ID).first()
    if not user:
        user = User(
            id=TEST_USER_A_ID,
            email=TEST_USER_A_EMAIL,
            full_name="Test User A",
            onboarding_complete=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_user_b(db: Session) -> User:
    """Create test user B in the database."""
    user = db.query(User).filter(User.id == TEST_USER_B_ID).first()
    if not user:
        user = User(
            id=TEST_USER_B_ID,
            email=TEST_USER_B_EMAIL,
            full_name="Test User B",
            onboarding_complete=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def create_override_get_user_db(db: Session, user: User):
    """Create a dependency override for get_user_db."""
    async def override() -> Tuple[Session, User]:
        return (db, user)
    return override


@pytest.fixture(scope="function")
def make_client(db: Session) -> Callable[[User], TestClient]:
    """
    Factory fixture that creates test clients for different users.
    Use this when you need to make requests as different users in the same test.

    Usage:
        def test_something(make_client, test_user_a, test_user_b):
            client_a = make_client(test_user_a)
            client_b = make_client(test_user_b)
    """
    def _make_client(user: User) -> TestClient:
        def override_get_db():
            yield db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_user_db] = create_override_get_user_db(db, user)
        return TestClient(app)

    yield _make_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client_user_a(db: Session, test_user_a: User) -> Generator[TestClient, None, None]:
    """
    Create a test client authenticated as User A.
    """
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_user_db] = create_override_get_user_db(db, test_user_a)

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client_user_b(db: Session, test_user_b: User) -> Generator[TestClient, None, None]:
    """
    Create a test client authenticated as User B.
    """
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_user_db] = create_override_get_user_db(db, test_user_b)

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client_no_auth(db: Session) -> Generator[TestClient, None, None]:
    """
    Create a test client with no authentication (for testing auth requirements).
    This clears dependency overrides so the real auth is used.
    """
    def override_get_db():
        yield db

    # Only override DB, not auth
    app.dependency_overrides[get_db] = override_get_db
    # Remove any user_db override to test real auth
    if get_user_db in app.dependency_overrides:
        del app.dependency_overrides[get_user_db]

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def sample_job_data() -> dict:
    """Return sample job data for creating test jobs."""
    return {
        "title": "Senior Software Engineer",
        "company": "Test Company",
        "location": "San Francisco, CA",
        "description": "We are looking for a senior software engineer...",
        "url": "https://example.com/jobs/123",
        "source": "manual",
        "status": "new",
        "remote_type": "hybrid",
    }


@pytest.fixture(scope="function")
def sample_job_a(db: Session, test_user_a: User, sample_job_data: dict) -> Job:
    """Create a sample job owned by User A."""
    job = Job(
        **sample_job_data,
        user_id=test_user_a.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job
