import json
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

from ..config.settings import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    WebSocket connection manager for managing real-time connections.
    Supports rooms for meeting-specific broadcasting.
    """

    def __init__(self):
        # active_connections: {room_id: {user_id: WebSocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # user_rooms: {user_id: set(room_ids)}
        self.user_rooms: Dict[str, Set[str]] = {}
        # room_hosts: {room_id: user_id} — who is allowed to moderate this room
        self.room_hosts: Dict[str, str] = {}
        # blocked_users: {room_id: set(user_id)} — removed by the host, cannot rejoin
        self.blocked_users: Dict[str, Set[str]] = {}
        self.total_connections = 0

    def is_blocked(self, room_id: str, user_id: str) -> bool:
        return user_id in self.blocked_users.get(room_id, set())

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, is_host: bool = False) -> bool:
        """Accept a new WebSocket connection and join a room. Returns False if rejected."""
        # Check max connections
        if self.total_connections >= settings.WS_MAX_CONNECTIONS:
            await websocket.close(code=1008, reason="Maximum connections reached")
            return False

        await websocket.accept()

        # Initialize room if not exists
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}

        # Add connection to room
        self.active_connections[room_id][user_id] = websocket

        # Track user rooms
        if user_id not in self.user_rooms:
            self.user_rooms[user_id] = set()
        self.user_rooms[user_id].add(room_id)

        if is_host:
            self.room_hosts[room_id] = user_id

        self.total_connections += 1

        # Notify room about new user
        await self.broadcast_to_room(
            room_id,
            {
                "type": "user_joined",
                "data": {"user_id": user_id, "room_id": room_id},
                "timestamp": datetime.utcnow().isoformat(),
            },
            exclude_user_id=user_id,
        )

        logger.info(f"User {user_id} connected to room {room_id}. Total connections: {self.total_connections}")
        return True

    async def disconnect(self, websocket: WebSocket, room_id: str, user_id: str):
        """Remove a WebSocket connection."""
        if room_id in self.active_connections and user_id in self.active_connections[room_id]:
            del self.active_connections[room_id][user_id]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

            self.total_connections -= 1

        # Cleanup user rooms
        if user_id in self.user_rooms and room_id in self.user_rooms[user_id]:
            self.user_rooms[user_id].discard(room_id)
            if not self.user_rooms[user_id]:
                del self.user_rooms[user_id]

        if self.room_hosts.get(room_id) == user_id:
            del self.room_hosts[room_id]

        # Notify room about user leaving
        await self.broadcast_to_room(
            room_id,
            {
                "type": "user_left",
                "data": {"user_id": user_id, "room_id": room_id},
                "timestamp": datetime.utcnow().isoformat(),
            },
            exclude_user_id=user_id,
        )

        logger.info(f"User {user_id} disconnected from room {room_id}")

    async def send_personal_message(self, message: dict, user_id: str, room_id: str):
        """Send a message to a specific user in a room."""
        if room_id in self.active_connections and user_id in self.active_connections[room_id]:
            websocket = self.active_connections[room_id][user_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send personal message to {user_id}: {e}")

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user_id: Optional[str] = None):
        """Broadcast a message to all users in a room."""
        if room_id not in self.active_connections:
            return

        disconnected = []
        for user_id, websocket in self.active_connections[room_id].items():
            if user_id == exclude_user_id:
                continue
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to {user_id}: {e}")
                disconnected.append(user_id)

        # Cleanup disconnected users
        for user_id in disconnected:
            await self.disconnect(
                self.active_connections[room_id][user_id],
                room_id,
                user_id,
            )

    async def broadcast_summary_update(self, room_id: str, summary_data: dict):
        """Broadcast summary generation progress to a room."""
        message = {
            "type": "summary_update",
            "data": summary_data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        await self.broadcast_to_room(room_id, message)

    async def broadcast_meeting_update(self, room_id: str, meeting_data: dict):
        """Broadcast meeting status changes to a room."""
        message = {
            "type": "meeting_update",
            "data": meeting_data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        await self.broadcast_to_room(room_id, message)

    def get_room_users(self, room_id: str) -> list:
        """Get list of users in a room."""
        if room_id in self.active_connections:
            return list(self.active_connections[room_id].keys())
        return []

    def get_user_rooms(self, user_id: str) -> set:
        """Get all rooms a user is connected to."""
        return self.user_rooms.get(user_id, set())

    def get_room_count(self, room_id: str) -> int:
        """Get number of connected users in a room."""
        if room_id in self.active_connections:
            return len(self.active_connections[room_id])
        return 0

    async def handle_message(self, websocket: WebSocket, room_id: str, user_id: str, data: dict):
        """Handle incoming WebSocket messages."""
        message_type = data.get("type", "unknown")

        if message_type in ("webrtc_offer", "webrtc_answer", "webrtc_ice_candidate"):
            # Relay WebRTC signaling data directly to the intended peer
            target_user_id = data.get("data", {}).get("target_user_id")
            if target_user_id:
                await self.send_personal_message(
                    {
                        "type": message_type,
                        "data": {
                            **data.get("data", {}),
                            "from_user_id": user_id,
                        },
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    target_user_id,
                    room_id,
                )

        elif message_type == "get_room_users":
            await self.send_personal_message(
                {
                    "type": "room_users",
                    "data": {"users": self.get_room_users(room_id)},
                    "timestamp": datetime.utcnow().isoformat(),
                },
                user_id,
                room_id,
            )

        elif message_type == "ping":
            await self.send_personal_message(
                {"type": "pong", "data": {}, "timestamp": datetime.utcnow().isoformat()},
                user_id,
                room_id,
            )

        elif message_type == "meeting_action":
            # Handle meeting actions (start, pause, resume, end)
            action = data.get("data", {}).get("action")
            await self.broadcast_meeting_update(room_id, {
                "user_id": user_id,
                "action": action,
                "data": data.get("data", {}),
            })

        elif message_type == "typing":
            # Indicate that a user is typing
            await self.broadcast_to_room(
                room_id,
                {
                    "type": "typing",
                    "data": {"user_id": user_id, "is_typing": data.get("data", {}).get("is_typing", False)},
                    "timestamp": datetime.utcnow().isoformat(),
                },
                exclude_user_id=user_id,
            )

        elif message_type == "participant_state":
            # A participant's mic/camera state changed — let everyone else know
            # so their UI can show the correct icons.
            await self.broadcast_to_room(
                room_id,
                {
                    "type": "participant_state",
                    "data": {
                        **data.get("data", {}),
                        "user_id": user_id,
                    },
                    "timestamp": datetime.utcnow().isoformat(),
                },
                exclude_user_id=user_id,
            )

        elif message_type == "host_moderate":
            # Host-only: mute/unmute a participant's mic or camera, or remove
            # them from the meeting entirely.
            if self.room_hosts.get(room_id) != user_id:
                await self.send_personal_message(
                    {
                        "type": "error",
                        "data": {"message": "Only the host can moderate participants"},
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    user_id,
                    room_id,
                )
                return

            action = data.get("data", {}).get("action")
            target_user_id = data.get("data", {}).get("target_user_id")
            if not action or not target_user_id or target_user_id not in self.active_connections.get(room_id, {}):
                return

            if action == "remove":
                if room_id not in self.blocked_users:
                    self.blocked_users[room_id] = set()
                self.blocked_users[room_id].add(target_user_id)

                await self.send_personal_message(
                    {
                        "type": "removed",
                        "data": {"reason": "You were removed from the meeting by the host."},
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    target_user_id,
                    room_id,
                )

                target_ws = self.active_connections[room_id][target_user_id]
                await self.disconnect(target_ws, room_id, target_user_id)
                try:
                    await target_ws.close(code=4004, reason="Removed by host")
                except Exception:
                    pass
            else:
                # mute_mic | unmute_mic | mute_camera | unmute_camera
                await self.send_personal_message(
                    {
                        "type": "moderation",
                        "data": {"action": action},
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    target_user_id,
                    room_id,
                )

        else:
            # Unknown message type, send error back
            await self.send_personal_message(
                {
                    "type": "error",
                    "data": {"message": f"Unknown message type: {message_type}"},
                    "timestamp": datetime.utcnow().isoformat(),
                },
                user_id,
                room_id,
            )


# Singleton instance
manager = ConnectionManager()

