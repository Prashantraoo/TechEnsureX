# TechEnsureX

AI-powered medical insurance platform (Indian market — amounts in ₹). Patients upload
medical/insurance documents for AI analysis, manage insurance plans, file and track
claims, get an AI-generated health report from lab reports, and chat with an AI
insurance assistant. Includes claim settlement tracking with a verifiable audit trail
and an admin dashboard.

## Overview

- Upload a lab report / medical document and get a structured AI analysis: verified
  results, reference ranges, and findings that explicitly need human verification —
  never a fabricated risk score when there isn't enough reliable data.
- Track insurance claims through submission, review, and settlement, with an
  AI-assisted claim summary for reviewers.
- Browse and compare insurance plans, keep a medical history log, and chat with an
  AI assistant grounded in the plan catalog.

## Tech Stack

**Frontend** — `frontend/`
- React 18, Vite 5, TypeScript
- Tailwind CSS, shadcn/ui (Radix primitives), Framer Motion, GSAP
- React Router, TanStack Query, Zod, Recharts

**Backend** — `backend/`
- Express 4, TypeScript, Mongoose 8 (MongoDB)
- JWT auth (bcrypt password hashing), Cloudinary (document storage)
- NVIDIA NIM (Nemotron models, OpenAI-compatible API) for document analysis, claim
  summaries, and the chat assistant, with a deterministic regex-based extraction layer
  for factual data (lab values, medications) so the AI is only relied on for narrative
  and reasoning, never for reporting numbers it might hallucinate

## Project Structure

```
backend/
  src/
    config/        env loading, DB connection
    controllers/    route handlers
    middleware/     auth guard, centralized error handler
    models/         Mongoose schemas
    routes/         Express routers, mounted in server.ts
    services/       AI clients, PDF extraction/rendering, RAG retrieval, uploads
    seed/           local dev database seed script
    scripts/        one-off manual scripts (e.g. NVIDIA API connectivity check)
    __tests__/      vitest test suites

frontend/
  src/
    pages/          route-level views (site pages + dashboard pages)
    components/
      site/          marketing/landing page sections + auth screens
      dashboard/      dashboard shell/layout
      ui/             shadcn primitives actually in use
      shared/         small reusable presentational components
      motion/         scroll/reveal animation wrappers
    lib/             API client, auth helpers, utils
    hooks/           shared React hooks
```

## Installation

Requires Node.js 18+ and a running MongoDB instance.

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

## Environment Variables

Copy each example file and fill in real values — never commit the copies.

**`backend/.env`** (see `backend/.env.example`)

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no | defaults to `5000` |
| `MONGODB_URI` | yes | local or hosted MongoDB connection string |
| `JWT_SECRET` | **yes in production** | server refuses to start in production without a real value |
| `JWT_EXPIRES_IN` | no | defaults to `7d` |
| `FRONTEND_URL` | yes | used for CORS |
| `NVIDIA_API_KEY` | yes | required for document analysis, claim summaries, and chat |
| `NVIDIA_BASE_URL`, `NIM_*_MODEL` | no | sensible defaults provided, override only with model IDs verified against your account |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | yes | required for document uploads |

**`frontend/.env`** (see `frontend/.env.example`)

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | no | defaults to `http://localhost:5000/api` |

## Running Locally

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:8080)
cd frontend
npm run dev
```

Optional: `npm run seed` in `backend/` populates the local database with demo
insurance plans and a couple of demo accounts (see `backend/src/seed/seed.ts` for the
credentials it prints — seed data only, not real accounts).

## Build

```bash
# Backend — type-checks and compiles to backend/dist
cd backend
npm run build
npm start          # runs the compiled build

# Frontend — type-checks, lints, and builds to frontend/dist
cd frontend
npm run typecheck
npm run lint
npm run build
```

## Production

- Serve `frontend/dist` behind a static host/CDN, or via `npm run preview`.
- Run the backend with `npm start` after `npm run build`, pointing `MONGODB_URI` and
  `FRONTEND_URL` at production values.
- Set a strong, unique `JWT_SECRET` — the server will not start in production with an
  unset or default secret.
- All uploaded documents go through Cloudinary; no files are written to local disk.

## Authentication

JWT-based auth: `POST /api/auth/register` and `/api/auth/login` return a signed token,
which the frontend stores and sends as `Authorization: Bearer <token>` on subsequent
requests. Dashboard routes are guarded client-side (redirect to `/sign-in` when no
valid token is present) and server-side (`middleware/` rejects unauthenticated
requests to protected routes).

## Important Notes

- The AI analysis pipeline is deliberately conservative: numeric lab values come from
  deterministic extraction, not the LLM, and any finding the extractor can't verify is
  labeled as needing verification rather than presented as fact. A risk score is only
  ever shown when there's enough reliable underlying data to support one.
- Error responses to the client never include raw internal error messages or stack
  traces; unexpected errors are logged server-side and returned to the client as a
  generic message via the shared error-handling middleware.
