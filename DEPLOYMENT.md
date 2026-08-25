# Deployment Checklist

TechEnsureX deploys as **one Vercel project using Vercel Services** — a single
deployment containing both the Vite frontend and the Express backend, routed by
`vercel.json` at the repo root. Both services share one domain, so the frontend talks
to the backend as a same-origin relative path (`/api/...`), not a separate cross-origin
URL. Vercel has native zero-config support for Express (the whole Express app becomes
one Vercel Function on Fluid Compute), so the backend needed no restructuring.

```
Vercel project "TechEnsureX"  (vercel.json → services: frontend, backend)
├── https://<domain>/*        → frontend service (Vite build)
└── https://<domain>/api/*    → backend service (Express, zero-config)
                                        ↓
                    MongoDB Atlas · Cloudinary · NVIDIA NIM
```

`vercel.json` (repo root) defines both services and the two top-level rewrites that
expose them — see the file itself for the exact routing. No other Vercel config file
is required for the first deployment: Fluid Compute's default function duration on the
Hobby plan is 300 seconds, well above the observed 30–90s AI analysis calls.

## Environment variables

Because both services deploy together under one Vercel project, set all of the
following in that **one** project's environment variable settings (not split across
two projects):

- **Frontend build-time:** `VITE_API_URL`
- **Backend runtime:** `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
  `FRONTEND_URL`, `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NIM_CHAT_MODEL`,
  `NIM_REASONING_MODEL`, `NIM_VISION_MODEL`, `NIM_EMBED_MODEL`, `NIM_SAFETY_MODEL`,
  `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

See `backend/.env.example` and `frontend/.env.example` for the full annotated list.

### `VITE_API_URL` — use `/api`, not an absolute URL

Because the frontend and backend now share one Vercel domain, set:

```
VITE_API_URL=/api
```

not `https://<something>.vercel.app/api`. The frontend's API client
(`frontend/src/lib/api.ts`) does `` `${API_URL}${endpoint}` `` — with `API_URL` set to
`/api`, every request becomes a same-origin relative path (e.g. `/api/auth/login`),
which the `vercel.json` rewrite sends straight to the backend service. This needed no
code change: the existing fallback (`http://localhost:5000/api`, used only when
`VITE_API_URL` is unset) already works exactly this way for local dev, where frontend
and backend genuinely run on different ports/origins. `VITE_API_URL` is a **build-time**
value — Vite inlines it into the static bundle, so it must be set before the build
runs, not adjusted afterward.

A same-origin `/api` also means the browser never makes a cross-origin request in
production, so CORS is no longer strictly load-bearing there — the `FRONTEND_URL`
check in `server.ts` only matters if something calls the backend service's URL
directly, or for local dev (frontend on `:8080`, backend on `:5000`, genuinely
cross-origin). Still worth setting correctly as defense in depth; not required for the
main app to function once both services share a domain.

## Backend service

- **Root** (in `vercel.json`): `backend/`
- **Framework:** auto-detected Express (zero-config — Vercel finds the default export
  added to `src/server.ts` / its `app.listen()` call)
- **Install command:** `npm install`
- **Build command:** `npm run build` (type-checks and compiles `src/` → `dist/` via `tsc`)
- **Local dev is unaffected:** `npm run dev` still runs `tsx watch src/server.ts`
  exactly as before; the `export default app` in `server.ts` is additive.
- **Node version:** 20+ (pinned via `"engines"` in `package.json`)
- **Health check:** `GET /api/health` → `{"status":"ok","service":"TechEnsureX Backend",...}`
- **Set `NODE_ENV=production`.** The server hard-fails at startup if `JWT_SECRET` is
  unset or still the placeholder default — intentional, so a misconfigured deploy fails
  loudly instead of silently signing tokens with a known secret.

### One thing to verify after the first deploy, not before

`@napi-rs/canvas` (native binary, used only for the scanned/image-only PDF vision
fallback in `pdf-render.service.ts`) has no official Vercel guidance either way. It
should work — napi-rs ships a Linux x64 prebuild matching Vercel's build environment —
but this is the one piece of the stack that genuinely can't be confirmed without a real
deployment. If a scanned-document upload fails specifically (regular text-PDF uploads
are unaffected — they never touch this code path), this is the first place to look.

## Frontend service

- **Root** (in `vercel.json`): `frontend/`
- **Framework:** `vite` (set explicitly in `vercel.json`)
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Required environment variable:** `VITE_API_URL=/api` (see above)
- No other frontend environment variables exist — confirmed by searching the entire
  `frontend/src` tree for `import.meta.env` usage.

Verified locally this pass: `npm run typecheck` and `npm run build` both pass cleanly,
output lands in `frontend/dist/` as expected.

## Database — MongoDB Atlas

- Create an Atlas cluster, add a database user, and allow network access — Vercel
  Functions egress from a range of IPs, not a fixed one, so this generally means
  allowing `0.0.0.0/0` on the Atlas network-access list (Atlas's own access controls —
  username/password + TLS — are what actually secure the connection).
- Set `MONGODB_URI` in the Vercel project's environment variables to the Atlas
  connection string.
- The local `mongodb://localhost:27017/...` default must **not** be used in production
  — it isn't reachable from Vercel. No code changes are needed to switch; Mongoose only
  reads the URI from `MONGODB_URI`.

## Storage — Cloudinary

- Uploaded documents are already stored through Cloudinary, not the local filesystem —
  `multer` uses in-memory storage and streams the buffer straight to Cloudinary
  (`backend/src/services/upload.service.ts`); only the returned Cloudinary URL is
  persisted in MongoDB. This is already serverless-safe/stateless; no changes needed.
- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- The document-analysis pipeline (text extraction, vision fallback, AI analysis) reads
  the uploaded buffer directly during the request — it doesn't depend on the Cloudinary
  URL being fetched back afterward, so there's no extra round-trip timing risk.

## AI — NVIDIA NIM

- Provider: NVIDIA NIM, accessed via the `openai` SDK pointed at NVIDIA's
  OpenAI-compatible `baseURL` (`backend/src/services/nvidia.ts`).
- Required variables: `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NIM_CHAT_MODEL`,
  `NIM_REASONING_MODEL`, `NIM_VISION_MODEL`, `NIM_EMBED_MODEL`, `NIM_SAFETY_MODEL`.
- `NVIDIA_API_KEY` is read only via `process.env` in backend code — confirmed it never
  appears in any `VITE_`-prefixed variable or frontend file. Keep it that way: never
  rename it to a `VITE_*` variable, which would bundle it into the public client build.
- Document analysis (30–90s+) and chat (streamed, plain chunked HTTP response via
  `res.write()`/`res.end()`) both run comfortably inside the 300s default Fluid Compute
  duration on Hobby — no configuration needed for this to work.

## Authentication

- **JWT:** email/password login issues a JWT (`jsonwebtoken` + `bcryptjs`), stored
  client-side in `localStorage` and sent as `Authorization: Bearer <token>`. No
  cookie/session config is needed.
- **Required production config:** a real `JWT_SECRET` (enforced at startup, see above).
  `FRONTEND_URL` is no longer load-bearing for the main app now that frontend/backend
  share a domain (see the `/api` note above) but is still worth setting for defense in
  depth; it accepts a comma-separated list.
- **Google OAuth — NOT implemented.** The "Continue with Google" button
  (`frontend/src/components/site/auth/SocialLoginButton.tsx`) is presentation only; it
  has no `onClick` handler, and there is no backend OAuth route, no `passport`/OAuth
  library, and no `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` anywhere in the codebase.
  It will not authenticate anyone in production as it stands. To make it real:
  - Register an OAuth app in Google Cloud Console, get a client ID/secret.
  - Add backend routes: an initiation route (redirect to Google's consent screen) and
    a callback route (exchange the code, find-or-create the `User`, issue this app's
    own JWT the same way `/api/auth/login` does today) — a library like
    `passport-google-oauth20` or a manual OAuth2 code-exchange flow.
  - New env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a callback URL var
    (e.g. `GOOGLE_CALLBACK_URL=https://<domain>/api/auth/google/callback`).
  - In Google Cloud Console, the authorized redirect URI must exactly match that
    callback URL for whichever environment is calling it (a separate one for local dev
    vs. production).
  - Wire the frontend button's `onClick` to redirect to the new initiation route.
  This is real feature work, not a deployment step — not implemented as part of this
  pass, per instruction.

## Deployment order

```
1.  Confirm MongoDB Atlas / Cloudinary / NVIDIA credentials are ready
2.  Create one Vercel project from this repo (root = repo root, vercel.json drives
    both services automatically)
3.  Set the project's environment variables:
       VITE_API_URL=/api
       NODE_ENV=production
       MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_URL
       NVIDIA_API_KEY, NVIDIA_BASE_URL, NIM_CHAT_MODEL, NIM_REASONING_MODEL,
         NIM_VISION_MODEL, NIM_EMBED_MODEL, NIM_SAFETY_MODEL
       CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
4.  Deploy
5.  Confirm GET https://<domain>/api/health responds
6.  Confirm the frontend loads at https://<domain>/
7.  Test: register + login, logout
8.  Test: AI chat assistant (streamed response)
9.  Test: upload a medical report → confirm it lands in Cloudinary + MongoDB
10. Test: AI Health Report analysis on that upload
11. Test: dashboard (claims, plans, settlements, billing, notifications, admin)
12. Check the browser network tab for any request still pointing at localhost
```
