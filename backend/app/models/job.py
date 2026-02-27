from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), default="")
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    remote_type = Column(String(50), default="unknown")  # remote, hybrid, onsite, unknown

    # Normalized location fields (parsed from location string)
    location_city = Column(String(100), nullable=True, index=True)
    location_state = Column(String(50), nullable=True, index=True)
    location_country = Column(String(50), nullable=True, default="US")
    is_remote = Column(Boolean, nullable=True, default=False, index=True)
    is_hybrid = Column(Boolean, nullable=True, default=False)
    url = Column(Text, default="")
    source = Column(String(100), default="manual", index=True)
    description = Column(Text, default="")

    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_notes = Column(String(255), default="")

    # Employment metadata
    seniority_level = Column(String(100), default="")  # senior, mid, entry, etc.
    employment_type = Column(String(100), default="")  # full-time, contract, etc.

    status = Column(String(50), default="new")  # new, reviewing, applied, interviewing, rejected, offer, archived
    applied = Column(Boolean, default=False)
    applied_date = Column(Date, nullable=True)
    response_date = Column(Date, nullable=True)  # Set when moving to interviewing
    follow_up_date = Column(Date, nullable=True)
    priority = Column(Integer, default=3)  # 1 (highest) to 5 (lowest)

    why_this_company = Column(Text, default="")
    company_notes = Column(Text, default="")
    general_notes = Column(Text, default="")
    notes = Column(Text, nullable=True)  # User's personal notes about this job
    rejection_reason = Column(String(100), default="")

    # Match scoring (0-100 scale)
    match_score = Column(Integer, nullable=True)
    why_good_fit = Column(Text, default="")  # JSON array of reasons
    missing_gaps = Column(Text, default="")  # JSON array of gaps
    score_detail = Column(Text, default="")  # JSON object with score breakdown
    scored_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    resume = relationship("Resume", foreign_keys=[resume_id])
    user = relationship("User", back_populates="jobs")
