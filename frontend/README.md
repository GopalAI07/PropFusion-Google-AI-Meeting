# AI Meeting Hub — Frontend

React + Vite frontend for the AI Meeting Hub: authentication, meeting creation/joining, live meeting rooms, and AI-powered summaries.

## Tech Stack

- **React 18** + **Vite** — UI and build tooling
- **Redux Toolkit** + **React Redux** — global state
- **React Router v7** — routing
- **Tailwind CSS v4** — styling
- **Axios** — HTTP client
- **Socket.io-client** — real-time meeting/transcript updates
- **Recharts** — dashboard charts
- **React Hot Toast** — notifications
- **Lucide React** — icons

## Project Structure

```
frontend/
├── src/
│   ├── api/            # Axios instance / API config
│   ├── components/     # Reusable UI components (Navbar, Sidebar, modals, forms...)
│   ├── context/         # AuthContext (auth state/session)
│   ├── hooks/            # useMeetings, useMeetingRoom
│   ├── pages/             # Route-level pages (Dashboard, Login, Register, Meetings...)
│   ├── redux/               # Store + slices
│   ├── routes/                # Route definitions
│   ├── styles/                 # Global styles (Tailwind entry)
│   ├── utils/                   # Shared helpers
│   ├── websocket/                # WebSocket client setup
│   ├── App.jsx
│   └── main.jsx
├── public/
├── index.html
├── vite.config.js
└── package.json
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables** (optional — defaults to `/api` if unset)
   ```bash
   cp .env.example .env
   ```
   Update it to point at your running backend, e.g. `VITE_API_BASE_URL=http://localhost:8000/api`.

3. **Run the dev server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

4. **Build for production**
   ```bash
   npm run build
   ```
   Output is written to `dist/` (gitignored — this is a build artifact, not source).

5. **Preview a production build**
   ```bash
   npm run preview
   ```

## Notes

- Make sure the backend (see `../backend/README.md`) is running before starting the frontend, since auth, meetings, and AI summaries all depend on it.
- `node_modules/` and `dist/` are intentionally gitignored — never commit them.
