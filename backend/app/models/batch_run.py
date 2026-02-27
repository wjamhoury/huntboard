from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class BatchRun(Base):
    __tablename__ = "batch_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    run_type = Column(String(50), default="nightly_sync")  # nightly_sync, manual_sync
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="running")  # running, completed, failed

    # Stats
    jobs_imported = Column(Integer, default=0)
    jobs_scored = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)

    # Errors as JSON array string
    errors = Column(Text, default="[]")

    # Relationships
    user = relationship("User", back_populates="batch_runs")
