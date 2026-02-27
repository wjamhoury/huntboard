from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class UsageEvent(Base):
    """Lightweight usage tracking for analytics. Privacy-respecting - no PII stored."""
    __tablename__ = "usage_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event = Column(String(100), nullable=False, index=True)  # e.g., "user_login", "job_created", "job_triaged"
    event_data = Column(JSON, nullable=True)  # Optional structured data (e.g., {"direction": "right", "count": 5})
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
