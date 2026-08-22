"""
Handles exporting summaries to disk, organized per user.

Layout on disk (under settings.UPLOAD_DIR, default "uploads/"):

    uploads/
      {username}/
        index.json                          <- manifest of this user's meetings
        meetings/
          {meeting_id}/
            summary.txt

index.json shape:
    {
      "username": "gopal",
      "meetings": {
        "<meeting_id>": {
          "meeting_id": "<meeting_id>",
          "meeting_title": "...",
          "summary_file": "meetings/<meeting_id>/summary.txt",
          "updated_at": "2026-08-14T06:00:00+00:00"
        },
        ...
      }
    }
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..config.settings import settings
from ..database.models import Meeting, User

logger = logging.getLogger(__name__)


class FileExportError(Exception):
    """Raised for any failure while writing or reading exported summary files."""


class FileExportService:
    @staticmethod
    def _safe_folder_name(name: str) -> str:
        """Sanitize a username/hostname into a filesystem-safe folder name."""
        name = (name or "unknown-user").strip().lower()
        name = re.sub(r"[^a-z0-9._-]+", "-", name)
        name = name.strip("-") or "unknown-user"
        return name

    @classmethod
    def get_user_folder(cls, username: str) -> Path:
        folder = Path(settings.UPLOAD_DIR) / cls._safe_folder_name(username)
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    @classmethod
    def _index_path(cls, username: str) -> Path:
        return cls.get_user_folder(username) / "index.json"

    @classmethod
    def _load_index(cls, username: str) -> dict:
        index_path = cls._index_path(username)
        if not index_path.exists():
            return {"username": username, "meetings": {}}
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.error(f"Corrupted index.json for user '{username}', resetting it: {e}")
            return {"username": username, "meetings": {}}

    @classmethod
    def _save_index(cls, username: str, index_data: dict) -> None:
        index_path = cls._index_path(username)
        try:
            with open(index_path, "w", encoding="utf-8") as f:
                json.dump(index_data, f, indent=2, ensure_ascii=False)
        except OSError as e:
            raise FileExportError(f"Failed to write index.json for user '{username}': {e}") from e

    @classmethod
    def _update_index_entry(cls, username: str, meeting_id: str, meeting_title: str, **fields) -> None:
        index_data = cls._load_index(username)
        index_data.setdefault("username", username)
        index_data.setdefault("meetings", {})

        entry = index_data["meetings"].get(meeting_id, {
            "meeting_id": meeting_id,
            "meeting_title": meeting_title,
        })
        entry["meeting_title"] = meeting_title
        entry.update(fields)
        entry["updated_at"] = datetime.now(timezone.utc).isoformat()

        index_data["meetings"][meeting_id] = entry
        cls._save_index(username, index_data)

    @classmethod
    def save_summary_file(cls, username: str, meeting_id: str, meeting_title: str, content: str) -> str:
        """Write summary.txt for a meeting and update the user's index. Returns the relative path."""
        try:
            meeting_dir = cls.get_user_folder(username) / "meetings" / meeting_id
            meeting_dir.mkdir(parents=True, exist_ok=True)
            file_path = meeting_dir / "summary.txt"
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content or "")
        except OSError as e:
            raise FileExportError(f"Failed to write summary.txt for meeting {meeting_id}: {e}") from e

        relative_path = f"meetings/{meeting_id}/summary.txt"
        cls._update_index_entry(username, meeting_id, meeting_title, summary_file=relative_path)
        return relative_path

    @classmethod
    def get_meeting_files_content(cls, db: Session, meeting_id: str, requesting_user_id: str) -> dict:
        """
        Lookup summary file for a meeting.
        """
        meeting = db.query(Meeting).filter(
            Meeting.id == meeting_id,
            Meeting.user_id == requesting_user_id,
        ).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        user = db.query(User).filter(User.id == meeting.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Meeting owner not found")

        username = user.username
        index_data = cls._load_index(username)
        entry = index_data.get("meetings", {}).get(meeting_id)

        if not entry:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No exported summary files found for meeting {meeting_id} under "
                    f"uploads/{cls._safe_folder_name(username)}/."
                ),
            )

        result = {
            "meeting_id": meeting_id,
            "username": username,
            "folder": str(cls.get_user_folder(username)),
            "summary": None,
            "summary_file": entry.get("summary_file"),
        }

        user_folder = cls.get_user_folder(username)

        if entry.get("summary_file"):
            summary_path = user_folder / entry["summary_file"]
            try:
                result["summary"] = summary_path.read_text(encoding="utf-8")
            except OSError as e:
                logger.error(f"Failed to read summary file {summary_path}: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Summary file is recorded in the index but couldn't be read from disk: {e}",
                )

        return result
