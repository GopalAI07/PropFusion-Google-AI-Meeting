# AI Meeting Hub — Backend

FastAPI backend powering the AI Meeting Hub: authentication, meeting management, real-time transcription over WebSockets, and AI-generated summaries via Google Gemini.

## Tech Stack

- **FastAPI** + **Uvicorn** — async web framework / ASGI server
- **SQLAlchemy** + **PostgreSQL** (`psycopg2-binary`) — ORM and database
- **Pydantic / pydantic-settings** — request validation and config management
- **python-jose** + **bcrypt** — JWT auth and password hashing
- **google-genai** — Gemini AI integration for summarization
- **WebSockets** — real-time meeting/transcript updates
- **Jinja2** — email templating

## Project Structure

```
backend/
├── app/
│   ├── api/            # Route handlers (auth, meeting, transcript, summary, websocket)
│   ├── config/         # Settings (env-driven)
│   ├── database/       # SQLAlchemy models + session setup
│   ├── midlleware/      # Logging, rate limiting, process time, security headers
│   ├── prompts/         # Gemini prompt templates
│   ├── schemas/         # Pydantic request/response schemas
│   ├── services/        # Business logic (auth, meeting, AI, email, export, transcript)
│   ├── utils/            # Shared helpers
│   ├── websocket/        # Connection manager
│   ├── workers/           # Background tasks
│   └── main.py             # FastAPI app factory, middleware, routers
├── uploads/                  # Uploaded/generated files (gitignored, kept via .gitkeep)
├── requirements.txt
├── run.py                     # Entry point
└── .env.example
```

## Setup

1. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Then fill in your own values — at minimum:
   - `DATABASE_URL` — PostgreSQL connection string
   - `SECRET_KEY` — generate with `openssl rand -hex 32`
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - `SMTP_USERNAME` / `SMTP_PASSWORD` — if you want email features working

4. **Run the server**
   ```bash
   python run.py
   ```
   The API will be available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs` (only when `DEBUG=True`).

## API Overview

| Router | Prefix | Purpose |
|---|---|---|
| Auth | `/api/auth` | Register, login, refresh, profile |
| Meeting | `/api/meetings` | Create/join/manage meetings |
| Transcript | `/api/transcripts` | Meeting transcript retrieval |
| Summary | `/api/summary` | AI-generated meeting summaries |
| WebSocket | `/ws` | Real-time meeting/transcript events |

## Notes

- Never commit a real `.env` file — only `.env.example` with placeholder values should be tracked.
- If a real API key or secret was ever committed to this repo's history, rotate/revoke it and rewrite git history (e.g. with `git filter-repo`) before making the repo public.
