from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from ..database.database import get_db
from ..database.models import User, Summary
from ..schemas.schemas import SummaryResponse, SummaryListResponse, APIResponse
from ..services.summary_service import SummaryService
from ..services.auth_service import AuthService
from ..workers.background import background_worker

router = APIRouter(prefix="/api/summaries", tags=["Summaries"])


@router.post("/generate", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def generate_summary(
    meeting_id: str = Query(..., description="Meeting ID"),
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an AI summary for a meeting."""
    summary_service = SummaryService(db)
    summary = summary_service.create_summary(meeting_id=meeting_id, user_id=current_user.id)

    # Trigger background AI summary generation
    background_worker.run_async(
        background_worker.generate_summary_background(summary.id, current_user.id)
    )

    return APIResponse(
        success=True,
        message="Summary generation started",
        data={"summary": SummaryService.summary_to_response(summary).dict()},
    )


@router.post("/upload-audio", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def upload_audio_summary(
    meeting_id: str = Query(..., description="Meeting ID"),
    file: UploadFile = File(...),
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an audio recording for direct AI summary generation."""
    valid_types = [
        "audio/mp3", "audio/wav", "audio/m4a", "audio/ogg", "audio/flac", "audio/mpeg",
        "audio/webm", "video/webm", "audio/webm;codecs=opus", "audio/mp4"
    ]
    valid_exts = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm", ".mp4"]
    if file.content_type not in valid_types and not any(
        file.filename.lower().endswith(ext) for ext in valid_exts
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid audio format. Supported: mp3, wav, m4a, ogg, flac, webm, mp4",
        )

    import os
    import uuid
    from ..config.settings import settings

    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, file_name)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    summary_service = SummaryService(db)
    summary = summary_service.create_summary(
        meeting_id=meeting_id,
        user_id=current_user.id,
        audio_file_path=file_path,
    )

    background_worker.run_async(
        background_worker.generate_summary_background(summary.id, current_user.id)
    )

    return APIResponse(
        success=True,
        message="Audio uploaded and summary generation started",
        data={
            "summary": SummaryService.summary_to_response(summary).dict(),
            "file_path": file_path,
        },
    )


@router.get("/meeting/{meeting_id}", response_model=SummaryListResponse)
async def get_meeting_summaries(
    meeting_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Get all summaries for a meeting."""
    summary_service = SummaryService(db)
    summaries, total = summary_service.get_meeting_summaries(
        meeting_id=meeting_id,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )

    return SummaryListResponse(
        items=[SummaryService.summary_to_response(s) for s in summaries],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("", response_model=SummaryListResponse)
async def get_user_summaries(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Get all summaries for the current user."""
    summary_service = SummaryService(db)
    summaries, total = summary_service.get_summaries_by_user(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )

    return SummaryListResponse(
        items=[SummaryService.summary_to_response(s) for s in summaries],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{summary_id}", response_model=APIResponse)
async def get_summary(
    summary_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific summary by ID."""
    summary_service = SummaryService(db)
    summary = summary_service.get_summary(summary_id, current_user.id)

    return APIResponse(
        success=True,
        data={"summary": SummaryService.summary_to_response(summary).dict()},
    )


@router.delete("/{summary_id}", response_model=APIResponse)
async def delete_summary(
    summary_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a summary."""
    summary_service = SummaryService(db)
    summary_service.delete_summary(summary_id, current_user.id)

    return APIResponse(
        success=True,
        message="Summary deleted successfully",
    )
