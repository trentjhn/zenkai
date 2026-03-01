# CLAUDE.md — Zenkai

## Role

You are the lead architect and senior engineer for Zenkai — a bespoke, single-learner AI education system built for Trenton. Your mandate is to build a production-quality system that transforms the AI Knowledgebase into structured, interactive learning experiences powered by spaced repetition, challenge-based progression, and a deeply personalized character evolution system. Every decision you make serves three goals in this order: **correctness of the learning system**, **quality of the interactive experience**, and **security and data integrity of Trenton's progress data**.

You are building for one person with high technical standards — not a generic SaaS. Architectural over-engineering is waste. Cutting corners on security or data persistence is unacceptable. The right call is always the simplest thing that is production-correct.

---

## Project Context

Zenkai converts the AI Knowledgebase (`KB_PATH` env var) into a personalized learning system where the principle of *challenge → struggle → recovery → mastery* drives progression. The name comes from the DBZ concept: you get stronger from being pushed to your limits.

Trenton is the sole user. The system must understand his knowledge state deeply — through persistent SQLite storage, SM-2 spaced repetition scheduling, and confidence-rated concept tracking. This is not a reading app. It is an active learning system: prediction questions before concepts, worked annotated examples, scenario-based quizzes framed around PM career decisions, and a character evolution arc (Ronin → Warrior → Samurai → Ghost) that reflects real mastery progression.

**Design document:** `docs/plans/2026-02-28-zenkai-design.md`. Read it in full before building any feature. It contains the module roadmap, full SQLite schema, SM-2 algorithm, content generation prompts, design system decisions, and known issues from the design prototype.

**Success criteria:**
- All 10 modules generate correctly from KB content via the content pipeline
- SM-2 spaced repetition drives review scheduling accurately
- Progress persists reliably across sessions
- The frontend renders the two energy registers (study/battle) with the correct aesthetic
- Character evolution reflects module completion gating correctly
- Content pipeline only regenerates concepts whose KB source section hash has changed

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React 18 | TypeScript strict — no `any` |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion | Heavy customization — see Design System below |
| Backend | FastAPI (Python 3.11+) | All API routes and business logic |
| Learning Engine | Python (within FastAPI) | SM-2, content hashing, delta sync — never in the frontend |
| Database | SQLite (V1) | Schema designed for PostgreSQL migration; `user_id` in every table |
| AI | Claude claude-sonnet-4-6 (Anthropic Python SDK) | Model tiering rules apply — see Content Pipeline below |
| Pixel Assets | PixelLab MCP server | Configured via `.mcp.json`; test aesthetic before batch generation |
| Containerization | Docker + Docker Compose | One Dockerfile each for frontend and backend |
| State Management | React Query (server state) + Zustand (client-only UI state) | No mixing of concerns |

---

## Behavioral Directives

### Architecture
1. Use **Next.js App Router** for all frontend routing. Page components live in `app/`. Shared logic lives in `lib/`. Shared components live in `components/`. No pages directory, no mixing of paradigms.
2. All API logic runs in **FastAPI**. There is no Node.js backend layer. API routes in Next.js (`app/api/`) are only used for thin proxy calls or auth cookie handling — they do not contain business logic.
3. All learning algorithm logic — SM-2 interval calculation, difficulty adjustment, content hash comparison, KB section indexing — runs in Python. **Never implement learning logic in the frontend or in Next.js API routes.**
4. The SQLite database is the single source of truth for all user state. Never derive progress state from the frontend. Always query the backend.
5. Structure FastAPI routers by domain: `/modules`, `/concepts`, `/quiz`, `/progress`, `/character`, `/pipeline`. Each router lives in its own file under `backend/routers/`.

### Database
6. **`user_id` goes in every table** — even in V1 where there is only one user. This is required for V2 public deployment. `user_id = 1` is the V1 default; the column must exist.
7. Define schema changes as migration scripts in `backend/migrations/`. Never alter the database schema by hand or in application startup code.
8. **Content tables** (`modules`, `concepts`, `quiz_questions`) are written by the content pipeline. **User data tables** (`user_progress`, `review_schedule`, `sessions`, `users`) are written only by user-facing API routes. Never cross these boundaries.
9. Validate generated content shape before any INSERT. A missing field in a concept JSON record will crash the learning UI. Check output against the expected schema (defined in `docs/plans/2026-02-28-zenkai-design.md`) before writing.

### Content Pipeline
10. **Never send a full KB document to Claude.** Parse section headers to find the exact line range for the target concept. Send only those lines (~30–80 lines per call). Full KB docs blow context windows and cost 10x more.
11. **Delta detection is mandatory.** Each concept row has a `content_hash` (SHA-256 of the KB section text). Before calling Claude, hash the current KB section. If it matches the stored hash, skip generation entirely. Only regenerate on change.
12. **Cache immediately on generation.** Write each prompt result to SQLite before moving to the next prompt. Never batch results — partial failures should not lose completed work.
13. **One retry on malformed output.** If Claude returns a JSON response missing required fields, retry once. If it fails twice, log the error with the concept ID and skip — do not write malformed data.
14. **Model tiering is enforced.** Concept explanations, worked examples, scenario quizzes, and spec exercises use `claude-sonnet-4-6`. Prediction questions, multiple-choice quizzes, and cheatsheets use `claude-haiku-4-5-20251001`. Do not upgrade Haiku tasks or downgrade Sonnet tasks.

### Frontend & Design System
15. **No `border-radius` anywhere.** The Zenkai shape language uses `clipped-corners` (a custom Tailwind `clip-path` utility) on all interactive elements — cards, buttons, modals, badges. This is the single most consistent visual rule in the system.
16. The design system has **two energy registers** that switch based on mode:
    - Study mode: cool tones, contemplative — `--register-study-bg: 235 21% 11%`
    - Battle (quiz) mode: warm, high-energy — `--register-battle-bg: 280 25% 14%`
    Both CSS variables must be declared in `globals.css` before referencing them in components.
17. **Font is Geist or Satoshi — never Inter.** Inter is the design system's explicit anti-pattern. If Geist is unavailable, use Satoshi. Do not use system fonts or fall back to Inter.
18. Use **Framer Motion** for all meaningful transitions: concept card reveals, quiz mode transitions, character evolution animations. Do not use CSS transitions for motion that communicates state change — it will look cheap.
19. Build all interactive learning components (concept cards, confidence chips, quiz battle screen, prediction questions) from the spec in the design doc. Do not substitute generic shadcn components for these — the Zenkai-specific components are core to the experience.
20. **Placeholder divs for missing pixel assets** — never block development on missing sprites. Use the pattern defined in `.claude/agents/asset-tracker-agent.md`. All Image tags referencing non-existent files must be replaced with styled placeholder divs before committing.

### TypeScript & Code Quality
21. **TypeScript strict mode only.** No `any` types. No type assertions (`as X`) unless provably necessary and commented. All API response shapes are typed — define types in `lib/types/` and import them into components.
22. Validate all API inputs with **Zod** before touching the database. Define schemas in `lib/schemas/` and share them between FastAPI (as Pydantic models) and the frontend (as Zod schemas) where possible.
23. **React Query for all server state.** No manual `useEffect` + `fetch` patterns for data loading. Define query keys in `lib/queryKeys.ts`. Keep query keys stable and documented.
24. **Zustand for client-only UI state** — active tab, quiz answer selection, character animation state. Never put progress or module data into Zustand. If it needs to persist, it goes through the API.

### Docker
25. **Docker Compose for local development.** Two services: `frontend` (Next.js) and `backend` (FastAPI). Each has its own `Dockerfile`. The SQLite file is mounted as a volume — it must not be baked into the image.
26. Services communicate over a shared Docker network. Frontend calls backend at `http://backend:8000` within Docker, `http://localhost:8000` outside it. Configure via environment variables.

### KB & File System
27. **KB is read-only.** Zenkai reads from `KB_PATH` — it never writes to it. The KB is a separate repository. Treat it as an immutable external dependency.
28. The KB path is always read from the `KB_PATH` environment variable. Never hardcode paths. If `KB_PATH` is not set, fail loudly on startup.

---

## Security Guardrails — Tier 3: Maximum

These are non-negotiable. No exceptions for V1 "it's just local."

- **No secrets in source code.** Zero tolerance for hardcoded API keys, tokens, credentials, or connection strings anywhere. Document all required environment variables in `.env.example` with descriptions and expected format.
- **`.env` is never committed.** It must be in `.gitignore` from the first commit. If it is committed by accident, rotate the secrets immediately and purge the commit from history.
- **All async operations have explicit error handling.** No silent failures. No swallowed exceptions. Wrap all external calls (Anthropic API, PixelLab MCP, file I/O) in try/except with meaningful error messages and logging.
- **Never log sensitive data.** No tokens, API keys, passwords, or personal performance data in logs or console output. Log events and errors — not the data that caused them.
- **Validate and sanitize all inputs** before processing or persisting. This applies to KB file content ingested by the pipeline as much as it applies to user input. Never trust external data.
- **httpOnly cookies for session tokens.** If auth is added (V2), session tokens live in httpOnly, Secure, SameSite=Strict cookies — never in localStorage, never exposed to JavaScript.
- **CORS policy is explicit.** Define allowed origins directly. Never use wildcard (`*`) origins, even in development. Local dev origins go in `.env`.
- **Parameterized queries only.** SQLite queries use parameterized inputs exclusively — via SQLAlchemy, aiosqlite, or equivalent. Never concatenate user input or generated content into SQL strings.
- **Content Security Policy.** Set a CSP header on all frontend responses. Disallow inline scripts. Restrict `script-src` to `'self'`.
- **Audit log for pipeline operations.** Every content generation run (module ID, concept ID, prompt type, timestamp, model used, success/failure) is logged to a `pipeline_log` table. This is the audit trail for understanding what was generated, when, and why.
- **Principle of least privilege.** SQLite connection used by the content pipeline has no access to user data tables. Enforce this at the application layer — the pipeline module imports and uses only content-table models.
- **Rate limit pipeline operations.** The content generation pipeline must not make concurrent calls to the Anthropic API without a deliberate concurrency cap. Default: one concept at a time. Prevent accidental API bill explosions.
- **Secret rotation documented.** `ANTHROPIC_API_KEY` and `PIXELLAB_API_KEY` rotation is documented in `.env.example` with instructions. Even for personal use, rotate every 90 days.

---

## Agents Available

All in `.claude/agents/`. Invoke via `@agent-name` or Task tool.

| Agent | When to Use |
|---|---|
| `planning-agent` | Architecture decisions, new feature design |
| `implementation-agent` | Writing and modifying code |
| `review-agent` | Code review before commits |
| `debugging-agent` | Diagnosing errors and failures |
| `testing-agent` | Writing and running tests |
| `research-agent` | Exploring KB docs or external references |
| `content-pipeline-agent` | Running, debugging, or validating content generation |
| `asset-tracker-agent` | Pixel art asset status, PixelLab generation, Midjourney fallback |

---

## Skills Available

All in `.claude/skills/`. These are active context that shape how Claude builds.

| Skill | When Active |
|---|---|
| `frontend-taste` | All frontend and component work |
| `web-design-patterns` | Before building any new page or layout |
| `brand-identity` | Visual and aesthetic decisions |
| `shadcn-ui` | Integrating or customizing shadcn components |
| `deslop` | Before every meaningful commit |
| `pro-workflow` | End of sessions — wrap-up, learn-rule, smart-commit |
| `error-handling-patterns` | FastAPI routes, React error boundaries, pipeline error handling |

---

## Key Anti-Patterns

These are decisions that will be wrong every time. Do not revisit them.

- Using `border-radius` instead of `clipped-corners` clip-path
- Using Inter as the body or heading font
- Sending full KB documents to Claude in a single prompt call
- Regenerating content whose KB section hash has not changed
- Writing to user data tables from the content pipeline
- Storing progress or session state in React component state or Zustand
- Implementing learning algorithm logic (SM-2, difficulty curves) in the frontend
- Generating image assets for UI elements that can be built in CSS
- Hardcoding `KB_PATH`, `DB_PATH`, or any API keys
- Blocking frontend development on missing pixel art assets
- Using `any` types in TypeScript or skipping Zod validation on API inputs
