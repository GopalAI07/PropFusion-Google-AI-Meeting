# AI Meeting Hub — Backend

FastAPI backend powering the AI Meeting Hub: authentication, meeting management, real-time transcription over WebSockets, and AI-generated summaries via Google Gemini.

**Live API:** https://propfusion-google-ai-meeting.onrender.com

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
│   ├── database/       # SQLAlchemy models + session setup (with local-DB fallback)
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
├── run.py                     # Entry point (local dev)
└── .env.example
```

## Local Setup

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
   - `DATABASE_URL` — PostgreSQL connection string (primary — tried first)
   - `DATABASE_URL_FALLBACK` — a local Postgres URL, used automatically if `DATABASE_URL` can't be reached at startup (e.g. your hosted DB is asleep/expired, or you're offline). Create the database first: `createdb -U postgres googlemeetingai`
   - `SECRET_KEY` — generate with `openssl rand -hex 32`
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - `CORS_ORIGINS` — include both your local frontend (`http://localhost:5173`) and your deployed frontend URL, so the same `.env` works for either
   - `SMTP_USERNAME` / `SMTP_PASSWORD` — if you want email features working

4. **Run the server**
   ```bash
   python run.py
   ```
   The API will be available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs` (only when `DEBUG=True`). Startup logs will tell you whether it connected to the primary or fallback database.

## Deploying (Render)

This backend runs as a Render Web Service. Two things Render needs that aren't automatic:

1. **Start command** — Render doesn't run `run.py`; set the start command directly in the dashboard (Settings → Start Command):
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
   `--host 0.0.0.0` is required so Render's port scanner can detect the service; `--port $PORT` binds to the port Render assigns dynamically. Don't use `--reload` in production — that's for local dev only.

2. **Environment variables** — Render does not read your committed `.env` file (it's gitignored and never pushed). Set these in the dashboard (Settings → Environment):
   - `DATABASE_URL` — your Render Postgres connection string. If the Postgres instance is also on Render, use the **Internal Database URL** shown on its page instead of the external one — faster, and avoids external network hops.
   - `SECRET_KEY`, `GEMINI_API_KEY`, `SMTP_USERNAME`, `SMTP_PASSWORD`
   - `CORS_ORIGINS` — set to your deployed frontend's URL, e.g. `["https://google-ai-meeting.vercel.app"]`
   - `DEBUG` — `false` in production
   - `DATABASE_URL_FALLBACK` can be left unset here; there's no local Postgres to fall back to on Render, it's only useful in your local `.env`.

## API Overview

| Router | Prefix | Purpose |
|---|---|---|
| Auth | `/api/auth` | Register, login, refresh, profile |
| Meeting | `/api/meetings` | Create/join/manage meetings |
| Transcript | `/api/transcripts` | Meeting transcript retrieval |
| Summary | `/api/summary` | AI-generated meeting summaries |
| WebSocket | `/ws` | Real-time meeting/transcript events |

## Notes

- Never commit a real `.env`, `.env.production`, etc. — only `.env.example` with placeholder values should be tracked. `.gitignore` uses `.env*` (not `*.env`) to catch all of these.
- If a real API key or secret was ever committed to this repo's history — even if the push itself was blocked by GitHub's push protection — rotate/revoke it and rewrite git history (e.g. delete `.git` and re-init, or use `git filter-repo`) before pushing again.
