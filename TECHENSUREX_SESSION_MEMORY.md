# TechEnsureX — Session Memory / Handoff

Last verified against the repository: 2026-08-17 (paths, model IDs, test results, and build status below were re-checked against the actual code at that time, not recalled from memory alone).

---

## 1. PROJECT OVERVIEW

**TechEnsureX** is an AI-powered medical insurance platform (Indian market — amounts in ₹). It lets patients upload medical/insurance documents for AI analysis, manage insurance plans, file and track claims, get an AI-generated health report from uploaded lab reports, and chat with an AI insurance assistant. It also has a lightweight blockchain-audit-trail narrative for claim settlement tracking and an admin dashboard.

**Structure:**
- `frontend/` — React 18 + Vite 5 + TypeScript, Tailwind CSS 3, shadcn/ui (Radix primitives), Framer Motion, GSAP, Recharts, next-themes, class-variance-authority, Zod. Dev server: `npm run dev` → `http://localhost:8080`.
- `backend/` — Express 4 + TypeScript + Mongoose 8 (MongoDB). Dev server: `npm run dev` (tsx watch) → `http://localhost:5000`. Reads `backend/.env` (MongoDB URI: `mongodb://localhost:27017/healthguard`).
- **AI**: NVIDIA NIM (OpenAI-compatible API, `openai` SDK v7) — all NVIDIA-hosted Nemotron models, hybrid-reasoning models with a separate hidden `reasoning_content` field.

Both dev servers were running and verified live at the end of this session (PIDs on ports 5000/8080).

---

## 2. CURRENT PROJECT STATE

**Working and verified this session:**
- Backend: builds, unit tests pass, live end-to-end AI behavior verified against the real NVIDIA API multiple times across sessions.
- Frontend: full UI redesign implemented, builds clean, typechecks clean, verified live in-browser (see §6, §16).
- AI Chat Assistant: verified live in-browser this session — sent a real message, got a correctly grounded streamed response.
- Dashboard pages (Dashboard Home, Claims, Insurance Plans, Medical History, Health Report vitals/risk sections): verified live in-browser, render correctly with real/empty API data.

**Implemented across this session's full history (see §7 for bug fixes, §12 for architecture decisions):**
- Multer file-size error handling, upload controller fixes, document-hash caching.
- Full hybrid deterministic-extraction + tiered fast/reasoning AI architecture for document analysis.
- Scanned/image PDF vision-analysis latency fix.
- Empty-response crash bug fix (graceful fallback).
- Deterministic lab-row extractor false-positive fixes.
- Complete frontend UI redesign (visual only, functionality preserved).

**Incomplete / not done this session:**
- The full pre-optimization/post-optimization latency benchmark table (produced live during the optimization investigation) was reported in chat but is **not persisted anywhere in the repo** — only qualitative, order-of-magnitude numbers survive in code comments (see §5). If exact benchmark numbers are needed again, they must be re-measured.
- No git commit has been made for the UI redesign or any backend work across these sessions — `git status` still shows everything as uncommitted working-tree changes (see `git status` before committing anything).

**Completed in the following session (2026-08-17, same day, second session):** the AI Health Report page (§3/§9's "no hardcoded values" requirement) was fully implemented — see the new §3 below and §7.5. This closed out what used to be listed here as the next task.

---

## 3. AI HEALTH REPORT

**Route:** `/dashboard/health-report` → `frontend/src/pages/dashboard/HealthReport.tsx`

**Status as of 2026-08-17 (second session): fully dynamic, no hardcoded/demo values anywhere on this page.** The old design (documented below in this section as of the first 2026-08-17 session) sourced vitals/wellness-score/risk-assessment/AI-recommendation from a separate, mostly-static `HealthReport` Mongo doc seeded once with defaults (18/32/84) and never updated by the upload flow — that entire data source was removed from this page. See §7.5 for the full before/after and verification evidence.

**Current UI sections (top to bottom), all driven by `analysis: DocumentAnalysisResult | null`:**
1. `PageHeader` with an "Upload new report" button (unchanged — opens file picker, accepts `.pdf,.jpg,.jpeg,.png`).
2. **Vitals snapshot** card — 3 vitals only (Heart rate, Blood pressure, Glucose; "Stress index" was removed, see §7.5). Each is matched by regex against `analysis.labResults[].test` (`/heart\s*rate|pulse/i`, `/blood\s*pressure|\bbp\b/i`, `/glucose|blood\s*sugar/i`). Shows the real matched value+unit+status badge, or "Not available in report" if this particular report has no matching row. Whole card shows an `EmptyState` prompt if `analysis` is null.
3. **AI risk score** gradient card (renamed from "Overall wellness score") — `analysis.riskScore.score`/100 + `analysis.riskScore.reasoning` verbatim. Empty-state prompt if `analysis` is null. The old "View full report" button / separate `aiApi.healthSummary` call / "AI Summary" card were all removed (they were built on the fake numbers and fully redundant with this real data).
4. **Uploaded report analysis** card (conditionally rendered — only when `uploadStage !== "idle" || analysis || analysisError`) — unchanged from before: documentSummary, patientDetails grid, lab results table (raw `<table>`, still not the shared `<Table>` component — untouched, out of scope), diagnoses/medications grid, disclaimer. (`keyFindings` and the old in-card riskScore box were removed from *this* card since they're now covered by sections 2/3/5 — no duplication.)
5. **"Key findings & risk assessment"** card (renamed from "Risk assessment") — real `analysis.keyFindings` list (test/value/status), with a positive empty state ("No abnormal findings were detected in this report") when the array is empty, followed by an **AI recommendations** box rendering the real `analysis.recommendations` array. The old 4 fixed disease-category percentage bars (Cardiovascular/Diabetes/Hypertension/Respiratory) are gone — the backend has no such per-category field, only one overall `riskScore`.

**Persistence:** on mount, the page calls `uploadApi.getScans()` and hydrates `analysis`/`analysisFileName` from the most recent scan (`scans[0]`, backend already sorts by `createdAt: -1`) — so refreshing the page no longer blanks real data back to nothing. Uploading a new report fully replaces `analysis` (`setAnalysis(newResult)`), so every section flips atomically to the new report with zero stale values from the previous one — verified live with two different real fixture PDFs in a row (§7.5).

**Data flow (upload → render), unchanged:**
1. User selects a file → `handleUpload` → `uploadApi.scanDocument(file)` → `POST /api/upload/document`.
2. Backend (`upload.controller.ts`): checks content-hash cache → extracts PDF text (`pdf.service.ts`) → if no text layer, falls back to `analyzeScannedDocument` (vision) → else `analyzeDocument` (text path, `document-analysis.service.ts`) → saves `DocumentScan` (Mongo) → returns `{ scan: { analysis: DocumentAnalysisResult, aiAnalysis: string, ... } }`.
3. Frontend sets `analysis` state from `data.scan.analysis` and renders it directly — now the *only* data source for the whole page (no more second `report`/`healthApi.getReport()` source).

**Known limitations (unchanged, out of scope for the §7.5 work):**
- The lab-results table inside the "Uploaded report analysis" card still uses raw `<table>` markup, not the shared `Table` component.
- The vision/raw-text-fallback paths let the model author `keyFindings` itself (not capped/filtered to abnormal-only the way the mechanical `computeKeyFindings` does for the fast/reasoning paths) — observed live on the `Sample-Smart-Report-Clinics.pdf` fixture, which showed normal-status entries mixed into `keyFindings`. This is genuine, real backend output (not fabricated by the frontend), just an inconsistency in what different backend paths choose to put in that field — a backend curation difference, not touched this session per the "don't disturb vision/raw-text-fallback processing" constraint.
- `healthApi.getReport()` / `aiApi.healthSummary` / the `HealthReport` Mongo model are all still present in the codebase, untouched — `DashboardHome.tsx` still uses `healthApi.getReport()` for its own separate "wellness score 84/100" AI-insight line, which is out of scope for the Health Report page work and was left exactly as-is.

---

## 4. BACKEND AI PIPELINE

**Architecture (current, verified from `backend/src/services/document-analysis.service.ts`):**

```
PDF text → deterministic extraction (regex, no LLM) → compact facts JSON
         → MODELS.chat writes summary/risk/recommendations ONLY (fast path)
         → merge facts + narrative → Zod validate → response
```

- **Deterministic extraction** (`deterministic-extraction.service.ts`): regex-based, no LLM call. Extracts `patientDetails`, `labResults` (colon-style and column-style table parsing), `medications`, `diagnoses`, `additionalNotes`. Computes lab `status` (normal/high/low/abnormal) purely arithmetically from disclosed reference ranges — never inferred by a model. Includes false-positive guards added this session: `NON_LAB_LABELS` set (phone/fax/email/etc. rejected as lab rows), numeric-first-token rejection, punctuation-only-name rejection, prose-fragment rejection (`the/a/an/...` stopword prefix using `\s` not `\b` boundary — verified not to reject "A/G Ratio"), `PAGE_MARKER` line filtering, and a `PLAUSIBLE_RANGE` check rejecting reference ranges with no unit and no plausible range syntax.

- **Fast path** (default, most common): `MODELS.chat` (`nvidia/nemotron-3-nano-30b-a3b`) is given ONLY the compact extracted-facts JSON (never the raw PDF text) and writes just `documentSummary`, `riskScore`, `recommendations`, `disclaimer` — a narrow schema derived via `DocumentAnalysisSchema.pick(...)` so it can never drift from the full schema. Called with `disableThinking: true` (see §12) and `maxTokens: 800`, `softTimeoutMs: 15_000`, `hardTimeoutMs: 25_000`.

- **Reasoning path** (conditional escalation): triggered by `shouldEscalateFromFacts()` — a pure, deterministic (non-LLM) check for conflicting lab values across duplicate test names, or ≥5 abnormal findings (`ABNORMAL_COUNT_THRESHOLD = 5`). Also triggered if the fast narrative fails validation, or if the fast narrative's own text flags ambiguity (`AMBIGUITY_PATTERN` — `conflicting|discrepan|contradictory|inconsistent`). Uses `MODELS.reasoning` (`nvidia/nemotron-3-ultra-550b-a55b`), still only given the same compact facts JSON, never raw text. `maxTokens: 2048`, `softTimeoutMs: 45_000`, `hardTimeoutMs: 80_000`.

- **Raw-text fallback** (rarest): only when deterministic extraction finds literally nothing (`labResults.length === 0 && medications.length === 0`) in a non-trivial report (`extractedText.length > 200`) — i.e. the report's layout doesn't match any pattern the regex extractor handles. This is the old monolithic behavior kept as a safety net: `MODELS.reasoning` gets the full raw extracted text and must produce the entire `DocumentAnalysisResult` schema itself. `maxTokens: 4096`, `softTimeoutMs: 100_000`, `hardTimeoutMs: 170_000`.

- **Vision/scanned-PDF path** (`vision-analysis.service.ts`, only used when `pdf.service.ts` finds no extractable text layer at all): renders PDF pages to PNG images (`pdf-render.service.ts`) and sends them to `MODELS.vision` (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`) via `visionCompletion()`, with `disableThinking: true`. Reuses the exact same `DocumentAnalysisSchema`/`tryParseAndValidate`/repair logic as the text paths — output shape is identical regardless of which path produced it. `maxTokens: 3072`, `timeoutMs: 150_000` primary / `120_000` repair.

- **Fallback/degradation behavior:** Every stage has a graceful degrade-not-crash path. The critical fix this session (`runReasoningNarrativeWithFallback`) wraps `runReasoningNarrative` in try/catch — if it throws for ANY reason (empty response, timeout, unrepairable malformed JSON), the code falls through to `minimalFallbackNarrative(facts)`: a 100%-grounded, no-AI-needed synthetic narrative built purely from already-extracted facts (never fabricated). This guarantees the endpoint never surfaces a raw crash to the user — worst case is a plain, honest "AI-generated narrative could not be produced for this report" summary with the real extracted lab data still shown.

- **Empty-response handling:** `chatCompletionStream()` in `nvidia.ts` throws `AiServiceError("empty_response")` if a stream produces zero content. `runReasoningNarrative`'s retry list explicitly includes `"empty_response"` (via `withBoundedRetry`) so one transient empty response gets a second attempt before falling back.

- **Current model IDs** (from `backend/.env.example`, i.e. the defaults `MODELS` in `nvidia.ts` falls back to):
  - `NIM_CHAT_MODEL=nvidia/nemotron-3-nano-30b-a3b` (fast narrative, ordinary chat)
  - `NIM_REASONING_MODEL=nvidia/nemotron-3-ultra-550b-a55b` (escalation/raw-text-fallback path)
  - `NIM_VISION_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` (scanned PDFs)
  - `NIM_EMBED_MODEL=nvidia/nemotron-3-embed-1b` (RAG)
  - `NIM_SAFETY_MODEL=nvidia/nemotron-3.5-content-safety` (defined, NOT used as a blocking gate — `checkSafety()` fails open by design)

- **Important model configuration:** `chat_template_kwargs: { thinking: false }` is the experimentally-verified request-level parameter (top-level, NOT nested in `extra_body`/`nvext`) that reliably suppresses hidden `reasoning_content` for these specific Nemotron models on these specific tasks. It is applied via the `disableThinking` option, opt-in per call site — currently set `true` on: the fast narrative call, both vision-analysis calls (primary + repair). It is deliberately NOT applied to the reasoning-path or raw-text-fallback calls (untouched, per explicit user instruction in that task).

---

## 5. PERFORMANCE

**Verified from code comments (i.e. real measurements the previous session recorded directly in the source, not recalled from chat):**

| Call | Reasoning ON (baseline) | Reasoning OFF (`disableThinking: true`) |
|---|---|---|
| Fast narrative (`MODELS.chat`, compact facts) | ~11-12s | ~1-3s (repeated live trials) |
| Vision analysis, 2-page scanned PDF (`MODELS.vision`) | 71-141s | 6-14s |
| Vision analysis, multi-page image payload (~157KB PNG/page) | "well over 90s" | 6-14s |
| Plain fast chat completion (`MODELS.chat`, ordinary chat, no reasoning toggle needed) | 1.5-2.5s end-to-end | n/a |
| Old monolithic document-analysis (pre-deterministic-extraction architecture) | 40-90s of hidden reasoning tokens just to transcribe a lab table | n/a (architecture replaced) |

**Important caveat:** the full structured benchmark table (Model / TTFT / Total latency / Output tokens / Validation / Accuracy / Hallucination-check, across normal/complex/scanned PDF fixtures) that was produced during the live model-investigation phase of this session was reported in the chat transcript but **is not saved anywhere in the repository**. The numbers above are the only ones that survive as verifiable, in-code documentation. If precise current-state latency numbers are needed for a new comparison, they should be re-measured live (see `RUN_LIVE_AI_TESTS=1` in §6) rather than assumed from this table.

No latency benchmarking was performed as part of this session's UI redesign work (out of scope — UI-only task, no AI pipeline changes).

---

## 6. TESTING

**Backend — verified this session (2026-08-17):**
- `npx tsc --noEmit` (backend): **2 pre-existing errors**, both in `src/controllers/auth.controller.ts` (lines 26 and 61 — `ObjectId` → `string` conversion). Confirmed via `git log`/`git diff` that this file has **zero changes since the initial commit** — these errors predate all work described in this memory file and are not a regression from anything done this session.
- `npx vitest run`: **33 passed, 8 skipped** (6 test files passed, 1 file skipped in full). The skipped file is `src/__tests__/live-ai.e2e.test.ts` — it only runs when `RUN_LIVE_AI_TESTS=1` is set (hits the real NVIDIA API + a seeded local MongoDB `InsurancePlan` collection), so it's opt-in by design, not a failure.
- Other passing unit test files: `json-repair.test.ts`, `pdf.service.test.ts`, `nvidia-errors.test.ts`, `pdf-render.service.test.ts`, `escalation.test.ts`, `deterministic-extraction.service.test.ts`.

**Frontend — verified this session (2026-08-17), after the full UI redesign:**
- `npm run build` (Vite): **succeeded**, no errors. One pre-existing warning (not new): main JS chunk is 1.23MB — over Vite's 500KB chunk-size-warning threshold; this is a bundle-size advisory, not an error, and was not addressed (out of scope for a UI-only task).
- `npx tsc --noEmit -p tsconfig.app.json`: **clean, zero errors.**

**Live browser E2E — verified this session via `mcp__claude-in-chrome__*` tools against the real running dev servers (not curl, not unit tests):**
- Landing page (`/`) — hero, ambient gradients, features bento grid, "How it works" section all render correctly with the redesigned styling.
- `/dashboard` (Dashboard Home) — renders correctly, real API calls resolve (claims/health-report endpoints), sidebar nav + active-pill animation intact.
- `/dashboard/plans` (Insurance Plans) — table renders with real backend plan data (no "Recommended" featured panel shown in this instance because none of the returned plans currently has that badge set — this is a data characteristic, not a UI bug).
- `/dashboard/claims` — MetricCard filter row + empty-state rendering verified correctly (account had 0 claims at test time).
- `/dashboard/history` — empty-state rendering verified.
- `/dashboard/assistant` (AI Chat Assistant) — **sent a real message, received a real streamed AI response** ("Does my plan cover maternity?" → grounded, correct answer referencing the user's actual HDFC Ergo plan) — confirms the AI/RAG chat pipeline is fully live and unaffected by the UI redesign.
- `/dashboard/health-report` — vitals snapshot, wellness-score card, risk-assessment progress bars all render correctly with the new styling.
- Console check (`read_console_messages`, `onlyErrors: true`) after a fresh page load: **no console errors.**

**Not tested this session:**
- No real PDF was uploaded through the Health Report UI this session (this session was UI-redesign-only; the last real-PDF-upload browser test, including the `Sample-Smart-Report-Clinics.pdf` reproduction fixture, was done in the *prior* backend-bug-fix session, not this one). **This is the main gap the next session should close before considering the app fully verified post-redesign** — see §16.
- No regression check that the redesigned `HealthReport.tsx` analysis-rendering block (lab table, patient-details grid, risk-score box, etc.) still displays correctly with a real non-empty `analysis` payload — it was only visually verified in its default/empty (`analysis == null`) state this session.

---

## 7. BUGS FIXED (this multi-session history)

### 7.1 Empty-response crash on document analysis
- **Symptom:** Uploading `Sample-Smart-Report-Clinics.pdf` (a real 12-page Apollo report) showed "Couldn't analyze this report / The AI service returned an empty response."
- **Root cause:** `runReasoningNarrativeWithFallback()` in `document-analysis.service.ts` called `runReasoningNarrative()` with no try/catch. A large facts payload (many `labResults` from a long report) pushed the reasoning model's hidden chain-of-thought to consume its entire token budget, leaving nothing for the actual answer — `chatCompletionStream` then threw `AiServiceError("empty_response")` instead of returning empty-but-valid content, and that throw propagated uncaught to the client.
- **Files changed:** `backend/src/services/document-analysis.service.ts`.
- **Solution:** Wrapped the call in try/catch; on any failure, falls through to `minimalFallbackNarrative(facts)` — a 100%-grounded synthetic narrative built only from already-extracted facts. Also added `"empty_response"` to `runReasoningNarrative`'s bounded-retry codes.
- **Verification:** Reproduced directly against the real problem PDF (multiple runs, including one that hit the exact original failure condition and gracefully degraded instead of crashing), both via direct function calls and the real HTTP endpoint on a freshly restarted backend.

### 7.2 Deterministic lab-extractor false positives
- **Symptom:** Rows like "Phone No: 1860 500 7788", "Risk of Heart Disease 4 7", "Prediabetes 2.5/100", bare numeric-as-name rows, punctuation-only names, and prose fragments ("the next 3 months") were being extracted as fake lab results.
- **Root cause:** The regex row-parser (`parseLabLine`/`parseValueUnitRefStatus` in `deterministic-extraction.service.ts`) had no guards against non-lab colon/table lines that happen to match the same "label: number" or "label  number  number" shape.
- **Files changed:** `backend/src/services/deterministic-extraction.service.ts`.
- **Solution:** Added `NON_LAB_LABELS` set (phone/fax/email/address/score/etc.), numeric-first-token rejection in the table-style branch, punctuation-only-name rejection (`!/[A-Za-z]/.test(namePart)`), prose-fragment stopword rejection (using `\s` not `\b` as the boundary — verified not to break "A/G Ratio"), `PAGE_MARKER` line filtering (`-- N of M --`), and a `PLAUSIBLE_RANGE` check requiring a unit OR plausible range syntax before accepting a reference range.
- **Verification:** Each fix traced to actual raw-text evidence from the real reproduction PDF; confirmed no regression against the 33 existing unit tests or the 3 live-benchmark fixtures (normal/complex/reproduction PDFs).

### 7.3 Grounding-prompt age hallucination
- **Symptom:** With `disableThinking: true` newly applied, the fast-narrative model sometimes invented a specific patient age ("35-year-old") even when `patientDetails.age` was `"unknown"` (~50-60% rate in small samples).
- **Root cause:** Pre-existing prompt gap — baseline (thinking-ON) also hallucinated 1/3 of the time; not something `disableThinking` caused, just newly noticed during that investigation.
- **Files changed:** `backend/src/services/document-analysis.service.ts` (`NARRATIVE_GROUNDING_RULES`, "UNKNOWN FIELDS" section).
- **Solution:** Added explicit "if a patientDetails field is `unknown`, you MUST NOT state, infer, guess, or imply a value for it" instruction, covering age/gender/diagnosis/medication/lab value/date/provider specifically.
- **Verification:** 0/6 hallucinations after the fix, vs. baseline failures before.

### 7.4 Scanned-PDF (vision) latency
- **Symptom:** Scanned/image-only PDF analysis was measured at 71-141s for a 2-page report.
- **Root cause:** `MODELS.vision` (`...-omni-30b-a3b-reasoning`) is a hybrid-reasoning model burning 65-75% of completion tokens on hidden `reasoning_content` before producing any real answer.
- **Files changed:** `backend/src/services/nvidia.ts` (`VisionCompletionOptions.disableThinking`), `backend/src/services/vision-analysis.service.ts` (both the primary and repair `visionCompletion` calls).
- **Solution:** Applied the same experimentally-verified `chat_template_kwargs: { thinking: false }` lever used for the fast narrative call.
- **Verification:** `reasoning_content` measured 0 across repeated trials; latency dropped to 6-14s with identical extracted values; tested via direct function calls, real HTTP endpoint, and (separately, in an earlier session) the actual browser upload UI with both a normal scanned fixture and the original reproduction PDF.

### 7.5 AI Health Report — removed all hardcoded/demo values (2026-08-17, second session)
- **Symptom:** every section of `/dashboard/health-report` except the "Uploaded report analysis" card (vitals snapshot, "wellness score" card, 4-category risk-assessment bars, AI recommendation box) was driven by a separate `HealthReport` Mongo doc seeded once with hardcoded defaults (`cardiovascularRisk: 18, diabetesRisk: 32, wellnessScore: 84`) and arithmetic formulas derived from those constants — completely disconnected from any uploaded document. The "AI recommendation" box was 3 hardcoded prose strings selected by a threshold check, including a fabricated product claim ("we've matched 3 diabetes-coverage add-ons for your profile").
- **Root cause:** the page was built against two independent data sources (`healthApi.getReport()` for the numeric widgets, `analysis`/`uploadApi.scanDocument()` for the real per-document card) and never reconciled — flagged as the known gap in §3/§9 by the first 2026-08-17 session, left for explicit user confirmation before touching.
- **Investigation before implementing:** traced the full response shape of `POST /api/upload/document` (`DocumentAnalysisResult` — see §4), confirmed the backend has no per-category (cardiovascular/diabetes/hypertension/respiratory) risk field and no "vitals"/"wellness score" field at all — only one overall `riskScore.score`/`.reasoning`. Presented this mapping (UI section → API field → verdict) to the user along with 4 explicit product-direction questions before writing any code; user picked the recommended option on all 4 (see below).
- **Files changed:** `frontend/src/pages/dashboard/HealthReport.tsx` only — no backend changes (the existing `DocumentAnalysisResult` schema already had everything needed). `healthApi`/`aiApi.healthSummary`/`HealthReport` model left untouched since `DashboardHome.tsx` still depends on `healthApi.getReport()` for an unrelated widget.
- **Decisions confirmed with the user (all "recommended" options):**
  1. Top score card relabeled "Overall wellness score" → **"AI risk score"**, populated from `analysis.riskScore` (a wellness score doesn't exist anywhere in the backend; inventing one by inverting risk was explicitly ruled out per the user's "don't silently create a new medically meaningful score" instruction).
  2. 4 fixed disease-category bars → real **`analysis.keyFindings`** list, with a positive empty state when nothing abnormal was found.
  3. Vitals snapshot kept to **3 vitals** (heart rate/BP/glucose), matched by regex against `labResults` per-report; **"stress index" dropped entirely** (no real source exists for it in any medical report).
  4. Added **persistence-on-load**: `uploadApi.getScans()` hydrates the most recent scan on mount so a page refresh no longer reverts to "nothing."
  - (Not asked as a formal question, decided and stated in the plan: removed the "View full report" button / separate `aiApi.healthSummary` call / "AI Summary" card, since they were built on the fake numbers and fully redundant with the real analysis card.)
- **Verification:** `tsc --noEmit` clean (frontend + backend, same 2 pre-existing unrelated `auth.controller.ts` errors), `npm run build` clean (same pre-existing 1.23MB bundle-size warning, no new errors), backend `vitest run` unchanged (33 passed/8 skipped). Live browser E2E via `mcp__claude-in-chrome__*`: logged in as the seeded `test@hospital.com` user; confirmed persistence-on-load pulled the true most-recent scan (`scans[0]` from `GET /api/upload/scans`, verified via direct fetch — timestamps confirmed correct sort order); uploaded `backend/src/__tests__/fixtures/fictional-health-report.pdf` (Report A, text path) — every section populated with real values (128/82 mmHg BP, 74 bpm HR, 96 mg/dL glucose, risk score 45/100 with report-specific reasoning); then uploaded `.../fixtures/scanned-health-report.pdf` (Report B, vision path) — confirmed **complete replacement**: risk score changed to 65/100 with entirely different reasoning text, vitals updated, patient age changed from "unknown" to a real value, zero stale values from Report A anywhere, and during the upload's in-flight `analyzing` state every section correctly showed its empty state rather than stale Report A data. A third, unrelated concurrent upload of the historic `Sample-Smart-Report-Clinics.pdf` reproduction fixture (§7.1) landed mid-test from outside this session — incidentally reconfirmed both the persistence/sort logic (it correctly surfaced as the new most-recent) **and** that the §7.1 empty-response fallback (`minimalFallbackNarrative`) still renders correctly end-to-end through the new UI (risk score 0/100, "Not enough information to assess risk," the exact fallback recommendation text, real extracted lab values still shown despite the AI narrative having failed). No console errors on any page load. Regression-checked Dashboard Home, Claims, and AI Chat Assistant (sent a real message, got a real grounded streamed response referencing the user's actual HDFC Ergo plan) — all unaffected.

---

## 8. CURRENT UI/UX DIRECTION

The user requested a redesign inspired by a **Salesforce Financial Services "AI insurance claims" marketing page** screenshot — explicitly NOT to copy its branding/logo/text/illustrations, but to match its level of polish with TechEnsureX's own identity. Direction:
- Premium **enterprise SaaS** look — clean, spacious, large typography, strong visual hierarchy.
- **Light theme by default** (was previously dark-default; `App.tsx`'s `defaultTheme` was changed to `"light"`).
- White/light **cards** with **rounded corners** and **soft shadows** (not hard borders, not flat).
- **Blue primary / subtle purple accent** gradients — restrained, never more than one or two ambient wash elements per section, never stacked with grid/noise/mesh textures.
- Dark navy/foreground text, professional and trustworthy — appropriate for a healthcare/insurance product.
- Avoid: excessive glassmorphism, generic AI-robot graphics, stock imagery, overly colorful dashboards, changing information just for aesthetics.

**Critical constraint the user stated explicitly and that must keep being honored:** existing **text/content/meaning stays the same** — this was and remains a purely visual/CSS/className-level redesign. No copy rewrites, no information architecture changes, no component logic changes.

---

## 9. CURRENT AI HEALTH REPORT UI REQUIREMENT (verbatim, from the user)

> "After AI health analysis completes, every relevant section of the AI Health Report should be populated according to the actual uploaded report and analysis response."

Explicit constraints:
- **No hardcoded medical values.**
- **No demo patient data.**
- **No fabricated values.**
- **Unknown values must remain unavailable/absent rather than being guessed** (matches the existing backend grounding-rule design — see §4/§7.3 — which already enforces this on the AI side).
- **Existing API/data should be reused wherever possible** — do not invent new endpoints or duplicate the `DocumentAnalysisResult` schema; the backend already returns everything needed (see §3's data-flow section).

**Status: implemented and verified, 2026-08-17 (second session). See §7.5 for the full change and verification evidence, and the updated §3 for the current architecture.** Every section of `HealthReport.tsx` now reads from the real `analysis` object; the separate fake-data `report` source was removed from this page entirely.

---

## 10. FRONTEND FILES

**AI Health Report:**
- `frontend/src/pages/dashboard/HealthReport.tsx` — the page itself (see §3 for full breakdown).

**API calls/types:**
- `frontend/src/lib/api.ts` — `uploadApi.scanDocument()`, `healthApi.getReport()`, `aiApi.healthSummary()`, `aiApi.chat()`, etc. (NOT touched this session — out of scope for UI-only work).
- `frontend/src/lib/auth.ts` — auth/session helpers (NOT touched).

**Dashboard layout / shell:**
- `frontend/src/components/dashboard/DashboardLayout.tsx` — sidebar nav, header, main-content ambient wash (edited this session — visual only).
- `frontend/src/components/dashboard/ChatbotWidget.tsx` — floating AI chat widget (edited this session — visual only, border-opacity touch-ups).

**Shared components (all read + light-touched this session, all already token-driven from earlier work):**
- `frontend/src/components/shared/PageHeader.tsx`, `SectionHeader.tsx`, `MetricCard.tsx`, `StatusBadge.tsx`, `StatStrip.tsx` (edited — border/shadow token update), `Timeline.tsx`, `RadialGauge.tsx`, `EmptyState.tsx`, `LoadingState.tsx`.

**UI primitives (shadcn/ui, edited this session for the redesign):**
- `frontend/src/components/ui/card.tsx`, `dialog.tsx`, `select.tsx`, `table.tsx` — border opacity / shadow-token / radius updates.
- `frontend/src/components/ui/button.tsx`, `badge.tsx`, `input.tsx` — read, confirmed no edits needed (already fully token-driven).

**Design tokens:**
- `frontend/src/index.css` — `--radius` (0.625rem → 1rem), softened shadow opacities, new `--gradient-ambient` token + `.bg-gradient-ambient` utility.
- `frontend/tailwind.config.ts` — read, NOT edited (radius cascades automatically via existing `var(--radius)` mapping).
- `frontend/src/App.tsx` — `defaultTheme` changed `"dark"` → `"light"` (only line changed).

**Marketing site (all edited this session — visual only):**
- `frontend/src/components/site/Navbar.tsx`, `Hero.tsx`, `Features.tsx`, `About.tsx`, `HowItWorks.tsx`, `Blockchain.tsx`, `Stats.tsx` (read, no edit needed), `Testimonials.tsx`, `Pricing.tsx`, `CTA.tsx` (read, no edit needed), `Footer.tsx`.

**Auth pages:**
- `frontend/src/pages/SignIn.tsx`, `SignUp.tsx` — logo radius/shadow consistency touch-up only.

**All 11 dashboard pages** (`frontend/src/pages/dashboard/`): `DashboardHome.tsx`, `Claims.tsx`, `InsurancePlans.tsx`, `Assistant.tsx`, `HealthReport.tsx`, `Billing.tsx`, `MedicalHistory.tsx`, `Notifications.tsx`, `Settings.tsx` (read, no edit needed), `Admin.tsx` (read, no edit needed), `Settlement.tsx` (read, no edit needed) — all inspected and given consistent border-opacity/shadow-token treatment where they used raw (non-`<Card>`) bordered surfaces.

---

## 11. BACKEND FILES

**Document analysis / AI pipeline core:**
- `backend/src/services/nvidia.ts` — sole NVIDIA client construction point; `MODELS`, `chatCompletion`, `chatCompletionStream`, `streamChatDeltas`, `visionCompletion`, `embed`, `checkSafety`, `AiServiceError`/`AiErrorCode`, `mapNvidiaError`, `aiErrorStatus`, `describeAiError`.
- `backend/src/services/document-analysis.service.ts` — orchestration hub for text-based analysis (see §4).
- `backend/src/services/vision-analysis.service.ts` — scanned/image-PDF path.
- `backend/src/services/deterministic-extraction.service.ts` — regex fact extractor.
- `backend/src/services/pdf.service.ts` — native PDF text extraction, `PdfExtractionError`.
- `backend/src/services/pdf-render.service.ts` — renders PDF pages to PNG for the vision path, `PdfRenderError`.
- `backend/src/services/retry.ts` — `withBoundedRetry()` shared retry helper.
- `backend/src/services/json-repair.ts` — `tryParseJsonObject()`, bracket-balancing truncated-JSON repair.
- `backend/src/controllers/upload.controller.ts` — `POST /api/upload/document` route handler; wires extraction → analysis → cache → save.
- `backend/src/models/DocumentScan.ts` — Mongo schema for saved scans/analyses (includes `contentHash` cache key, `analysis: Mixed`).

**Other AI-adjacent services** (not modified this session, listed for completeness — present per `git status` as untracked/modified from earlier sessions):
- `backend/src/services/ai.service.ts`, `backend/src/services/claim-analysis.service.ts`, `backend/src/services/chunking.ts`, `backend/src/services/rag.service.ts` (referenced by the live-AI test file), `backend/src/models/PolicyChunk.ts`.

**Config:**
- `backend/.env.example` — documents all `NIM_*` model env vars and defaults (see §4).
- `backend/src/config/env.ts` — env loading/validation.

**Tests:**
- `backend/src/__tests__/live-ai.e2e.test.ts` — opt-in live E2E (see §6).
- `backend/src/services/__tests__/*.test.ts` — `json-repair`, `pdf.service`, `nvidia-errors`, `pdf-render.service`, `escalation`, `deterministic-extraction.service`.

---

## 12. IMPORTANT DECISIONS (do not undo without new user instruction)

1. **Hybrid deterministic-extraction architecture is the permanent design**, not a stopgap — regex handles all mechanical fact extraction; the LLM's job is narrowed to summary/risk/recommendations narrative only. Do not revert to sending raw report text to the LLM for the common case.
2. **`chat_template_kwargs: { thinking: false }` (top-level, not nested)** is the verified, working lever for disabling hidden reasoning on these specific Nemotron models/tasks. It is applied ONLY to: the fast narrative call, and both vision-analysis calls. It is deliberately NOT applied to the reasoning-path/raw-text-fallback calls — this was an explicit scope boundary from the user ("Apply it ONLY to..."; "Do NOT: switch models / modify..."). Do not blanket-apply it elsewhere without a new investigation.
3. **Model IDs are fixed** at their current values (§4) — verified against a live `GET /v1/models` call in a prior session. Do not swap models without re-verifying availability/output-shape compatibility the same way (a "lightning" candidate model was tested and rejected for producing malformed nested JSON; an 8B candidate was tested and rejected as unresponsive).
4. **`checkSafety()` intentionally fails open** — a broken safety check must never block a legitimate user. Do not make it a hard gate without discussing the tradeoff with the user.
5. **Graceful-degradation-over-crash is the standing design principle** for the whole AI pipeline — every stage must have a fallback that returns a valid (even if minimal) `DocumentAnalysisResult` rather than throwing to the client.
6. **UI redesign is visual-only, functionality is sacrosanct** — every component's props, state, API calls, and data flow were preserved byte-for-byte; only `className` strings and CSS tokens changed. This must continue to hold for any further UI work.
7. **Content/copy must not change** during UI-focused work — only presentation.
8. **Insurance Plans page stays table-based** (not converted to a card grid) — the user was asked about this explicitly and did not respond; the existing table/featured-panel layout was kept as the default per the redesign plan, restyled in place.
9. **Footer intentionally forces dark theme** (`className="dark ..."`) regardless of the site-wide theme toggle — documented in-code as an intentional "Stripe/Linear-style" convention. Do not "fix" this as if it were a bug.

---

## 13. THINGS THAT MUST NOT BE CHANGED (without explicit new user approval)

- Backend business logic: claims, insurance plans, settlements, billing, admin, notifications — all controllers/services/routes for these.
- Authentication (`auth.controller.ts`, `lib/auth.ts`, JWT flow) — note its 2 pre-existing TS errors (§6) are unrelated and untouched; do not "fix" them without being asked, and if asked, treat as a separate task from AI/UI work.
- API contracts / response shapes — especially `DocumentAnalysisResult` (Zod schema in `document-analysis.service.ts`) — any frontend work for §9 should consume this shape, not request a backend schema change, unless a genuine gap is found and confirmed with the user first.
- The AI pipeline architecture and model configuration described in §4/§12 — do not alter model IDs, `disableThinking` scope, retry logic, timeout values, or the deterministic-extraction/escalation thresholds without a fresh investigation-and-approval cycle (this has been the standing workflow all session: investigate → propose → wait for approval → implement → verify).
- RAG (`rag.service.ts`, `chunking.ts`, `PolicyChunk.ts`) — untouched, not investigated this session beyond what's referenced by the live-AI test file.
- Routes/URL structure — no route was added, removed, or renamed this session.
- The PHI/logging discipline established throughout: **never log or print patient names, medical data, PHI, or full PDF/report contents** — only safe diagnostic metadata (stage labels, elapsed ms, path taken, counts). This applies to any future debugging work too.
- Database schema (`DocumentScan.ts` and other models) — no migration or schema change was made or is pending.

---

## 14. CURRENT NEXT TASK

**The AI Health Report dynamic-population task (§9/§7.5) is now complete and verified.** No other task has been requested yet. `git status` still shows everything across every session as uncommitted working-tree changes — if the user wants any of this preserved, it needs an explicit commit request (per standing git-safety rules, never do this unprompted).

Candidates for a genuinely new next task, none yet confirmed with the user:
- Committing the accumulated uncommitted work (UI redesign + backend AI pipeline work + this session's Health Report fix) — has never been done across any session captured in this file.
- The two known, pre-existing, unrelated items noted throughout this file: the 2 `auth.controller.ts` TS errors (§6/§13) and the 1.23MB frontend bundle-size warning (§6/§17) — neither has been asked for, don't start on either without being asked.
- The backend-curation inconsistency noted in §3 (vision/raw-text-fallback paths not capping `keyFindings` to abnormal-only) — observed live this session, not something the user asked to be fixed; flag it if relevant, don't fix unprompted.

---

## 15. EXACT NEXT STEPS

No steps are queued. When the user gives the next task: re-read §2/§3 fresh (code may have moved), confirm current git/server state before assuming anything in this file still holds, and follow the same investigate → propose → wait-for-approval → implement → verify-live workflow used for §7.5.

---

## 16. VERIFICATION PLAN

For any change touching the AI Health Report:

1. **Backend sanity first:** confirm both dev servers are running (`netstat -ano | grep -E ':(5000|8080)' | grep LISTENING` on Windows/Git-Bash) — start them if not (`npm run dev` in each of `backend/` and `frontend/`; kill any stale PID on port 5000 first — `tsx watch` has a known port-race issue on this machine, see the "known warnings" in §17).
2. **Real PDF upload through the actual browser UI** (not curl, not a unit test) using the Chrome browser automation tools (`mcp__claude-in-chrome__*` — load via `ToolSearch` first if deferred):
   - Navigate to `http://localhost:8080/dashboard/health-report`.
   - Use the `file_upload` tool to upload a real PDF fixture. **Note:** the tool only accepts files from the session-shared scratchpad path — copy any fixture PDF into the scratchpad directory first if it isn't already there.
   - Use a normal text-based PDF fixture, and ideally also re-test with the original reproduction fixture (`Sample-Smart-Report-Clinics.pdf`, a real 12-page Apollo report — check if it still exists in the backend test fixtures directory or ask the user for it) to confirm the earlier empty-response fix (§7.1) still holds after any new changes.
   - Screenshot the resulting "Uploaded report analysis" card and visually confirm: real extracted lab values/patient details appear (not "unknown" placeholders unless the source PDF genuinely lacks that field), no fabricated-looking data, disclaimer present.
   - If the vitals-snapshot/risk-assessment section was changed per §15, confirm it now reflects the just-uploaded report's real data (or confirm the chosen product direction was implemented correctly).
3. **Console check:** `read_console_messages` with `onlyErrors: true` after the upload completes — must be clean.
4. **Regression check on unrelated pages:** quickly re-visit Dashboard Home, Claims, Insurance Plans, AI Chat Assistant to confirm nothing else broke (send one real chat message, confirm a real streamed response, same as this session's §6 verification).
5. **Build/typecheck:** `npm run build` and `npx tsc --noEmit -p tsconfig.app.json` in `frontend/`; `npx tsc --noEmit` and `npx vitest run` in `backend/` — confirm no new errors beyond the 2 known pre-existing `auth.controller.ts` ones.
6. **PHI discipline:** confirm no patient data, medical values, or full PDF content was ever logged/printed while doing any of the above (grep terminal output / logs if unsure).

---

## 17. KNOWN WARNINGS / LIMITATIONS (not application bugs)

- **`tsx watch` port-race on Windows:** when backend source files are edited while `npm run dev` is running, the old process sometimes doesn't release port 5000 before the new one tries to bind, causing `EADDRINUSE` while a stale process keeps serving old code. Always explicitly find and kill the PID on port 5000 before restarting the backend dev server when verifying a change.
- **MSYS/Git-Bash path resolution on Windows:** `/tmp/...` paths do not reliably resolve the same way across tools on this machine — always use the full Windows-style scratchpad path (`C:\Users\raopr\AppData\Local\Temp\claude\...`) for any cross-tool temp file needs.
- **Frontend bundle size warning:** the production build emits one JS chunk at 1.23MB (over Vite's 500KB advisory threshold). This is a pre-existing characteristic of the app (not introduced this session) and was not addressed — code-splitting was out of scope for the UI-visual-only redesign task.
- **`Chrome browser automation dialogs`:** never trigger native JS `alert`/`confirm`/`prompt` via the browser tools — they block all further automation. None were encountered this session, but be aware for any future upload/delete-confirmation flows.
- **Live AI tests are opt-in and cost real tokens/latency:** `RUN_LIVE_AI_TESTS=1 npx vitest run src/__tests__/live-ai.e2e.test.ts` hits the real NVIDIA API and a real local MongoDB with a seeded `InsurancePlan` collection (`npm run seed`) — don't run this casually/repeatedly without reason.
- **No git commits exist yet for any of this session's (or the preceding sessions') work** — `git log` shows only "Initial commit". Everything described in this file is currently uncommitted working-tree state. If the user wants this preserved, it needs to be committed explicitly (only when asked, per standing git-safety rules).

---

## NEW CLAUDE SESSION INSTRUCTIONS

If you are a new Claude Code session picking this project up:

1. **Read this entire file first**, before touching any code.
2. **Do not blindly trust it.** This file was accurate as of 2026-08-17 and was written carefully against the real repository state at that time, but code changes, and so can the state of running servers, git status, and test results. Re-verify anything load-bearing before acting on it:
   - Re-run `git status` and `git log` to see what, if anything, has changed since.
   - Re-open any file this memory describes before editing it — don't assume line numbers or exact contents are still current.
   - Re-run the test suites (§6) and re-check the dev servers are actually running before assuming the app is in a working state.
3. **Understand the current task before writing any code** — see §14/§15. The next task is a product-direction question (§15 step 2) as much as a technical one; don't guess at what the user wants for the vitals/risk-bar reconciliation without asking.
4. **Ask for approval before making major changes**, especially anything touching the AI pipeline (§4/§12/§13) or backend schema/routes — this has been the consistent, explicit workflow across this entire project's history: investigate → report findings → propose a plan → wait for explicit approval → implement → verify with real tests (not just compilation) → report back.
5. **Never log or print PHI/patient data/full document contents** — this rule was enforced strictly throughout every session captured in this file and must continue.
6. **When in doubt about scope, ask rather than assume** — this project's owner has consistently given very precise, bounded instructions ("ONLY," "do NOT," exhaustive do/don't lists) and expects them followed exactly, not creatively expanded.
