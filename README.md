# Proposal Builder Monorepo

This repository now ships with a Next.js frontend and a FastAPI backend. The previous single-page React implementation has been migrated into the `frontend` package while all server responsibilities live under `backend`.

## Project layout

```
frontend/       # Next.js 14 + Tailwind UI
backend/        # FastAPI application exposes /api endpoints
guidelines/     # Existing documentation and assets
```

## Getting started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

By default the development server runs on `http://localhost:3000`. Configure `NEXT_PUBLIC_API_BASE_URL` in a `.env.local` file if the API is not reachable at `http://127.0.0.1:8000/api`.

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The FastAPI server listens on `http://127.0.0.1:8000`. CORS is pre-configured for the local Next.js dev server.

## Frontend ↔ Backend integration points

- Draft uploads now call `POST /api/proposals/analyze` and render the response inside the Draft Analysis page.
- Save/Export actions in the builder invoke `POST /api/proposals`, which currently returns a generated identifier that you can replace with database persistence.
- Shared API helpers live in `frontend/lib/api.ts`; extend this module as new endpoints are introduced.

## Next steps

- Replace the placeholder business logic inside `backend/app/api/routes/proposals.py` with your AI/RAG pipeline and storage layer.
- Persist uploaded files in object storage (e.g., S3) and surface asynchronous job progress through WebSockets or polling as needed.
- Harden error handling and add unit/integration tests for both apps once the data model stabilises.
