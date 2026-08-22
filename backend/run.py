"""
Entry point for running the Google AI Assistant backend server.

Usage:
    python run.py
    python run.py --host 0.0.0.0 --port 8000 --reload
"""

import os
import uvicorn
from app.config.settings import settings


def main():
    """Run the FastAPI application using uvicorn."""
    host = "0.0.0.0"
    # Render (and most hosts) assign the port dynamically via $PORT — bind to
    # that when it's set, and fall back to 8000 for local development.
    port = int(os.environ.get("PORT", 8000))
    reload_enabled = settings.DEBUG

    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"📡 Server: http://{host}:{port}")
    print(f"📖 API Docs: http://{host}:{port}/docs" if settings.DEBUG else "")
    print(f"🔄 Auto-reload: {'ON' if reload_enabled else 'OFF'}")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload_enabled,
        log_level="info" if settings.DEBUG else "warning",
    )


if __name__ == "__main__":
    main()

