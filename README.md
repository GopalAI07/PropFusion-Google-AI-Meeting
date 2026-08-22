# AI Meeting Hub

An AI-powered meeting hub: create/join meetings, get live transcripts over WebSockets, and receive AI-generated summaries powered by Google Gemini.

## Monorepo Structure

```
AI Meeting Hub/
├── backend/    # FastAPI + PostgreSQL + Gemini AI
├── frontend/   # React + Vite + Tailwind CSS
└── README.md   # you are here
```

- [`backend/README.md`](./backend/README.md) — API setup, env vars, project layout
- [`frontend/README.md`](./frontend/README.md) — UI setup, env vars, project layout

## Demo

https://github.com/user-attachments/assets/241c165e-e8cf-4f45-a11a-18051c089917

## Features

- Email/password authentication with JWT access + refresh tokens
- Create and join meetings, with live meeting rooms
- Real-time transcription and updates over WebSockets
- AI-generated meeting summaries via Google Gemini
- Rate limiting, security headers, and structured logging on the API

## Quick Start

You'll need **Python 3.11+**, **Node.js 18+**, and a **PostgreSQL** instance running locally or remotely.

```bash
# 1. Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill in DATABASE_URL, SECRET_KEY, GEMINI_API_KEY, etc.
python run.py              # runs on http://localhost:8000

# 2. Frontend (in a new terminal)
cd frontend
npm install
cp .env.example .env      # optional, defaults to /api
npm run dev                # runs on http://localhost:5173
```

Full setup details, environment variables, and folder-by-folder breakdowns live in each subproject's README linked above.

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, Redux Toolkit, Tailwind CSS v4, React Router v7, Socket.io-client |
| Backend | FastAPI, SQLAlchemy, PostgreSQL, python-jose (JWT), Google Gemini (`google-genai`) |
| Realtime | WebSockets |

## Security Notes

- Only `.env.example` files (with placeholder values) are committed. Real `.env` files are gitignored — never commit actual secrets.
- If you're publishing this repo publicly, rotate any API keys/secrets that were ever present in the project before pushing, and double-check `git log -p` / use a tool like `git filter-repo` or `truffleHog` to make sure nothing sensitive is in your git history.

## Contributing

1. Fork the repo and create a feature branch.
2. Keep backend and frontend changes in separate, focused commits where possible.
3. Open a PR with a clear description of what changed and why.

## License

Add your preferred license here (e.g. MIT) — none is currently specified.
