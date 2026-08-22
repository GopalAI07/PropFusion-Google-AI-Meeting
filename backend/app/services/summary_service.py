from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException

from ..database.models import Summary, SummaryStatus, Meeting
from ..schemas.schemas import SummaryResponse


class SummaryService:
    def __init__(self, db: Session):
        self.db = db

    def create_summary(self, meeting_id: str, user_id: str, audio_file_path: Optional[str] = None) -> Summary:
        """Create a new summary entry for a meeting."""
        meeting = self.db.query(Meeting).filter(
            Meeting.id == meeting_id,
            Meeting.user_id == user_id,
        ).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        summary = Summary(
            meeting_id=meeting_id,
            user_id=user_id,
            audio_file_path=audio_file_path,
            status=SummaryStatus.PENDING,
        )
        self.db.add(summary)
        self.db.commit()
        self.db.refresh(summary)
        return summary

    def get_summary(self, summary_id: str, user_id: str) -> Summary:
        """Get a summary by ID."""
        summary = self.db.query(Summary).filter(
            Summary.id == summary_id,
            Summary.user_id == user_id,
        ).first()
        if not summary:
            raise HTTPException(status_code=404, detail="Summary not found")
        return summary

    def get_meeting_summaries(
        self,
        meeting_id: str,
        user_id: str,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[Summary], int]:
        """Get all summaries for a meeting."""
        meeting = self.db.query(Meeting).filter(
            Meeting.id == meeting_id,
            Meeting.user_id == user_id,
        ).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        query = self.db.query(Summary).filter(
            Summary.meeting_id == meeting_id,
            Summary.user_id == user_id,
        ).order_by(desc(Summary.created_at))

        total = query.count()
        summaries = query.offset((page - 1) * page_size).limit(page_size).all()
        return summaries, total

    def update_summary(self, summary_id: str, user_id: str, update_data: dict) -> Summary:
        """Update a summary with AI-generated content."""
        summary = self.get_summary(summary_id, user_id)

        for key, value in update_data.items():
            if value is not None and hasattr(summary, key):
                setattr(summary, key, value)

        if "status" not in update_data:
            summary.status = SummaryStatus.COMPLETED

        self.db.commit()
        self.db.refresh(summary)
        return summary

    def delete_summary(self, summary_id: str, user_id: str) -> bool:
        """Delete a summary."""
        summary = self.get_summary(summary_id, user_id)
        self.db.delete(summary)
        self.db.commit()
        return True

    def get_summaries_by_user(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[Summary], int]:
        """Get all summaries for a user."""
        query = self.db.query(Summary).filter(
            Summary.user_id == user_id,
        ).order_by(desc(Summary.created_at))

        total = query.count()
        summaries = query.offset((page - 1) * page_size).limit(page_size).all()
        return summaries, total

    @staticmethod
    def summary_to_response(summary: Summary) -> SummaryResponse:
        return SummaryResponse(
            id=summary.id,
            meeting_id=summary.meeting_id,
            user_id=summary.user_id,
            audio_file_path=summary.audio_file_path,
            title=summary.title,
            short_summary=summary.short_summary,
            detailed_summary=summary.detailed_summary,
            key_points=summary.key_points or [],
            action_items=summary.action_items or [],
            decisions=summary.decisions or [],
            topics=summary.topics or [],
            sentiment_analysis=summary.sentiment_analysis or {},
            next_steps=summary.next_steps or [],
            status=summary.status.value if hasattr(summary.status, "value") else str(summary.status),
            model_used=summary.model_used,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
            error_message=summary.error_message,
        )
