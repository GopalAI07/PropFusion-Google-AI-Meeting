import asyncio
import logging
from typing import Optional, Callable, Any
from functools import wraps
from datetime import datetime
from sqlalchemy.orm import Session

from ..config.settings import settings
from ..database.database import SessionLocal
from ..database.models import Summary, SummaryStatus, Meeting, MeetingStatus
from ..services.ai_service import AIService
from ..services.summary_service import SummaryService
from ..services.email_service import EmailService
from ..services.file_export_service import FileExportService, FileExportError
from ..websocket.manager import manager

logger = logging.getLogger(__name__)


class BackgroundWorker:
    """
    Handles background tasks such as AI summary generation,
    email notifications, and data processing.
    """

    def __init__(self):
        self.ai_service = AIService() if settings.GEMINI_API_KEY else None
        self.email_service = EmailService()
        self._tasks = {}

    async def generate_summary_background(self, summary_id: str, user_id: str):
        """
        Background task to generate AI summary directly from meeting audio or details.
        """
        db: Session = SessionLocal()
        try:
            summary_service = SummaryService(db)
            summary = summary_service.get_summary(summary_id, user_id)

            if not summary:
                logger.error(f"Summary {summary_id} not found")
                return

            # Update status to generating
            summary = summary_service.update_summary(summary_id, user_id, {
                "status": SummaryStatus.GENERATING,
            })

            meeting = summary.meeting

            # Notify via WebSocket
            await manager.broadcast_summary_update(meeting.id if meeting else summary.meeting_id, {
                "summary_id": summary_id,
                "status": "generating",
                "progress": 0.3,
            })

            # Generate summary using AI directly from audio file if present
            if self.ai_service and summary.audio_file_path:
                summary_data = await asyncio.to_thread(
                    self.ai_service.generate_summary_from_audio,
                    summary.audio_file_path,
                    title=meeting.title if meeting else None,
                )

                await manager.broadcast_summary_update(meeting.id if meeting else summary.meeting_id, {
                    "summary_id": summary_id,
                    "status": "processing",
                    "progress": 0.7,
                })

                # Update summary with AI result
                update_data = {
                    "status": SummaryStatus.COMPLETED,
                    "title": summary_data.get("title", meeting.title if meeting else "Meeting Summary"),
                    "short_summary": summary_data.get("short_summary", ""),
                    "detailed_summary": summary_data.get("detailed_summary", ""),
                    "key_points": summary_data.get("key_points", []),
                    "action_items": summary_data.get("action_items", []),
                    "decisions": summary_data.get("decisions", []),
                    "topics": summary_data.get("topics", []),
                    "sentiment_analysis": summary_data.get("sentiment_analysis", {}),
                    "next_steps": summary_data.get("next_steps", []),
                    "model_used": settings.GEMINI_MODEL,
                }
            elif self.ai_service:
                # No audio file attached, generate high-level meeting summary from title/description
                summary_data = await asyncio.to_thread(
                    self.ai_service.generate_summary,
                    f"Meeting Title: {meeting.title}\nDescription: {meeting.description or 'No description'}",
                    title=meeting.title if meeting else None,
                )
                update_data = {
                    "status": SummaryStatus.COMPLETED,
                    "title": summary_data.get("title", meeting.title if meeting else "Meeting Summary"),
                    "short_summary": summary_data.get("short_summary", ""),
                    "detailed_summary": summary_data.get("detailed_summary", ""),
                    "key_points": summary_data.get("key_points", []),
                    "action_items": summary_data.get("action_items", []),
                    "decisions": summary_data.get("decisions", []),
                    "topics": summary_data.get("topics", []),
                    "sentiment_analysis": summary_data.get("sentiment_analysis", {}),
                    "next_steps": summary_data.get("next_steps", []),
                    "model_used": settings.GEMINI_MODEL,
                }
            else:
                # No AI service configured
                update_data = {
                    "status": SummaryStatus.COMPLETED,
                    "title": meeting.title if meeting else "Meeting Summary",
                    "short_summary": "AI service not configured. Enable GEMINI_API_KEY for AI summaries.",
                }

            summary_service.update_summary(summary_id, user_id, update_data)

            # Export summary.txt to uploads/{username}/meetings/{meeting_id}/summary.txt
            if meeting and meeting.user:
                try:
                    FileExportService.save_summary_file(
                        username=meeting.user.username,
                        meeting_id=meeting.id,
                        meeting_title=meeting.title,
                        content=update_data.get("detailed_summary") or update_data.get("short_summary") or "",
                    )
                except FileExportError as e:
                    logger.error(f"Failed to export summary.txt for meeting {meeting.id}: {e}")

            # Notify completion via WebSocket
            await manager.broadcast_summary_update(meeting.id if meeting else summary.meeting_id, {
                "summary_id": summary_id,
                "status": "completed",
                "progress": 1.0,
            })

            # Send email notification if meeting has participants
            if meeting and meeting.participant_emails:
                for email in meeting.participant_emails:
                    try:
                        self.email_service.send_meeting_summary(
                            to_email=email,
                            meeting_title=meeting.title,
                            summary_text=update_data.get("short_summary", ""),
                            meeting_link=meeting.meeting_link or "#",
                        )
                    except Exception as e:
                        logger.error(f"Failed to send summary email to {email}: {e}")

            logger.info(f"Summary {summary_id} generated successfully")

        except Exception as e:
            logger.error(f"Background summary generation failed for {summary_id}: {e}")
            try:
                db = SessionLocal()
                summary_service = SummaryService(db)
                summary_service.update_summary(summary_id, user_id, {
                    "status": SummaryStatus.FAILED,
                    "error_message": str(e),
                })
                db.close()
            except Exception:
                pass
        finally:
            db.close()

    async def send_email_background(self, to_email: str, subject: str, template: str, context: dict):
        """Background task to send emails asynchronously."""
        try:
            if template == "welcome":
                self.email_service.send_welcome_email(to_email, context.get("username", ""))
            elif template == "meeting_invitation":
                self.email_service.send_meeting_invitation(
                    to_email,
                    context.get("meeting_title", ""),
                    context.get("scheduled_at", ""),
                    context.get("meeting_link", ""),
                )
            elif template == "password_reset":
                self.email_service.send_password_reset(
                    to_email,
                    context.get("reset_link", ""),
                )
            logger.info(f"Email sent to {to_email} (template: {template})")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")

    def run_async(self, coro):
        """Run an async task in the event loop."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(coro)
            else:
                loop.run_until_complete(coro)
        except RuntimeError:
            asyncio.run(coro)


# Singleton instance
background_worker = BackgroundWorker()
