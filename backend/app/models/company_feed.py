from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CompanyFeed(Base):
    __tablename__ = "company_feeds"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    feed_type = Column(String(50), default="greenhouse")  # "greenhouse", "workday", or "lever"
    greenhouse_board_token = Column(String(255), nullable=True)  # For Greenhouse feeds
    workday_url = Column(Text, nullable=True)  # For Workday feeds (full base URL)
    lever_slug = Column(String(255), nullable=True)  # For Lever feeds (company slug)
    is_active = Column(Boolean, default=True)
    last_fetched = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="company_feeds")
