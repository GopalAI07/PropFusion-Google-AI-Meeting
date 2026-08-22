from datetime import datetime, timezone
import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from fastapi import HTTPException

from ..database.models import Meeting, MeetingStatus, generate_meeting_code
from ..schemas.schemas import MeetingCreate, MeetingUpdate, MeetingResponse


class MeetingService:
    def __init__(self, db: Session):
        self.db = db

    def create_meeting(self, meeting_data: MeetingCreate, user_id: str) -> Meeting:
        """Create a new meeting."""
        meeting = Meeting(
            user_id=user_id,
            title=meeting_data.title,
            description=meeting_data.description,
            meeting_code=self._generate_unique_meeting_code(),
            scheduled_at=meeting_data.scheduled_at,
            duration_minutes=meeting_data.duration_minutes,
            timezone=meeting_data.timezone or "UTC",
            meeting_link=meeting_data.meeting_link,
            participant_emails=meeting_data.participant_emails or [],
            tags=meeting_data.tags or [],
            notes=meeting_data.notes,
            is_ai_summary_enabled=meeting_data.is_ai_summary_enabled,
            participant_count=len(meeting_data.participant_emails or []),
        )
        self.db.add(meeting)
        self.db.commit()
        self.db.refresh(meeting)
        return meeting

    def _generate_unique_meeting_code(self) -> str:
        """Generate a meeting code that isn't already taken."""
        for _ in range(10):
            code = generate_meeting_code()
            exists = self.db.query(Meeting).filter(Meeting.meeting_code == code).first()
            if not exists:
                return code
        # Extremely unlikely fallback
        return f"{generate_meeting_code()}-{uuid.uuid4().hex[:4]}"

    def get_meeting(self, meeting_id: str, user_id: str) -> Meeting:
        """Get a meeting by ID (owner only)."""
        meeting = self.db.query(Meeting).filter(
            Meeting.id == meeting_id,
            Meeting.user_id == user_id,
        ).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting

    def get_meeting_by_id(self, meeting_id: str) -> Meeting:
        """Get a meeting by ID only, without ownership restriction.
        Used for the join flow so any authenticated user with the link can view it."""
        meeting = self.db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting

    def get_meeting_by_code(self, meeting_code: str) -> Meeting:
        """Get a meeting by its shareable meeting code (for joining)."""
        meeting = self.db.query(Meeting).filter(
            Meeting.meeting_code == meeting_code.strip().lower()
        ).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found for this code")
        return meeting

    def add_participant(self, meeting_id: str, name: str, email: str) -> Meeting:
        """Register a participant who is joining via the meeting code/link."""
        meeting = self.get_meeting_by_id(meeting_id)

        emails = list(meeting.participant_emails or [])
        normalized_email = email.strip().lower()
        if normalized_email not in [e.strip().lower() for e in emails]:
            emails.append(email.strip())
            meeting.participant_emails = emails
            meeting.participant_count = len(emails)

        self.db.commit()
        self.db.refresh(meeting)
        return meeting

    def get_user_meetings(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 10,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        search: Optional[str] = None,
    ) -> Tuple[List[Meeting], int]:
        """Get paginated list of meetings for a user."""
        query = self.db.query(Meeting).filter(Meeting.user_id == user_id)

        if status:
            try:
                meeting_status = MeetingStatus(status)
                query = query.filter(Meeting.status == meeting_status)
            except ValueError:
                pass

        if search:
            query = query.filter(Meeting.title.ilike(f"%{search}%"))

        sort_column = getattr(Meeting, sort_by, Meeting.created_at)
        order_fn = desc if sort_order == "desc" else asc
        query = query.order_by(order_fn(sort_column))

        total = query.count()
        meetings = query.offset((page - 1) * page_size).limit(page_size).all()
        return meetings, total

    def update_meeting(self, meeting_id: str, user_id: str, update_data: MeetingUpdate) -> Meeting:
        """Update a meeting."""
        meeting = self.get_meeting(meeting_id, user_id)

        update_dict = update_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if value is not None:
                setattr(meeting, key, value)

        if "participant_emails" in update_dict and update_dict["participant_emails"]:
            meeting.participant_count = len(update_dict["participant_emails"])

        self.db.commit()
        self.db.refresh(meeting)
        return meeting

    def delete_meeting(self, meeting_id: str, user_id: str) -> bool:
        """Delete a meeting."""
        meeting = self.get_meeting(meeting_id, user_id)
        self.db.delete(meeting)
        self.db.commit()
        return True

    def update_meeting_status(self, meeting_id: str, user_id: str, status: str) -> Meeting:
        """Update meeting status (start, end, cancel, pause). Only the host (owner) may call this."""
        meeting = self.get_meeting(meeting_id, user_id)

        try:
            new_status = MeetingStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

        # Restrict the host from starting a meeting before its scheduled time
        if new_status == MeetingStatus.IN_PROGRESS and meeting.status != MeetingStatus.IN_PROGRESS:
            if meeting.scheduled_at:
                now = datetime.now(timezone.utc)
                scheduled = meeting.scheduled_at
                # Normalize scheduled_at to a timezone-aware UTC instant for a correct comparison
                if scheduled.tzinfo is None:
                    scheduled = scheduled.replace(tzinfo=timezone.utc)
                else:
                    scheduled = scheduled.astimezone(timezone.utc)
                if now < scheduled:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "You cannot start this meeting before its scheduled time "
                            f"({scheduled.isoformat()})."
                        ),
                    )

        meeting.status = new_status

        if new_status == MeetingStatus.IN_PROGRESS:
            meeting.started_at = datetime.now(timezone.utc)
        elif new_status == MeetingStatus.COMPLETED:
            meeting.ended_at = datetime.now(timezone.utc)
            if meeting.started_at:
                started_at = meeting.started_at
                # started_at may come back from the DB as timezone-aware (TIMESTAMP WITH TIME ZONE);
                # normalize both sides to aware UTC before subtracting.
                if started_at.tzinfo is None:
                    started_at = started_at.replace(tzinfo=timezone.utc)
                meeting.duration_minutes = int(
                    (meeting.ended_at - started_at).total_seconds() / 60
                )

        self.db.commit()
        self.db.refresh(meeting)
        return meeting

    def get_recent_meetings(self, user_id: str, limit: int = 5) -> List[Meeting]:
        return (
            self.db.query(Meeting)
            .filter(Meeting.user_id == user_id)
            .order_by(desc(Meeting.created_at))
            .limit(limit)
            .all()
        )

    def get_meeting_stats(self, user_id: str) -> dict:
        total = self.db.query(Meeting).filter(Meeting.user_id == user_id).count()
        completed = self.db.query(Meeting).filter(
            Meeting.user_id == user_id,
            Meeting.status == MeetingStatus.COMPLETED,
        ).count()
        in_progress = self.db.query(Meeting).filter(
            Meeting.user_id == user_id,
            Meeting.status == MeetingStatus.IN_PROGRESS,
        ).count()
        scheduled = self.db.query(Meeting).filter(
            Meeting.user_id == user_id,
            Meeting.status == MeetingStatus.SCHEDULED,
        ).count()

        return {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "scheduled": scheduled,
        }

    @staticmethod
    def meeting_to_response(meeting: Meeting) -> MeetingResponse:
        return MeetingResponse(
            id=meeting.id,
            user_id=meeting.user_id,
            title=meeting.title,
            description=meeting.description,
            status=meeting.status.value,
            meeting_code=meeting.meeting_code,
            scheduled_at=meeting.scheduled_at,
            started_at=meeting.started_at,
            ended_at=meeting.ended_at,
            duration_minutes=meeting.duration_minutes,
            meeting_link=meeting.meeting_link,
            recording_url=meeting.recording_url,
            participant_count=meeting.participant_count,
            participant_emails=meeting.participant_emails,
            tags=meeting.tags,
            notes=meeting.notes,
            is_ai_summary_enabled=meeting.is_ai_summary_enabled,
            created_at=meeting.created_at,
            updated_at=meeting.updated_at,
        )

