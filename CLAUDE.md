# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`contabilidad-app` — an accounting/bookkeeping application. The project is in early development; no stack has been committed yet.

## Stack

- **Frontend:** React + Vite (`/frontend`) — react-router-dom, axios
- **Backend:** FastAPI + MongoDB (`/backend`) — motor (async MongoDB), pydantic, python-jose, bcrypt

## Commands

### Frontend
```bash
cd frontend
npm install
npm run dev       # dev server (localhost:5173)
npm run build
npm run lint
```

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in values
uvicorn main:app --reload
```

## Architecture

```
/frontend/src/
  assets/
  components/    # reusable UI components
  pages/         # route-level components
  hooks/         # custom React hooks
  services/      # axios API calls

/backend/
  main.py              # FastAPI app entry point
  app/
    routes/            # APIRouter modules
    models/            # MongoDB document models
    schemas/           # Pydantic request/response schemas
    core/              # config, security (JWT, hashing)
    db/                # Motor client and connection helpers
```

The backend follows a layered pattern: routes → schemas (validation) → models (DB) with shared logic in `core/`. The frontend calls the backend via `services/` using axios; routing is handled by react-router-dom.
