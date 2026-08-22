import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Optional

from ..websocket.manager import manager
from ..services.auth_service import AuthService
from ..config.settings import settings
from ..database.database import SessionLocal
from ..database.models import Meeting

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


def _is_meeting_host(meeting_id: str, user_id: str) -> bool:
    """Lightweight, self-contained DB check (no FastAPI Depends, since this
    is used from inside a WebSocket route before the connection is accepted)."""
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        return bool(meeting and meeting.user_id == user_id)
    except Exception:
        return False
    finally:
        db.close()


@router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(..., description="JWT authentication token"),
    user_id: Optional[str] = Query(None, description="User ID (optional, extracted from token)"),
    is_host: bool = False,
):
    """
    WebSocket endpoint for real-time meeting collaboration.
    
    Query Parameters:
    - token: JWT authentication token (required)
    - user_id: Optional user ID (will be extracted from token if not provided)
    
    Message Types:
    - transcript_segment: Real-time transcript update
    - meeting_action: Meeting control actions (start/pause/resume/end)
    - typing: Typing indicator
    - ping: Health check
    - host_moderate: Host-only — mute/unmute a participant's mic or camera,
      or remove them from the meeting entirely.
    """
    # Authenticate user via token
    try:
        payload = AuthService.decode_token(token)
        authenticated_user_id = payload.get("sub")
        if not authenticated_user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Use provided user_id or fallback to authenticated user
    active_user_id = user_id or authenticated_user_id

    # A host may have removed this user earlier in the session — keep them out
    if manager.is_blocked(room_id, active_user_id):
        await websocket.close(code=4003, reason="You have been removed from this meeting")
        return

    # Connect to room
    connected = await manager.connect(websocket, room_id, active_user_id, is_host=is_host)
    if not connected:
        return

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()

            try:
                message_data = json.loads(data)
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    {
                        "type": "error",
                        "data": {"message": "Invalid JSON format"},
                    },
                    active_user_id,
                    room_id,
                )
                continue

            # Handle the message
            await manager.handle_message(websocket, room_id, active_user_id, message_data)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={active_user_id}, room={room_id}")
    except Exception as e:
        logger.error(f"WebSocket error: user={active_user_id}, room={room_id}, error={str(e)}")
    finally:
        await manager.disconnect(websocket, room_id, active_user_id)


@router.websocket("/ws/meeting/{meeting_id}")
async def meeting_websocket_endpoint(
    websocket: WebSocket,
    meeting_id: str,
    token: str = Query(..., description="JWT authentication token"),
):
    """
    WebSocket endpoint specifically for meeting rooms.
    Shorthand for /ws/{room_id} with meeting-specific room naming.
    Automatically determines whether the connecting user is the meeting host,
    which unlocks host-only moderation actions (mute/remove participants).
    """
    room_id = f"meeting:{meeting_id}"

    try:
        payload = AuthService.decode_token(token)
        authenticated_user_id = payload.get("sub")
    except Exception:
        authenticated_user_id = None

    is_host = bool(authenticated_user_id) and _is_meeting_host(meeting_id, authenticated_user_id)

    await websocket_endpoint(websocket, room_id, token=token, is_host=is_host)
