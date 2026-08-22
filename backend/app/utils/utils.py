import uuid
import re
from datetime import datetime
from typing import Optional, List


def generate_uuid() -> str:
    """Generate a unique UUID string."""
    return str(uuid.uuid4())


def format_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format a datetime object to string."""
    return dt.strftime(format_str) if dt else ""


def parse_datetime(date_str: str, format_str: str = "%Y-%m-%d %H:%M:%S") -> Optional[datetime]:
    """Parse a datetime string to datetime object."""
    try:
        return datetime.strptime(date_str, format_str)
    except (ValueError, TypeError):
        return None


def truncate_text(text: str, max_length: int = 200, suffix: str = "...") -> str:
    """Truncate text to specified length."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)].strip() + suffix


def validate_email(email: str) -> bool:
    """Basic email validation."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def sanitize_filename(filename: str) -> str:
    """Sanitize filename by removing special characters."""
    filename = filename.replace("\\", "_").replace("/", "_")
    filename = re.sub(r'[^\w\s.-]', '_', filename)
    filename = re.sub(r'_+', '_', filename)
    return filename.strip('._')


def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks for AI processing."""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            break_point = text.rfind('. ', start + chunk_size - overlap, end + overlap)
            if break_point > start:
                end = break_point + 1
        chunks.append(text[start:end].strip())
        start = end - overlap if end < len(text) else len(text)

    return chunks


def calculate_reading_time(text: str, words_per_minute: int = 200) -> int:
    """Calculate approximate reading time in minutes."""
    word_count = len(text.split())
    minutes = max(1, round(word_count / words_per_minute))
    return minutes


def create_slug(text: str) -> str:
    """Create a URL-friendly slug from text."""
    slug = text.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

