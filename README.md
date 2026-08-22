# AI Meeting Hub

An AI-powered meeting hub: create/join meetings, get live transcripts over WebSockets, and receive AI-generated summaries powered by Google Gemini.

## Live

- **App:** https://google-ai-meeting.vercel.app/
- **API:** https://propfusion-google-ai-meeting.onrender.com

## Monorepo Structure

```
AI Meeting Hub/
├── backend/    # FastAPI + PostgreSQL + Gemini AI
├── frontend/   # React + Vite + Tailwind CSS
└── README.md   # you are here
```

- [`backend/README.md`](./backend/README.md) — API setup, env vars, project layout, deployment
- [`frontend/README.md`](./frontend/README.md) — UI setup, env vars, project layout, deployment

## Demo

https://github.com/user-attachments/assets/241c165e-e8cf-4f45-a11a-18051c089917

## Features

- Email/password authentication with JWT access + refresh tokens
- Create and join meetings, with live meeting rooms
- Real-time transcription and updates over WebSockets
- AI-generated meeting summaries via Google Gemini
- Rate limiting, security headers, and structured logging on the API

## Quick Start (local)

You'll need **Python 3.11+**, **Node.js 18+**, and a **PostgreSQL** instance running locally or remotely.

```bash
# 1. Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # fill in DATABASE_URL, SECRET_KEY, GEMINI_API_KEY, etc.
python run.py              # runs on http://localhost:8000

# 2. Frontend (in a new terminal)
cd frontend
npm install
cp .env.example .env      # points the frontend at your local backend
npm run dev                # runs on http://localhost:5173
```

Full setup details, environment variables, and folder-by-folder breakdowns live in each subproject's README linked above.

## Deployment

This project is split across two hosts:

| Layer | Host | Notes |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Builds with `vite build`; needs `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` set in the Vercel dashboard (Project → Settings → Environment Variables) |
| Backend | [Render](https://render.com) | Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; needs `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, `CORS_ORIGINS` (including the Vercel URL), etc. set in Render's dashboard |
| Database | Render PostgreSQL | Backend falls back to a local Postgres (`DATABASE_URL_FALLBACK`) if this is unreachable at startup — see `backend/README.md` |

See each subproject's README for the full list of environment variables each platform needs.

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, Redux Toolkit, Tailwind CSS v4, React Router v7, Socket.io-client |
| Backend | FastAPI, SQLAlchemy, PostgreSQL, python-jose (JWT), Google Gemini (`google-genai`) |
| Realtime | WebSockets |

## Security Notes

- Only `.env.example` files (with placeholder values) are committed. Real `.env`, `.env.production`, etc. are gitignored via `.env*` in `.gitignore` — never commit actual secrets.
- If a real secret was ever committed to this repo's history (even if the push was rejected by GitHub's push protection), rotate/revoke it and rewrite git history before pushing again — see `git log -p` and tools like `git filter-repo`.

## Contributing

1. Fork the repo and create a feature branch.
2. Keep backend and frontend changes in separate, focused commits where possible.
3. Open a PR with a clear description of what changed and why.

## License

Add your preferred license here (e.g. MIT) — none is currently specified.
