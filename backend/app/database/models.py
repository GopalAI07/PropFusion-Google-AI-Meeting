import uuid
import random
import string
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Enum, Float,
    ForeignKey, JSON, Integer, LargeBinary
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from .database import Base


def generate_uuid():
    return str(uuid.uuid4())


def generate_meeting_code():
    """Generate a human-friendly meeting code, e.g. 'abc-defg-hij' (Google Meet style)."""
    def chunk(n):
        return ''.join(random.choices(string.ascii_lowercase, k=n))
    return f"{chunk(3)}-{chunk(4)}-{chunk(3)}"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    PREMIUM = "premium"


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class SummaryStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    meetings = relationship("Meeting", back_populates="user", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(MeetingStatus), default=MeetingStatus.SCHEDULED, nullable=False)
    meeting_code = Column(String(20), unique=True, nullable=True, index=True, default=generate_meeting_code)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    timezone = Column(String(50), default="UTC", nullable=False)
    meeting_link = Column(String(500), nullable=True)
    recording_url = Column(String(500), nullable=True)
    recording_duration = Column(Float, nullable=True)
    participant_count = Column(Integer, default=0, nullable=False)
    participant_emails = Column(JSON, default=list, nullable=True)
    tags = Column(JSON, default=list, nullable=True)
    notes = Column(Text, nullable=True)
    is_ai_summary_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="meetings")
    summaries = relationship("Summary", back_populates="meeting", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Meeting(id={self.id}, title={self.title}, status={self.status})>"


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    audio_file_path = Column(String(500), nullable=True)
    title = Column(String(500), nullable=True)
    short_summary = Column(Text, nullable=True)  # Brief 2-3 sentence summary
    detailed_summary = Column(Text, nullable=True)  # Comprehensive summary
    key_points = Column(JSON, default=list, nullable=True)  # List of key takeaways
    action_items = Column(JSON, default=list, nullable=True)  # Action items with assignees
    decisions = Column(JSON, default=list, nullable=True)  # Decisions made
    topics = Column(JSON, default=list, nullable=True)  # Topics discussed
    sentiment_analysis = Column(JSON, default=dict, nullable=True)  # Overall sentiment
    next_steps = Column(JSON, default=list, nullable=True)  # Follow-up actions
    status = Column(Enum(SummaryStatus), default=SummaryStatus.PENDING, nullable=False)
    model_used = Column(String(100), default="gemini-pro", nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="summaries")
    meeting = relationship("Meeting", back_populates="summaries")

    def __repr__(self):
        return f"<Summary(id={self.id}, status={self.status})>"

