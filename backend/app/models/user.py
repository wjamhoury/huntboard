from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)  # Cognito sub UUID
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    linkedin_id = Column(String(255), unique=True, nullable=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    onboarding_complete = Column(Boolean, default=False, nullable=False)
    preferences = Column(JSON, nullable=True, default=dict)  # User preferences (sort order, auto-archive, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_digest_sent = Column(DateTime(timezone=True), nullable=True)

    # Relationships with cascade delete-orphan
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    rss_feeds = relationship("RssFeed", back_populates="user", cascade="all, delete-orphan")
    company_feeds = relationship("CompanyFeed", back_populates="user", cascade="all, delete-orphan")
    batch_runs = relationship("BatchRun", back_populates="user", cascade="all, delete-orphan")
