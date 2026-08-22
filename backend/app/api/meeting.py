from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, Any

from ..database.database import get_db
from ..database.models import User, Meeting
from ..schemas.schemas import (
    MeetingCreate, MeetingUpdate, MeetingResponse, MeetingListResponse, APIResponse,
    ParticipantJoin,
)
from ..services.meeting_service import MeetingService
from ..services.auth_service import AuthService
from ..services.email_service import EmailService
from ..services.file_export_service import FileExportService
from ..workers.background import background_worker

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])


@router.post("", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    request: MeetingCreate,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new meeting."""
    meeting_service = MeetingService(db)
    meeting = meeting_service.create_meeting(request, current_user.id)

    # Send invitations to participants in background
    if meeting.participant_emails:
        for email in meeting.participant_emails:
            background_worker.run_async(
                background_worker.send_email_background(
                    to_email=email,
                    subject=f"Meeting Invitation: {meeting.title}",
                    template="meeting_invitation",
                    context={
                        "meeting_title": meeting.title,
                        "scheduled_at": str(meeting.scheduled_at) if meeting.scheduled_at else "TBD",
                        "meeting_link": meeting.meeting_link or "#",
                    },
                )
            )

    return APIResponse(
        success=True,
        message="Meeting created successfully",
        data={"meeting": MeetingService.meeting_to_response(meeting).dict()},
    )


@router.get("", response_model=MeetingListResponse)
async def list_meetings(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    search: Optional[str] = Query(None, description="Search by title"),
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated list of user's meetings."""
    meeting_service = MeetingService(db)
    meetings, total = meeting_service.get_user_meetings(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search,
    )

    return MeetingListResponse(
        items=[MeetingService.meeting_to_response(m) for m in meetings],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/stats", response_model=APIResponse)
async def get_meeting_stats(
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Get meeting statistics for the current user."""
    meeting_service = MeetingService(db)
    stats = meeting_service.get_meeting_stats(current_user.id)

    return APIResponse(
        success=True,
        data={"stats": stats},
    )


@router.get("/recent", response_model=APIResponse)
async def get_recent_meetings(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Get recent meetings for the current user."""
    meeting_service = MeetingService(db)
    meetings = meeting_service.get_recent_meetings(current_user.id, limit)

    return APIResponse(
        success=True,
        data={
            "meetings": [MeetingService.meeting_to_response(m).dict() for m in meetings],
        },
    )


@router.get("/code/{meeting_code}/join", response_model=APIResponse)
async def get_meeting_by_code_for_join(
    meeting_code: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Look up a meeting by its shareable meeting code, for joining."""
    meeting_service = MeetingService(db)
    meeting = meeting_service.get_meeting_by_code(meeting_code)
    is_host = meeting.user_id == current_user.id

    return APIResponse(
        success=True,
        data={
            "meeting": MeetingService.meeting_to_response(meeting).dict(),
            "is_host": is_host,
        },
    )


@router.post("/{meeting_id}/participants", response_model=APIResponse)
async def join_as_participant(
    meeting_id: str,
    request: ParticipantJoin,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Register the current user's name/email as a participant of the meeting."""
    meeting_service = MeetingService(db)
    meeting = meeting_service.add_participant(meeting_id, request.name, request.email)

    return APIResponse(
        success=True,
        message="Joined meeting",
        data={"meeting": MeetingService.meeting_to_response(meeting).dict()},
    )


@router.get("/{meeting_id}/files", response_model=APIResponse)
async def get_meeting_exported_files(
    meeting_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Demonstrates reading the transcript.txt / summary.txt straight off disk:
    meeting_id -> (DB) meeting + owning user -> username ->
    uploads/{username}/index.json -> file paths for this meeting -> file contents.
    """
    result = FileExportService.get_meeting_files_content(db, meeting_id, current_user.id)
    return APIResponse(success=True, data=result)


@router.get("/{meeting_id}/join", response_model=APIResponse)
async def get_meeting_for_join(
    meeting_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Get meeting info needed to join. Accessible to any authenticated user
    with the meeting ID/link, not just the host."""
    meeting_service = MeetingService(db)
    meeting = meeting_service.get_meeting_by_id(meeting_id)
    is_host = meeting.user_id == current_user.id

    return APIResponse(
        success=True,
        data={
            "meeting": MeetingService.meeting_to_response(meeting).dict(),
            "is_host": is_host,
        },
    )


@router.get("/{meeting_id}", response_model=APIResponse)
async def get_meeting(
    meeting_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific meeting by ID."""
    meeting_service = MeetingService(db)
    meeting = meeting_service.get_meeting(meeting_id, current_user.id)

    return APIResponse(
        success=True,
        data={"meeting": MeetingService.meeting_to_response(meeting).dict()},
    )


@router.put("/{meeting_id}", response_model=APIResponse)
async def update_meeting(
    meeting_id: str,
    request: MeetingUpdate,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Update a meeting."""
    meeting_service = MeetingService(db)
    meeting = meeting_service.update_meeting(meeting_id, current_user.id, request)

    return APIResponse(
        success=True,
        message="Meeting updated successfully",
        data={"meeting": MeetingService.meeting_to_response(meeting).dict()},
    )


@router.delete("/{meeting_id}", response_model=APIResponse)
async def delete_meeting(
    meeting_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a meeting."""
    meeting_service = MeetingService(db)
    meeting_service.delete_meeting(meeting_id, current_user.id)

    return APIResponse(
        success=True,
        message="Meeting deleted successfully",
    )


@router.patch("/{meeting_id}/status", response_model=APIResponse)
async def update_meeting_status(
    meeting_id: str,
    status: str = Query(..., description="New status (scheduled/in_progress/completed/cancelled/paused)"),
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Update meeting status."""
    meeting_service = MeetingService(db)
    meeting = meeting_service.update_meeting_status(meeting_id, current_user.id, status)

    return APIResponse(
        success=True,
        message=f"Meeting status updated to {status}",
        data={"meeting": MeetingService.meeting_to_response(meeting).dict()},
    )
