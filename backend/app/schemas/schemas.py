from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime


# ===================== Generic =====================

class APIResponse(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[Any] = None


class PaginatedResponse(BaseModel):
    success: bool = True
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# ===================== Auth =====================

class LoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6, max_length=100)
    full_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600
    user: Optional["UserResponse"] = None


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool = True
    avatar_url: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


# ===================== Meeting =====================

class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    timezone: Optional[str] = "UTC"
    meeting_link: Optional[str] = None
    participant_emails: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    is_ai_summary_enabled: bool = True


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    timezone: Optional[str] = None
    meeting_link: Optional[str] = None
    participant_emails: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    is_ai_summary_enabled: Optional[bool] = None


class MeetingResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    status: str
    meeting_code: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    meeting_link: Optional[str] = None
    recording_url: Optional[str] = None
    participant_count: int
    participant_emails: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    is_ai_summary_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MeetingListResponse(BaseModel):
    success: bool = True
    items: List[MeetingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ParticipantJoin(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=1, max_length=255)


# ===================== Summary =====================

class SummaryResponse(BaseModel):
    id: str
    meeting_id: str
    user_id: str
    audio_file_path: Optional[str] = None
    title: Optional[str] = None
    short_summary: Optional[str] = None
    detailed_summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    action_items: Optional[List[Dict[str, Any]]] = None
    decisions: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    sentiment_analysis: Optional[Dict[str, Any]] = None
    next_steps: Optional[List[str]] = None
    status: str
    model_used: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SummaryListResponse(BaseModel):
    success: bool = True
    items: List[SummaryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ===================== WebSocket =====================

class WSMessage(BaseModel):
    type: str
    data: Dict[str, Any]
    room_id: Optional[str] = None
    sender_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class WSJoinRoom(BaseModel):
    action: str = "join"
    room_id: str
    user_id: str


class WSLeaveRoom(BaseModel):
    action: str = "leave"
    room_id: str
    user_id: str

