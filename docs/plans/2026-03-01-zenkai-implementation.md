# Zenkai Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Build Zenkai end-to-end — from a blank repo to a fully functional personal AI learning system with content generation pipeline, spaced repetition, quiz battle UI, character evolution, and world map.

**Architecture:** Next.js 14 frontend + FastAPI backend + SQLite database. Content pipeline reads the AI Knowledgebase, calls Claude to generate structured learning content, and caches results in SQLite with SHA-256 hash-based delta detection. The frontend renders a dual-register UI (study/battle mode) with a Japanese samurai aesthetic and Pokémon-style quiz battles.

**Tech Stack:** Next.js 14 (App Router), TypeScript strict, Tailwind CSS + shadcn/ui, Framer Motion, FastAPI (Python 3.11), SQLite (aiosqlite + SQLAlchemy), Anthropic Python SDK, Zod, React Query, Zustand, Docker Compose.

**Read before building:** `docs/plans/2026-02-28-zenkai-design.md` — all component specs, color tokens, schema, SM-2 algorithm, content generation prompts, and known issues from the design prototype are there.

---

## Phase Overview & Checkpoints

| Phase | What You're Building | Checkpoint Gate |
|---|---|---|
| 0 | Test infrastructure | `pytest`, `vitest`, and `playwright` all run green on empty suites |
| 1 | Project scaffold + DB schema | Both services run, DB created with all 10 tables |
| 2 | Design system | App renders with correct aesthetic — clipped corners, correct colors, no Inter |
| 3 | Content pipeline | Run pipeline on Module 1, verify all content in SQLite |
| 4 | Backend API | All routes return correct data, `pytest` integration suite passes |
| 5 | Core learning UI | Full concept reading flow works end-to-end, `vitest` component suite passes |
| 6 | Quiz battle | Quiz flow works, answers and confidence submit to backend |
| 7 | World map + character | All screens navigate correctly, progression gates work |
| 8 | Spaced repetition | Review queue surfaces correctly-scheduled items |
| 9 | Polish + assets | PixelLab test sprite evaluated, Framer Motion transitions wired |
| E2E | End-to-end smoke tests | Playwright passes all 3 critical user flow tests |

---

## Phase 0 — Test Infrastructure

> Run this phase before writing any application code. If tests can't run, nothing downstream is trustworthy.

### Task 0.1: Backend test setup — pytest + FastAPI TestClient

**Files:**
- Create: `backend/pytest.ini`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

**Step 1: Add test dependencies to requirements.txt**
```
pytest==8.3.0
pytest-asyncio==0.24.0
pytest-cov==5.0.0
httpx==0.27.0
```

**Step 2: Create pytest.ini**
```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
```

**Step 3: Create tests/conftest.py**
```python
import pytest
import asyncio
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.database import init_db

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_db(tmp_path, monkeypatch):
    """Isolated SQLite DB per test — never touches zenkai.db."""
    db_file = str(tmp_path / "test_zenkai.db")
    monkeypatch.setenv("DB_PATH", db_file)
    await init_db()
    return db_file

@pytest.fixture
async def client(test_db):
    """FastAPI AsyncClient wired to a fresh test DB."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
```

**Step 4: Create a smoke test to verify the setup**
```python
# backend/tests/test_smoke.py
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Step 5: Run it**
```bash
cd backend && pip install -r requirements.txt
pytest tests/test_smoke.py -v
```
Expected: `test_health PASSED`

**Step 6: Verify coverage report works**
```bash
pytest tests/ --cov=. --cov-report=term-missing
```
Expected: Coverage table printed, no errors.

**Step 7: Commit**
```bash
git add backend/pytest.ini backend/tests/
git commit -m "test: pytest infrastructure with AsyncClient fixture and isolated test DB"
```

---

### Task 0.2: Frontend test setup — Vitest + React Testing Library

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/tests/setup.ts`
- Modify: `frontend/package.json`

**Step 1: Install test dependencies**
```bash
cd frontend
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 2: Create vitest.config.ts**
```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    coverage: {
      reporter: ["text", "lcov"],
      include: ["components/**", "lib/**"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
})
```

**Step 3: Create tests/setup.ts**
```typescript
import "@testing-library/jest-dom"
```

**Step 4: Add test scripts to package.json**
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**Step 5: Create a smoke test**
```typescript
// frontend/tests/smoke.test.tsx
import { describe, it, expect } from "vitest"

describe("test infrastructure", () => {
  it("runs", () => {
    expect(true).toBe(true)
  })
})
```

**Step 6: Run it**
```bash
cd frontend && npm test
```
Expected: `1 test passed`

**Step 7: Commit**
```bash
git add frontend/vitest.config.ts frontend/tests/ frontend/package.json
git commit -m "test: Vitest + React Testing Library infrastructure"
```

---

### Task 0.3: End-to-end test setup — Playwright

**Files:**
- Create: `playwright.config.ts` (repo root)
- Create: `e2e/smoke.spec.ts`

**Step 1: Install Playwright at repo root**
```bash
cd /Users/t-rawww/zenkai
npm init -y
npm install -D @playwright/test
npx playwright install chromium
```

**Step 2: Create playwright.config.ts**
```typescript
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "cd frontend && npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "cd backend && uvicorn main:app --port 8000",
      url: "http://localhost:8000/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
```

**Step 3: Create e2e/smoke.spec.ts**
```typescript
import { test, expect } from "@playwright/test"

test("app loads", async ({ page }) => {
  await page.goto("/")
  await expect(page).not.toHaveTitle("Error")
})
```

**Step 4: Add E2E scripts to root package.json**
```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

**Step 5: Run it (requires both services running)**
```bash
npx playwright test e2e/smoke.spec.ts
```
Expected: `1 passed`

**Step 6: Commit**
```bash
git add playwright.config.ts e2e/ package.json
git commit -m "test: Playwright E2E infrastructure with smoke test"
```

---

### Task 0.4: Full E2E test suite — the 3 critical user flows

These tests define what "working" means for the entire app. Write them now as failing specs — they will pass as phases complete.

**File:** `e2e/critical-flows.spec.ts`

```typescript
import { test, expect } from "@playwright/test"

// FLOW 1: Concept Learning
test("learn flow — read a concept end-to-end", async ({ page }) => {
  await page.goto("/world-map")
  await page.click('[data-testid="module-0"]')           // Enter Module 0 (always unlocked)
  await expect(page.locator('[data-testid="prediction-question"]')).toBeVisible()
  await page.click('[data-testid="prediction-option-0"]') // Answer prediction question
  await expect(page.locator('[data-testid="concept-card"]')).toBeVisible()
  await expect(page.locator('[data-testid="concept-hook"]')).not.toBeEmpty()
  await page.click('[data-testid="go-deeper-btn"]')
  await expect(page.locator('[data-testid="deep-layer"]')).toBeVisible()
  await page.click('[data-testid="confidence-knew-it"]')
  await expect(page).toHaveURL(/\/learn/)
})

// FLOW 2: Quiz Battle
test("quiz flow — answer a question with confidence rating", async ({ page }) => {
  await page.goto("/quiz/1")
  await expect(page.locator('[data-testid="quiz-question"]')).toBeVisible()
  await page.click('[data-testid="quiz-option-0"]')
  await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible()
  await page.click('[data-testid="confidence-somewhat-sure"]')
  await expect(page.locator('[data-testid="quiz-question"]')).toBeVisible() // Next question loads
})

// FLOW 3: Review Queue
test("review flow — due items surface and update schedule", async ({ page }) => {
  await page.goto("/review")
  const hasItems = await page.locator('[data-testid="review-item"]').count()
  // If items exist, complete one and verify schedule updates
  if (hasItems > 0) {
    await page.click('[data-testid="quiz-option-0"]')
    await page.click('[data-testid="confidence-knew-it"]')
    await expect(page.locator('[data-testid="review-complete"]')
      .or(page.locator('[data-testid="review-item"]'))).toBeVisible()
  } else {
    await expect(page.locator('[data-testid="review-empty"]')).toBeVisible()
  }
})
```

**Step 1: Run to verify all 3 fail (expected — app not built yet)**
```bash
npx playwright test e2e/critical-flows.spec.ts
```
Expected: 3 FAIL. This is correct — these are the acceptance tests for the entire build.

**Step 2: Commit**
```bash
git add e2e/critical-flows.spec.ts
git commit -m "test: E2E acceptance tests for 3 critical user flows — currently failing (expected)"
```

---

## ✅ CHECKPOINT 0 — Test Infrastructure

**Verify before proceeding:**
```bash
# Backend
cd backend && pytest tests/test_smoke.py -v
# Expected: 1 PASSED

# Frontend
cd ../frontend && npm test
# Expected: 1 PASSED

# E2E smoke (requires services running)
cd .. && npx playwright test e2e/smoke.spec.ts
# Expected: 1 PASSED

# E2E critical flows (expected to fail — that's correct)
npx playwright test e2e/critical-flows.spec.ts
# Expected: 3 FAILED — this confirms they're wired, not broken
```

- [ ] `pytest tests/test_smoke.py` — 1 PASS
- [ ] `npm test` in frontend — 1 PASS
- [ ] `playwright test e2e/smoke.spec.ts` — 1 PASS
- [ ] `playwright test e2e/critical-flows.spec.ts` — 3 FAIL (this is correct)
- [ ] Coverage commands run without errors on both backend and frontend

**The 3 failing E2E tests are your acceptance criteria for the entire project. When all 3 pass, Zenkai is built.**

---

## Phase 1 — Project Scaffold + Database

### Task 1.1: Initialize Next.js frontend

**Files:**
- Create: `frontend/` (Next.js project root)

**Step 1: Scaffold the project**
```bash
cd /Users/t-rawww/zenkai
npx create-next-app@14 frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```
Expected: Next.js 14 project created with App Router and TypeScript.

**Step 2: Verify it runs**
```bash
cd frontend && npm run dev
```
Expected: `ready - started server on 0.0.0.0:3000`

**Step 3: Commit**
```bash
cd /Users/t-rawww/zenkai
git add frontend/
git commit -m "feat: scaffold Next.js 14 frontend with App Router and TypeScript"
```

---

### Task 1.2: Initialize FastAPI backend

**Files:**
- Create: `backend/main.py`
- Create: `backend/requirements.txt`
- Create: `backend/__init__.py`
- Create: `backend/routers/__init__.py`
- Create: `backend/models/__init__.py`
- Create: `backend/pipeline/__init__.py`

**Step 1: Create requirements.txt**
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
aiosqlite==0.20.0
sqlalchemy==2.0.35
anthropic==0.40.0
python-dotenv==1.0.1
pydantic==2.9.0
httpx==0.27.0
```

**Step 2: Create main.py**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Zenkai API", version="0.1.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 3: Install and run**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Expected: `Application startup complete.`

**Step 4: Verify health endpoint**
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"ok"}`

**Step 5: Commit**
```bash
cd /Users/t-rawww/zenkai
git add backend/
git commit -m "feat: scaffold FastAPI backend with CORS and health endpoint"
```

---

### Task 1.3: SQLite schema and database initialization

**Files:**
- Create: `backend/database.py`
- Create: `backend/schema.sql`

**Step 1: Write schema.sql**

```sql
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL DEFAULT 'default',
    character_form  INTEGER NOT NULL DEFAULT 1,
    total_xp        INTEGER NOT NULL DEFAULT 0,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    longest_streak  INTEGER NOT NULL DEFAULT 0,
    last_study_date DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
    id                  INTEGER PRIMARY KEY,
    order_index         INTEGER NOT NULL UNIQUE,
    title               TEXT NOT NULL,
    kb_source_path      TEXT,
    pm_context_path     TEXT,
    last_synced_commit  TEXT,
    is_unlocked         BOOLEAN NOT NULL DEFAULT 0,
    quiz_score_achieved REAL,
    unlocked_at         TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concepts (
    id                  INTEGER PRIMARY KEY,
    module_id           INTEGER NOT NULL REFERENCES modules(id),
    order_index         INTEGER NOT NULL,
    title               TEXT NOT NULL,
    default_layer       TEXT NOT NULL,
    deep_layer          TEXT NOT NULL,
    prediction_question TEXT NOT NULL,
    worked_example      TEXT NOT NULL,
    spec_exercise       TEXT,
    pm_application      TEXT,
    cheatsheet          TEXT,
    content_hash        TEXT NOT NULL,
    generated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concept_reads (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    concept_id      INTEGER NOT NULL REFERENCES concepts(id),
    read_default    BOOLEAN NOT NULL DEFAULT 0,
    read_deep       BOOLEAN NOT NULL DEFAULT 0,
    first_read_at   TIMESTAMP,
    deep_read_at    TIMESTAMP,
    UNIQUE(user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id              INTEGER PRIMARY KEY,
    concept_id      INTEGER NOT NULL REFERENCES concepts(id),
    question_type   TEXT NOT NULL,
    scenario_type   TEXT,
    content         TEXT NOT NULL,
    generated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_progress (
    id                  INTEGER PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    quiz_question_id    INTEGER NOT NULL REFERENCES quiz_questions(id),
    answered_correctly  BOOLEAN NOT NULL,
    confidence          TEXT NOT NULL,
    answered_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    time_spent_ms       INTEGER
);

CREATE TABLE IF NOT EXISTS review_schedule (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    concept_id      INTEGER NOT NULL REFERENCES concepts(id),
    next_review_at  TIMESTAMP NOT NULL,
    interval_days   REAL NOT NULL DEFAULT 1.0,
    ease_factor     REAL NOT NULL DEFAULT 2.5,
    repetitions     INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    UNIQUE(user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id                  INTEGER PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    started_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at            TIMESTAMP,
    questions_answered  INTEGER NOT NULL DEFAULT 0,
    correct_answers     INTEGER NOT NULL DEFAULT 0,
    concepts_read       INTEGER NOT NULL DEFAULT 0,
    xp_earned           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS character_equipment (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    module_id       INTEGER NOT NULL REFERENCES modules(id),
    equipment_name  TEXT NOT NULL,
    equipped_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spec_exercises (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    module_id       INTEGER NOT NULL REFERENCES modules(id),
    user_response   TEXT NOT NULL,
    submitted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_log (
    id              INTEGER PRIMARY KEY,
    module_id       INTEGER REFERENCES modules(id),
    concept_id      INTEGER REFERENCES concepts(id),
    prompt_type     TEXT NOT NULL,
    model_used      TEXT NOT NULL,
    success         BOOLEAN NOT NULL,
    error_message   TEXT,
    run_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default user and Module 0 (always unlocked)
INSERT OR IGNORE INTO users (id, username) VALUES (1, 'trenton');

INSERT OR IGNORE INTO modules (order_index, title, kb_source_path, pm_context_path, is_unlocked) VALUES
(0, 'AI PM Foundations',    NULL,                                  'pm-context/ai-pm-role.md',         1),
(1, 'Prompt Engineering',   'prompt-engineering/prompt-engineering.md', NULL,                          0),
(2, 'Context Engineering',  'context-engineering/context-engineering.md', NULL,                        0),
(3, 'Reasoning LLMs',       'reasoning-llms/reasoning-llms.md',   NULL,                               0),
(4, 'Agentic Engineering',  'agentic-engineering/agentic-engineering.md', NULL,                        0),
(5, 'Skills',               'skills/skills.md',                    NULL,                               0),
(6, 'Evaluation',           'evaluation/evaluation.md',            NULL,                               0),
(7, 'Fine-tuning',          'fine-tuning/fine-tuning.md',          NULL,                               0),
(8, 'AI Security',          'ai-security/ai-security.md',          NULL,                               0),
(9, 'Playbooks',            'playbooks/',                          NULL,                               0);
```

**Step 2: Write database.py**
```python
import aiosqlite
import os
from pathlib import Path

DB_PATH = os.getenv("DB_PATH", "./zenkai.db")
SCHEMA_PATH = Path(__file__).parent / "schema.sql"

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db

async def init_db():
    schema = SCHEMA_PATH.read_text()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(schema)
        await db.commit()
```

**Step 3: Wire init_db into startup**

Add to `backend/main.py`:
```python
from backend.database import init_db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Zenkai API", version="0.1.0", lifespan=lifespan)
```

**Step 4: Write the test**
```python
# backend/tests/test_database.py
import pytest
import aiosqlite
import asyncio
from backend.database import init_db

@pytest.mark.asyncio
async def test_schema_creates_all_tables(tmp_path, monkeypatch):
    db_file = str(tmp_path / "test.db")
    monkeypatch.setenv("DB_PATH", db_file)
    await init_db()
    async with aiosqlite.connect(db_file) as db:
        async with db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ) as cursor:
            tables = {row[0] async for row in cursor}
    expected = {
        "users", "modules", "concepts", "concept_reads",
        "quiz_questions", "user_progress", "review_schedule",
        "sessions", "character_equipment", "spec_exercises", "pipeline_log"
    }
    assert expected.issubset(tables)

@pytest.mark.asyncio
async def test_seed_data_exists(tmp_path, monkeypatch):
    db_file = str(tmp_path / "test.db")
    monkeypatch.setenv("DB_PATH", db_file)
    await init_db()
    async with aiosqlite.connect(db_file) as db:
        async with db.execute("SELECT COUNT(*) FROM modules") as cursor:
            row = await cursor.fetchone()
            assert row[0] == 10
        async with db.execute("SELECT is_unlocked FROM modules WHERE order_index=0") as cursor:
            row = await cursor.fetchone()
            assert row[0] == 1
```

**Step 5: Run the test**
```bash
cd backend && pip install pytest pytest-asyncio
pytest tests/test_database.py -v
```
Expected: 2 tests PASS

**Step 6: Commit**
```bash
cd /Users/t-rawww/zenkai
git add backend/schema.sql backend/database.py backend/tests/
git commit -m "feat: SQLite schema with all 10 tables and seed data"
```

---

### Task 1.4: Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `frontend/Dockerfile`
- Create: `backend/Dockerfile`

**Step 1: frontend/Dockerfile**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

**Step 2: backend/Dockerfile**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 3: docker-compose.yml**
```yaml
version: "3.9"
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
    networks:
      - zenkai

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./zenkai.db:/app/zenkai.db
    networks:
      - zenkai

networks:
  zenkai:
    driver: bridge
```

**Step 4: Verify**
```bash
docker compose build && docker compose up
```
Expected: Both services start, `http://localhost:3000` shows Next.js, `http://localhost:8000/health` returns `{"status":"ok"}`

**Step 5: Commit**
```bash
git add docker-compose.yml frontend/Dockerfile backend/Dockerfile
git commit -m "feat: Docker Compose for local dev with frontend and backend services"
```

---

## ✅ CHECKPOINT 1 — Foundation

```bash
# Run full backend test suite
cd backend && pytest tests/ -v
# Expected: test_health PASS, test_schema_creates_all_tables PASS, test_seed_data_exists PASS

# Verify DB manually
sqlite3 zenkai.db "SELECT order_index, title, is_unlocked FROM modules ORDER BY order_index;"
# Expected: 10 rows, order_index 0 has is_unlocked=1
```

- [ ] `pytest tests/` — 3 PASS, 0 FAIL
- [ ] `npm run dev` starts Next.js on port 3000
- [ ] `uvicorn main:app --reload` starts FastAPI on port 8000
- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `zenkai.db` created with all 11 tables on startup
- [ ] Module 0 has `is_unlocked = 1`
- [ ] `docker compose up` brings both services up cleanly

Do not proceed until all 7 items check out.

---

## Phase 2 — Design System

### Task 2.1: Tailwind config with all design tokens

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/app/globals.css`

**Step 1: Update tailwind.config.ts**
```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "zen-gold":   "#F4D03F",
        "zen-void":   "#1A1B26",
        "zen-slate":  "#24283B",
        "zen-sakura": "#FF4D6D",
        "zen-plasma": "#7AA2F7",
        "zen-purple": "#9B8EC4",
        "zen-teal":   "#00D4C8",
      },
      fontFamily: {
        heading: ["Geist", "Satoshi", "sans-serif"],
        body:    ["Geist", "Satoshi", "sans-serif"],
        mono:    ["Geist Mono", "monospace"],
      },
      spacing: {
        ma: "24px",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: (u: object) => void }) {
      addUtilities({
        ".clipped-corners": {
          "clip-path": "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)",
        },
        ".clipped-corners-sm": {
          "clip-path": "polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px)",
        },
      })
    },
  ],
}

export default config
```

**Step 2: Update globals.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --register-study-bg: 235 21% 11%;
  --register-battle-bg: 280 25% 14%;
}

body {
  background-color: #09090b;
  color: #fafafa;
  font-family: "Geist", "Satoshi", sans-serif;
  -webkit-font-smoothing: antialiased;
}

.register-study {
  background-color: hsl(var(--register-study-bg));
}

.register-battle {
  background-color: hsl(var(--register-battle-bg));
}
```

**Step 3: Install fonts**
```bash
cd frontend && npm install geist
```

Add to `app/layout.tsx`:
```typescript
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
```

**Step 4: Verify visually**
- Open `http://localhost:3000` — background should be near-black (`#09090b`), font should NOT be Inter
- Add a test div temporarily: `<div className="clipped-corners bg-zen-slate p-ma text-zen-gold">Test</div>`
- Confirm: clipped corners visible, correct colors, 24px padding, Geist font

**Step 5: Remove test div, commit**
```bash
git add frontend/tailwind.config.ts frontend/app/globals.css frontend/app/layout.tsx
git commit -m "feat: design system — Zenkai color tokens, Geist font, clipped-corners utility"
```

---

### Task 2.2: SamuraiButton base component

**Files:**
- Create: `frontend/components/ui/SamuraiButton.tsx`

**Step 1: Write the component**
```typescript
// components/ui/SamuraiButton.tsx
import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "ghost" | "danger"

interface SamuraiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-zen-gold text-zen-void hover:bg-zen-gold/90",
  ghost:   "bg-transparent border border-zen-plasma/40 text-zen-plasma hover:bg-zen-plasma/10",
  danger:  "bg-zen-sakura/20 border border-zen-sakura/50 text-zen-sakura hover:bg-zen-sakura/30",
}

export const SamuraiButton = forwardRef<HTMLButtonElement, SamuraiButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "clipped-corners px-ma py-3 font-heading text-sm font-semibold uppercase tracking-widest transition-all duration-150",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
SamuraiButton.displayName = "SamuraiButton"
```

**Step 2: Verify visually**
- Render `<SamuraiButton>Enter Dōjō</SamuraiButton>` on the home page
- Confirm: clipped corners, correct colors, no border-radius anywhere

**Step 3: Commit**
```bash
git add frontend/components/
git commit -m "feat: SamuraiButton base component — clipped corners, three variants"
```

---

### Task 2.3: Placeholder asset div utility

**Files:**
- Create: `frontend/components/ui/AssetPlaceholder.tsx`

```typescript
interface AssetPlaceholderProps {
  name: string
  width: number
  height: number
}

export function AssetPlaceholder({ name, width, height }: AssetPlaceholderProps) {
  return (
    <div
      className="bg-zen-slate border border-zen-plasma/30 flex items-center justify-center clipped-corners"
      style={{ width, height }}
    >
      <span className="font-heading text-[8px] text-zen-plasma/50 uppercase">[{name}]</span>
    </div>
  )
}
```

**Step 4: Commit**
```bash
git add frontend/components/ui/AssetPlaceholder.tsx
git commit -m "feat: AssetPlaceholder component for missing sprites during development"
```

---

## ✅ CHECKPOINT 2 — Design System

```bash
# Frontend component tests
cd frontend && npm test
# Expected: all tests pass including SamuraiButton and AssetPlaceholder

# Add these component tests before running the checkpoint:
# frontend/tests/SamuraiButton.test.tsx
# frontend/tests/AssetPlaceholder.test.tsx
```

```typescript
// frontend/tests/SamuraiButton.test.tsx
import { render, screen } from "@testing-library/react"
import { SamuraiButton } from "@/components/ui/SamuraiButton"

test("renders with clipped-corners class", () => {
  const { container } = render(<SamuraiButton>Enter</SamuraiButton>)
  expect(container.firstChild).toHaveClass("clipped-corners")
})

test("renders all three variants without error", () => {
  const { rerender } = render(<SamuraiButton variant="primary">X</SamuraiButton>)
  rerender(<SamuraiButton variant="ghost">X</SamuraiButton>)
  rerender(<SamuraiButton variant="danger">X</SamuraiButton>)
})
```

```typescript
// frontend/tests/AssetPlaceholder.test.tsx
import { render, screen } from "@testing-library/react"
import { AssetPlaceholder } from "@/components/ui/AssetPlaceholder"

test("renders asset name as label", () => {
  render(<AssetPlaceholder name="ronin_idle" width={96} height={128} />)
  expect(screen.getByText("[ronin_idle]")).toBeInTheDocument()
})
```

- [ ] `npm test` — all tests PASS
- [ ] Background is `#09090b`, not white or grey
- [ ] Font is Geist — visibly NOT Inter
- [ ] `clipped-corners` produces diagonal corner cuts — NO `border-radius` anywhere
- [ ] `zen-gold`, `zen-plasma`, `zen-sakura` colors render correctly
- [ ] CSS variables `--register-study-bg` and `--register-battle-bg` declared in `:root`
- [ ] `SamuraiButton` renders correctly in all 3 variants
- [ ] `AssetPlaceholder` renders with correct label

**Color palette note:** once the full UI is visible, compare `zen-gold` and `zen-plasma` against the Pinterest samurai reference images. They may need adjustment.

---

## Phase 3 — Content Pipeline

### Task 3.1: KB reader utility

**Files:**
- Create: `backend/pipeline/kb_reader.py`
- Create: `backend/tests/test_kb_reader.py`

**Step 1: Write the test**
```python
# backend/tests/test_kb_reader.py
import pytest
from backend.pipeline.kb_reader import extract_concept_section, compute_section_hash

SAMPLE_KB = """# Prompt Engineering

## Chain-of-Thought Prompting

Chain-of-thought (CoT) prompting involves including intermediate reasoning steps.
It works by showing the model how to think through a problem step by step.

Key finding: MultiArith accuracy went from 17.7% to 78.7% with zero-shot CoT.

## Self-Consistency

Self-consistency samples multiple reasoning paths and takes a majority vote.
"""

def test_extract_concept_section():
    section = extract_concept_section(SAMPLE_KB, "Chain-of-Thought Prompting")
    assert "Chain-of-thought (CoT)" in section
    assert "MultiArith" in section
    assert "Self-Consistency" not in section

def test_extract_missing_section_returns_none():
    section = extract_concept_section(SAMPLE_KB, "Nonexistent Concept")
    assert section is None

def test_compute_section_hash_is_deterministic():
    h1 = compute_section_hash("some content")
    h2 = compute_section_hash("some content")
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex

def test_compute_section_hash_changes_on_edit():
    h1 = compute_section_hash("original content")
    h2 = compute_section_hash("modified content")
    assert h1 != h2
```

**Step 2: Run to verify it fails**
```bash
pytest backend/tests/test_kb_reader.py -v
```
Expected: 4 FAIL — `kb_reader` module doesn't exist yet.

**Step 3: Implement kb_reader.py**
```python
import hashlib
import re
from pathlib import Path
from typing import Optional

def read_kb_doc(kb_path: str, relative_path: str) -> str:
    full_path = Path(kb_path) / relative_path
    if not full_path.exists():
        raise FileNotFoundError(f"KB doc not found: {full_path}")
    return full_path.read_text(encoding="utf-8")

def extract_concept_section(doc_text: str, section_title: str) -> Optional[str]:
    """Extract the text under a ## heading, stopping at the next ## heading."""
    pattern = rf"(## {re.escape(section_title)}\n[\s\S]*?)(?=\n## |\Z)"
    match = re.search(pattern, doc_text)
    return match.group(1).strip() if match else None

def list_concept_sections(doc_text: str) -> list[str]:
    """Return all ## section titles from a KB doc."""
    return re.findall(r"^## (.+)$", doc_text, re.MULTILINE)

def compute_section_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
```

**Step 4: Run tests to verify they pass**
```bash
pytest backend/tests/test_kb_reader.py -v
```
Expected: 4 PASS

**Step 5: Commit**
```bash
git add backend/pipeline/kb_reader.py backend/tests/test_kb_reader.py
git commit -m "feat: KB reader — section extraction and SHA-256 hash utility"
```

---

### Task 3.2: Anthropic API client wrapper

**Files:**
- Create: `backend/pipeline/claude_client.py`
- Create: `backend/tests/test_claude_client.py`

**Step 1: Write the test (uses mocking — no real API calls in tests)**
```python
# backend/tests/test_claude_client.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.pipeline.claude_client import generate_with_claude, SONNET, HAIKU

@pytest.mark.asyncio
async def test_generate_returns_parsed_json():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"title": "CoT", "hook": "Think step by step"}')]
    with patch("backend.pipeline.claude_client.client.messages.create", return_value=mock_response):
        result = await generate_with_claude(
            prompt="Generate concept explanation",
            model=SONNET,
            expected_fields=["title", "hook"]
        )
    assert result["title"] == "CoT"
    assert result["hook"] == "Think step by step"

@pytest.mark.asyncio
async def test_generate_raises_on_missing_fields():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"title": "CoT"}')]  # missing "hook"
    with patch("backend.pipeline.claude_client.client.messages.create", return_value=mock_response):
        with pytest.raises(ValueError, match="missing required fields"):
            await generate_with_claude(
                prompt="Generate",
                model=SONNET,
                expected_fields=["title", "hook"]
            )
```

**Step 2: Run to verify it fails**
```bash
pytest backend/tests/test_claude_client.py -v
```

**Step 3: Implement claude_client.py**
```python
import os
import json
import anthropic
from typing import Any

SONNET = "claude-sonnet-4-6"
HAIKU  = "claude-haiku-4-5-20251001"

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def generate_with_claude(
    prompt: str,
    model: str,
    expected_fields: list[str],
    system: str = "You are a precise JSON generator. Always respond with valid JSON only. No markdown, no explanation, no code blocks."
) -> dict[str, Any]:
    response = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = response.content[0].text.strip()

    # Strip markdown code blocks if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude returned invalid JSON: {e}\nRaw: {raw[:200]}")

    missing = [f for f in expected_fields if f not in data]
    if missing:
        raise ValueError(f"Claude output missing required fields: {missing}\nGot: {list(data.keys())}")

    return data
```

**Step 4: Run tests to verify they pass**
```bash
pytest backend/tests/test_claude_client.py -v
```
Expected: 2 PASS

**Step 5: Commit**
```bash
git add backend/pipeline/claude_client.py backend/tests/test_claude_client.py
git commit -m "feat: Claude API wrapper with JSON validation and field checking"
```

---

### Task 3.3: SM-2 spaced repetition algorithm

**Files:**
- Create: `backend/pipeline/sm2.py`
- Create: `backend/tests/test_sm2.py`

**Step 1: Write the tests first**
```python
# backend/tests/test_sm2.py
import pytest
from backend.pipeline.sm2 import update_schedule, SM2State

def make_state(interval=1.0, ease=2.5, reps=0):
    return SM2State(interval_days=interval, ease_factor=ease, repetitions=reps)

def test_correct_knew_it_increases_interval_and_ease():
    state = make_state(interval=4.0, ease=2.5)
    new = update_schedule(state, correct=True, confidence="knew_it")
    assert new.interval_days == pytest.approx(4.0 * 2.5)
    assert new.ease_factor == pytest.approx(2.6)
    assert new.repetitions == 1

def test_correct_somewhat_sure_increases_interval_keeps_ease():
    state = make_state(interval=4.0, ease=2.5)
    new = update_schedule(state, correct=True, confidence="somewhat_sure")
    assert new.interval_days == pytest.approx(4.0 * 2.5)
    assert new.ease_factor == pytest.approx(2.5)

def test_correct_guessed_reduces_interval_slightly():
    state = make_state(interval=4.0, ease=2.5)
    new = update_schedule(state, correct=True, confidence="guessed")
    assert new.interval_days == pytest.approx(max(1.0, 4.0 * 0.8))
    assert new.repetitions == 1

def test_incorrect_resets_interval_and_reduces_ease():
    state = make_state(interval=10.0, ease=2.5, reps=3)
    new = update_schedule(state, correct=False, confidence="guessed")
    assert new.interval_days == pytest.approx(1.0)
    assert new.ease_factor == pytest.approx(2.3)
    assert new.repetitions == 0

def test_ease_factor_never_drops_below_1_3():
    state = make_state(ease=1.4)
    new = update_schedule(state, correct=False, confidence="guessed")
    assert new.ease_factor >= 1.3

def test_ease_factor_never_exceeds_3_0():
    state = make_state(ease=2.95)
    new = update_schedule(state, correct=True, confidence="knew_it")
    assert new.ease_factor <= 3.0
```

**Step 2: Run to verify they fail**
```bash
pytest backend/tests/test_sm2.py -v
```
Expected: 6 FAIL

**Step 3: Implement sm2.py**
```python
from dataclasses import dataclass

@dataclass
class SM2State:
    interval_days: float
    ease_factor: float
    repetitions: int

def update_schedule(state: SM2State, correct: bool, confidence: str) -> SM2State:
    interval   = state.interval_days
    ease       = state.ease_factor
    reps       = state.repetitions

    if correct:
        if confidence == "knew_it":
            interval = interval * ease
            ease = min(3.0, ease + 0.1)
        elif confidence == "somewhat_sure":
            interval = interval * ease
        elif confidence == "guessed":
            interval = max(1.0, interval * 0.8)
        reps += 1
    else:
        interval = 1.0
        ease = max(1.3, ease - 0.2)
        reps = 0

    return SM2State(interval_days=interval, ease_factor=ease, repetitions=reps)
```

**Step 4: Run tests to verify they pass**
```bash
pytest backend/tests/test_sm2.py -v
```
Expected: 6 PASS

**Step 5: Commit**
```bash
git add backend/pipeline/sm2.py backend/tests/test_sm2.py
git commit -m "feat: SM-2 spaced repetition algorithm with full test coverage"
```

---

### Task 3.4: Content generation prompts (Prompts 1a, 1b, 1c, 1d, 3, 4, 5)

**Files:**
- Create: `backend/pipeline/prompts.py`

```python
# backend/pipeline/prompts.py

def prompt_1a(concept_title: str, kb_section: str, pm_context: str = "") -> str:
    pm_block = f"\n\nPM Context:\n{pm_context}" if pm_context else ""
    return f"""You are generating structured learning content for an AI education app.

Source material:
{kb_section}{pm_block}

Generate a JSON object for the concept "{concept_title}" with this exact structure:
{{
  "title": "concept name",
  "hook": "1-2 sentences on why this matters — what problem it solves or what breaks without it",
  "explanation": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "analogy": "one concrete analogy to a familiar concept, or null if none fits"
}}

Rules:
- explanation array: 2-4 paragraphs, plain English, build from basic to nuanced
- hook must create genuine curiosity — not "this is important because"
- analogy must be concrete and accurate, not vague
- total explanation word count: 150-250 words"""


def prompt_1b(concept_title: str, kb_section: str) -> str:
    return f"""Generate a deep-dive JSON object for the concept "{concept_title}".

Source material:
{kb_section}

Return JSON with this structure:
{{
  "mechanism": ["step 1", "step 2", "step 3"],
  "edge_cases": ["edge case 1", "edge case 2"],
  "key_number": "one specific empirical finding or threshold (e.g., '78.7% vs 17.7% accuracy')",
  "failure_story": "3-4 sentence story of a real or realistic failure caused by misunderstanding this concept"
}}

Rules:
- mechanism: the actual internal steps/logic — not a re-summary of the explanation
- edge_cases: 2-3 specific situations where the normal understanding breaks down
- key_number: must be a real research finding or widely-cited benchmark from the source material
- failure_story: a specific, vivid story — not generic advice"""


def prompt_1c(concept_title: str, kb_section: str) -> str:
    return f"""Generate a prediction question for "{concept_title}" — shown BEFORE the explanation to prime the learner's thinking.

Source material (first 40 lines only):
{kb_section[:2000]}

Return JSON:
{{
  "question": "question text",
  "options": ["A", "B", "C", "D"],
  "correct_index": 0,
  "reveal_explanation": "why the correct answer is right, in 1-2 sentences shown after the full explanation"
}}

Rules:
- The question tests intuition, not memorization — the learner probably can't answer it yet
- Wrong answers should be plausible, not obviously wrong
- Do not spoil the explanation — this appears BEFORE it loads"""


def prompt_1d(concept_title: str, kb_section: str) -> str:
    return f"""Generate a worked annotated example for the concept "{concept_title}".

Source material:
{kb_section}

Return JSON:
{{
  "artifact_type": "prompt | architecture_diagram | code_snippet | comparison",
  "artifact": "the actual example text/content — a real prompt, diagram description, or code",
  "annotations": [
    {{"reference": "exact phrase from artifact", "explanation": "why this part demonstrates the concept"}}
  ]
}}

Rules:
- artifact must be a real, usable example — not a placeholder or generic template
- 2-4 annotations pointing to specific parts of the artifact
- each annotation explains WHY, not just WHAT"""


def prompt_3(concept_title: str, kb_section: str, pm_scenarios: str = "") -> str:
    pm_block = f"\n\nPM scenario context:\n{pm_scenarios}" if pm_scenarios else ""
    return f"""Generate 3 multiple choice quiz questions for "{concept_title}".

Source material:
{kb_section}{pm_block}

Return a JSON array of 3 objects:
[
  {{
    "type": "comprehension | application | tradeoff",
    "question": "question text",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "explanation": "why the correct answer is right and why the most tempting wrong answer is wrong"
  }}
]

Rules:
- one comprehension question, one application question, one tradeoff question
- wrong answers represent real misconceptions, not obviously wrong noise
- application and tradeoff questions are scenario-based: "You are building X and Y happens. What do you do?"
- explanation is part of the learning — make it substantive"""


def prompt_4(concept_title: str, kb_section: str, pm_scenarios: str) -> str:
    return f"""Generate 3 scenario-based quiz questions for "{concept_title}" from an AI PM perspective.

Source material:
{kb_section}

PM scenario context:
{pm_scenarios}

Return a JSON array of 3 objects:
[
  {{
    "type": "scenario",
    "scenario_type": "system_design | production_failure | risk_communication",
    "scenario": "2-3 sentence situation description",
    "question": "what do you do / what's the problem / how do you respond",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "explanation": "what the correct choice reveals about understanding this concept"
  }}
]

Rules:
- one of each scenario_type
- all options must be plausible PM responses — no obviously wrong answers
- scenario must name real stakes (launch decision, incident response, exec presentation)"""


def prompt_5(module_title: str, concepts_summary: str) -> str:
    return f"""Generate a cheatsheet for the module "{module_title}".

Concepts covered:
{concepts_summary}

Return JSON:
{{
  "module": "module title",
  "key_concepts": [
    {{"term": "concept name", "one_liner": "10-15 word definition", "remember": "the one thing to never forget"}}
  ],
  "mental_model": "1 sentence that ties all concepts together",
  "watch_out_for": ["common mistake 1", "common mistake 2", "common mistake 3"]
}}"""
```

**Step 5: Commit**
```bash
git add backend/pipeline/prompts.py
git commit -m "feat: all content generation prompts (1a, 1b, 1c, 1d, 3, 4, 5)"
```

---

### Task 3.5: Pipeline orchestrator with delta detection

**Files:**
- Create: `backend/pipeline/orchestrator.py`
- Create: `backend/tests/test_orchestrator.py`

**Step 1: Write the test**
```python
# backend/tests/test_orchestrator.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.pipeline.orchestrator import should_regenerate_concept

def test_should_regenerate_when_no_hash():
    assert should_regenerate_concept(stored_hash=None, current_hash="abc123") is True

def test_should_not_regenerate_when_hash_matches():
    assert should_regenerate_concept(stored_hash="abc123", current_hash="abc123") is False

def test_should_regenerate_when_hash_changed():
    assert should_regenerate_concept(stored_hash="old123", current_hash="new456") is True
```

**Step 2: Implement orchestrator.py**
```python
import os
import logging
from typing import Optional
from backend.pipeline.kb_reader import read_kb_doc, extract_concept_section, list_concept_sections, compute_section_hash
from backend.pipeline.claude_client import generate_with_claude, SONNET, HAIKU
from backend.pipeline.prompts import prompt_1a, prompt_1b, prompt_1c, prompt_1d, prompt_3, prompt_4, prompt_5
from backend.database import get_db
import json

logger = logging.getLogger(__name__)

def should_regenerate_concept(stored_hash: Optional[str], current_hash: str) -> bool:
    return stored_hash is None or stored_hash != current_hash

async def run_pipeline_for_module(module_id: int, kb_path: str) -> dict:
    """Run content generation for all concepts in a module. Returns a status report."""
    db = await get_db()
    results = {"module_id": module_id, "generated": [], "skipped": [], "failed": []}

    try:
        async with db.execute("SELECT * FROM modules WHERE id=?", (module_id,)) as cursor:
            module = await cursor.fetchone()
        if not module:
            raise ValueError(f"Module {module_id} not found")

        kb_source = module["kb_source_path"]
        if not kb_source:
            logger.info(f"Module {module_id} has no KB source — skipping pipeline")
            return results

        doc_text = read_kb_doc(kb_path, kb_source)
        concept_titles = list_concept_sections(doc_text)

        for order_idx, title in enumerate(concept_titles):
            section = extract_concept_section(doc_text, title)
            if not section:
                continue

            current_hash = compute_section_hash(section)

            async with db.execute(
                "SELECT id, content_hash FROM concepts WHERE module_id=? AND title=?",
                (module_id, title)
            ) as cursor:
                existing = await cursor.fetchone()

            if existing and not should_regenerate_concept(existing["content_hash"], current_hash):
                results["skipped"].append(title)
                continue

            try:
                default_layer = await generate_with_claude(
                    prompt_1a(title, section),
                    model=SONNET,
                    expected_fields=["title", "hook", "explanation", "analogy"]
                )
                deep_layer = await generate_with_claude(
                    prompt_1b(title, section),
                    model=SONNET,
                    expected_fields=["mechanism", "edge_cases", "key_number", "failure_story"]
                )
                prediction = await generate_with_claude(
                    prompt_1c(title, section),
                    model=HAIKU,
                    expected_fields=["question", "options", "correct_index", "reveal_explanation"]
                )
                worked_example = await generate_with_claude(
                    prompt_1d(title, section),
                    model=SONNET,
                    expected_fields=["artifact_type", "artifact", "annotations"]
                )

                if existing:
                    await db.execute(
                        """UPDATE concepts SET default_layer=?, deep_layer=?, prediction_question=?,
                        worked_example=?, content_hash=?, generated_at=CURRENT_TIMESTAMP
                        WHERE id=?""",
                        (json.dumps(default_layer), json.dumps(deep_layer),
                         json.dumps(prediction), json.dumps(worked_example),
                         current_hash, existing["id"])
                    )
                else:
                    await db.execute(
                        """INSERT INTO concepts
                        (module_id, order_index, title, default_layer, deep_layer,
                        prediction_question, worked_example, content_hash)
                        VALUES (?,?,?,?,?,?,?,?)""",
                        (module_id, order_idx, title, json.dumps(default_layer),
                         json.dumps(deep_layer), json.dumps(prediction),
                         json.dumps(worked_example), current_hash)
                    )

                await db.commit()
                results["generated"].append(title)
                logger.info(f"Generated: {title}")

            except Exception as e:
                results["failed"].append({"title": title, "error": str(e)})
                logger.error(f"Failed to generate {title}: {e}")

    finally:
        await db.close()

    return results
```

**Step 3: Run tests**
```bash
pytest backend/tests/test_orchestrator.py -v
```
Expected: 3 PASS

**Step 4: Commit**
```bash
git add backend/pipeline/orchestrator.py backend/tests/test_orchestrator.py
git commit -m "feat: pipeline orchestrator with delta detection and per-concept generation"
```

---

## ✅ CHECKPOINT 3 — Content Pipeline

```bash
# Full backend test suite — must include all pipeline unit tests
cd backend && pytest tests/ -v --tb=short
# Expected: ALL tests pass (smoke + database + kb_reader + claude_client + sm2 + orchestrator)

# Run pipeline on Module 1 manually
python -c "
import asyncio
from dotenv import load_dotenv
load_dotenv()
from pipeline.orchestrator import run_pipeline_for_module
import os
result = asyncio.run(run_pipeline_for_module(2, os.getenv('KB_PATH')))
print(result)
"

# Inspect results in SQLite
sqlite3 zenkai.db "SELECT title, length(default_layer) as dl_len, content_hash FROM concepts WHERE module_id=2;"

# Verify delta detection — re-run pipeline, confirm all skipped
python -c "
import asyncio
from dotenv import load_dotenv
load_dotenv()
from pipeline.orchestrator import run_pipeline_for_module
import os
result = asyncio.run(run_pipeline_for_module(2, os.getenv('KB_PATH')))
print('skipped:', len(result['skipped']), 'generated:', len(result['generated']))
"
```

- [ ] `pytest tests/` — all PASS (minimum 10 tests at this point)
- [ ] At least 5 concepts generated for Module 1
- [ ] `default_layer` has valid JSON (length > 100) for every concept
- [ ] `content_hash` populated for every concept
- [ ] Re-run shows `generated: 0`, `skipped: N` — delta detection working
- [ ] `pipeline_log` table has entries for the run: `sqlite3 zenkai.db "SELECT * FROM pipeline_log LIMIT 5;"`

---

## Phase 4 — Backend API

### Task 4.1: Modules router

**Files:**
- Create: `backend/routers/modules.py`

```python
from fastapi import APIRouter, HTTPException
from backend.database import get_db

router = APIRouter(prefix="/modules", tags=["modules"])

@router.get("")
async def list_modules():
    db = await get_db()
    try:
        async with db.execute(
            "SELECT id, order_index, title, is_unlocked, quiz_score_achieved FROM modules ORDER BY order_index"
        ) as cursor:
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()

@router.get("/{module_id}")
async def get_module(module_id: int):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM modules WHERE id=?", (module_id,)) as cursor:
            module = await cursor.fetchone()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        async with db.execute(
            "SELECT id, order_index, title FROM concepts WHERE module_id=? ORDER BY order_index",
            (module_id,)
        ) as cursor:
            concepts = await cursor.fetchall()
        result = dict(module)
        result["concepts"] = [dict(c) for c in concepts]
        return result
    finally:
        await db.close()
```

Register in `main.py`:
```python
from backend.routers import modules
app.include_router(modules.router)
```

**Verify:**
```bash
http GET http://localhost:8000/modules
```
Expected: JSON array of 10 modules.

**Commit:**
```bash
git add backend/routers/modules.py backend/main.py
git commit -m "feat: GET /modules and GET /modules/{id} endpoints"
```

---

### Task 4.2: Concepts, Quiz, Progress, Character, Sessions routers

Follow the same pattern as Task 4.1. Each router file in `backend/routers/`.

**concepts.py** — `GET /concepts/{id}` returns full concept JSON including all layers.

**quiz.py** — `GET /concepts/{id}/quiz` returns all quiz questions for a concept.

**progress.py:**
- `POST /progress` — record answer + confidence, update `user_progress`, trigger SM-2 update to `review_schedule`
- `GET /progress/review-queue` — return concepts where `next_review_at <= NOW`

**character.py** — `GET /character` returns `character_form`, `total_xp`, `current_streak`, equipment list.

**sessions.py:**
- `POST /sessions/start` — create session row, return `session_id`
- `PATCH /sessions/{id}` — increment counters
- `POST /sessions/{id}/end` — set `ended_at`, update streak

**pipeline.py:**
- `POST /pipeline/sync` — trigger `run_pipeline_for_module` for specified module
- `GET /pipeline/status` — return generation status per module

**Commit after each router:**
```bash
git commit -m "feat: [router name] router"
```

---

## ✅ CHECKPOINT 4 — Backend API

Add integration tests for every router before running the checkpoint:

```python
# backend/tests/test_api_modules.py
async def test_list_modules_returns_10(client):
    r = await client.get("/modules")
    assert r.status_code == 200
    assert len(r.json()) == 10

async def test_module_0_is_unlocked(client):
    r = await client.get("/modules")
    module_0 = next(m for m in r.json() if m["order_index"] == 0)
    assert module_0["is_unlocked"] is True

async def test_module_not_found_returns_404(client):
    r = await client.get("/modules/9999")
    assert r.status_code == 404

async def test_module_detail_includes_concepts(client):
    r = await client.get("/modules/1")
    assert r.status_code == 200
    assert "concepts" in r.json()
```

```python
# backend/tests/test_api_progress.py
async def test_post_progress_updates_review_schedule(client):
    # Requires a concept to exist — seed one first
    r = await client.post("/progress", json={
        "user_id": 1,
        "concept_id": 1,
        "answered_correctly": True,
        "confidence": "knew_it",
        "time_spent_ms": 4200
    })
    assert r.status_code == 200
    data = r.json()
    assert "next_review_at" in data
    assert data["interval_days"] > 1.0  # SM-2 increased the interval
```

```bash
cd backend && pytest tests/ -v --cov=. --cov-report=term-missing
# Expected: ALL tests pass — minimum 18 tests at this point
```

- [ ] `pytest tests/` — all PASS, 0 FAIL
- [ ] `GET /modules` returns 10 modules
- [ ] `GET /modules/1` includes `"concepts"` array
- [ ] `GET /modules/9999` returns 404
- [ ] `POST /progress` returns updated SM-2 state with `next_review_at`
- [ ] `GET /progress/review-queue` returns valid array (empty is fine at this stage)

---

## Phase 5 — Core Learning UI

### Task 5.1: API client + React Query setup

**Files:**
- Create: `frontend/lib/api.ts`
- Create: `frontend/lib/queryKeys.ts`
- Create: `frontend/providers/QueryProvider.tsx`

```typescript
// lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  getModules:   () => apiFetch<Module[]>("/modules"),
  getModule:    (id: number) => apiFetch<ModuleDetail>(`/modules/${id}`),
  getConcept:   (id: number) => apiFetch<Concept>(`/concepts/${id}`),
  getQuiz:      (id: number) => apiFetch<QuizQuestion[]>(`/concepts/${id}/quiz`),
  getCharacter: () => apiFetch<Character>("/character"),
  postProgress: (body: ProgressPayload) => apiFetch("/progress", { method: "POST", body: JSON.stringify(body) }),
}
```

**Commit:**
```bash
git commit -m "feat: API client and React Query setup"
```

---

### Task 5.2: ConceptCard component

**Files:**
- Create: `frontend/components/learn/ConceptCard.tsx`

This is the core learning component. Build it exactly to spec from the design doc:
- Default layer: hook + explanation paragraphs + analogy
- "Go Deeper" button triggers `AnimatePresence` height animation revealing deep layer
- Button copy toggles: "Go Deeper" ↔ "Close Scroll"
- Left border accent in `zen-plasma`
- All text in `clipped-corners` containers

**Commit:**
```bash
git commit -m "feat: ConceptCard with dual-layer AnimatePresence reveal"
```

---

### Task 5.3: PredictionQuestion, WorkedExample, ConfidenceChips components

Build each component to spec from the design doc section "Component Decisions":
- `PredictionQuestion` — shown before concept loads, revealed after explanation
- `WorkedExample` — artifact frame with floating annotation markers, speech bubble on click
- `ConfidenceChips` — candle/flame/fire icons (not text labels), three states

**Commit each separately.**

---

### Task 5.4: Learn page

**Files:**
- Create: `frontend/app/learn/[moduleId]/[conceptId]/page.tsx`

Sequence: PredictionQuestion → ConceptCard → WorkedExample → next concept button → ConfidenceChips

**Commit:**
```bash
git commit -m "feat: learn page — full concept reading flow with all components"
```

---

## ✅ CHECKPOINT 5 — Core Learning UI

Add component tests before running the checkpoint:

```typescript
// frontend/tests/ConceptCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { ConceptCard } from "@/components/learn/ConceptCard"

const mockDefault = { title: "Chain-of-Thought", hook: "Think before answering.", explanation: ["CoT works by..."], analogy: "Like showing your work in math." }
const mockDeep = { mechanism: ["Step 1", "Step 2"], edge_cases: ["Short prompts"], key_number: "78.7% accuracy", failure_story: "GPT-3 failed when..." }

test("renders hook text", () => {
  render(<ConceptCard defaultLayer={mockDefault} deepLayer={mockDeep} />)
  expect(screen.getByText("Think before answering.")).toBeInTheDocument()
})

test("deep layer hidden by default", () => {
  render(<ConceptCard defaultLayer={mockDefault} deepLayer={mockDeep} />)
  expect(screen.queryByText("78.7% accuracy")).not.toBeInTheDocument()
})

test("Go Deeper reveals deep layer", () => {
  render(<ConceptCard defaultLayer={mockDefault} deepLayer={mockDeep} />)
  fireEvent.click(screen.getByText("Go Deeper"))
  expect(screen.getByText("78.7% accuracy")).toBeInTheDocument()
})
```

```typescript
// frontend/tests/ConfidenceChips.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { ConfidenceChips } from "@/components/learn/ConfidenceChips"

test("renders all three confidence options", () => {
  render(<ConfidenceChips onSelect={vi.fn()} />)
  expect(screen.getByTestId("confidence-guessed")).toBeInTheDocument()
  expect(screen.getByTestId("confidence-somewhat-sure")).toBeInTheDocument()
  expect(screen.getByTestId("confidence-knew-it")).toBeInTheDocument()
})

test("calls onSelect with correct value", () => {
  const onSelect = vi.fn()
  render(<ConfidenceChips onSelect={onSelect} />)
  fireEvent.click(screen.getByTestId("confidence-knew-it"))
  expect(onSelect).toHaveBeenCalledWith("knew_it")
})
```

```bash
cd frontend && npm test
# Expected: all component tests PASS
```

- [ ] `npm test` — all PASS including ConceptCard and ConfidenceChips tests
- [ ] `/learn/1/1` renders: prediction question → concept card → worked example
- [ ] "Go Deeper" animates open smoothly
- [ ] Confidence chips show icons (candle/flame/fire) — NOT plain text labels
- [ ] `POST /progress` called on confidence selection, returns 200
- [ ] Zero `border-radius` anywhere — all clipped corners
- [ ] Background is cool study register tone

---

## Phase 6 — Quiz Battle

### Task 6.1: QuizCard, StreakBar, quiz flow

**Files:**
- Create: `frontend/components/quiz/QuizCard.tsx`
- Create: `frontend/components/quiz/StreakBar.tsx`
- Create: `frontend/app/quiz/[moduleId]/page.tsx`

Build to spec:
- Full Pokémon battle layout — question at top, 4 move cards at bottom
- `StreakBar` is CSS-only — 10 segments, fills crimson → plasma as streak grows
- Correct answer: teal glow. Wrong answer: screen shake + red dim
- After answer: confidence chips appear
- Framer Motion transitions between questions

**Register switch:** Quiz page uses `register-battle` background — warm purple tone.

**Commit:**
```bash
git commit -m "feat: quiz battle screen — Pokémon layout, streak bar, confidence chips"
```

---

## ✅ CHECKPOINT 6 — Quiz Battle

```typescript
// frontend/tests/QuizCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { QuizCard } from "@/components/quiz/QuizCard"

const mockQuestion = {
  question: "What does CoT improve?",
  options: ["Speed", "Accuracy", "Cost", "Latency"],
  correct_index: 1,
  explanation: "CoT improves accuracy by forcing step-by-step reasoning."
}

test("renders question and 4 options", () => {
  render(<QuizCard question={mockQuestion} onAnswer={vi.fn()} />)
  expect(screen.getByText("What does CoT improve?")).toBeInTheDocument()
  expect(screen.getAllByRole("button")).toHaveLength(4)
})

test("selecting an option calls onAnswer", () => {
  const onAnswer = vi.fn()
  render(<QuizCard question={mockQuestion} onAnswer={onAnswer} />)
  fireEvent.click(screen.getByText("Accuracy"))
  expect(onAnswer).toHaveBeenCalledWith(1)
})
```

```typescript
// frontend/tests/StreakBar.test.tsx
import { render, screen } from "@testing-library/react"
import { StreakBar } from "@/components/quiz/StreakBar"

test("renders 10 segments", () => {
  const { container } = render(<StreakBar streak={5} />)
  expect(container.querySelectorAll('[data-testid="streak-segment"]')).toHaveLength(10)
})

test("fills correct number of segments", () => {
  const { container } = render(<StreakBar streak={3} />)
  const filled = container.querySelectorAll('[data-testid="streak-segment"][data-filled="true"]')
  expect(filled).toHaveLength(3)
})
```

```bash
cd frontend && npm test
# Expected: QuizCard and StreakBar tests PASS
```

- [ ] `npm test` — all PASS
- [ ] Background visibly warm (battle register) on quiz page vs. cool (study register) on learn page
- [ ] 4 move cards render, selecting one highlights before reveal
- [ ] Correct: teal glow. Wrong: screen shake + red dim.
- [ ] Confidence chips appear after every answer
- [ ] `POST /progress` called with correct payload
- [ ] StreakBar is pure CSS — 10 segments, no image asset

---

## Phase 7 — World Map + Character

### Task 7.1: World map page

**Files:**
- Create: `frontend/app/world-map/page.tsx`

Build with `AssetPlaceholder` components for all sprites. Module nodes on the path, fog overlay for locked modules, golden Z seal for completed modules.

**Module gating:** Module unlocks when `quiz_score_achieved >= 0.7` on the previous module. Display lock icon on locked nodes.

---

### Task 7.2: Character sheet

**Files:**
- Create: `frontend/app/character-sheet/page.tsx`

Current form displayed large (use `AssetPlaceholder` for sprite). Evolution timeline showing all 4 forms. Equipment list from `character_equipment` table.

**Character form thresholds:**
- Ronin: default
- Warrior: Module 3 complete (≥70%)
- Samurai: Module 6 complete
- Ghost/Zenkai: Module 9 complete

---

## ✅ CHECKPOINT 7 — Navigation + Progression

```python
# backend/tests/test_progression.py
async def test_module_unlocks_at_70_percent(client):
    # Simulate completing module 0 quiz at 70%
    r = await client.post("/modules/1/complete-quiz", json={"score": 0.70, "user_id": 1})
    assert r.status_code == 200
    # Module 1 should now be unlocked
    r2 = await client.get("/modules/2")
    assert r2.json()["is_unlocked"] is True

async def test_module_does_not_unlock_below_70(client):
    r = await client.post("/modules/1/complete-quiz", json={"score": 0.69, "user_id": 1})
    r2 = await client.get("/modules/2")
    assert r2.json()["is_unlocked"] is False

async def test_character_form_updates_at_module_3(client):
    # Complete modules 0-3 at ≥70%
    for mod_id in range(1, 4):
        await client.post(f"/modules/{mod_id}/complete-quiz", json={"score": 0.8, "user_id": 1})
    r = await client.get("/character")
    assert r.json()["character_form"] == 2  # Warrior
```

```bash
cd backend && pytest tests/test_progression.py -v
cd frontend && npm test
```

- [ ] `pytest tests/test_progression.py` — all PASS
- [ ] World map renders 10 module nodes in correct order with correct titles
- [ ] Locked modules show fog or lock
- [ ] Module 0 is unlocked by default
- [ ] Completing quiz at ≥70% unlocks next module
- [ ] Character sheet shows correct form at correct thresholds (Warrior after Module 3, Samurai after 6, Ghost after 9)
- [ ] Navigation: world map → module → quiz → back all work without errors

---

## Phase 8 — Spaced Repetition UI

### Task 8.1: Review queue page

**Files:**
- Create: `frontend/app/review/page.tsx`

Fetches `GET /progress/review-queue` and presents due concepts as quiz questions. On completion, posts progress with updated confidence. SM-2 runs on the backend and updates `next_review_at`.

---

## ✅ CHECKPOINT 8 — Spaced Repetition

```python
# backend/tests/test_review_queue.py
from datetime import datetime, timedelta
import aiosqlite

async def test_review_queue_returns_due_items(client, test_db):
    # Seed a review item due in the past
    async with aiosqlite.connect(test_db) as db:
        await db.execute("""
            INSERT INTO review_schedule (user_id, concept_id, next_review_at, interval_days, ease_factor, repetitions)
            VALUES (1, 1, ?, 1.0, 2.5, 1)
        """, (datetime.now() - timedelta(hours=1),))
        await db.commit()
    r = await client.get("/progress/review-queue?user_id=1")
    assert r.status_code == 200
    assert len(r.json()) >= 1

async def test_review_queue_excludes_future_items(client, test_db):
    async with aiosqlite.connect(test_db) as db:
        await db.execute("""
            INSERT INTO review_schedule (user_id, concept_id, next_review_at, interval_days, ease_factor, repetitions)
            VALUES (1, 2, ?, 10.0, 2.5, 5)
        """, (datetime.now() + timedelta(days=5),))
        await db.commit()
    r = await client.get("/progress/review-queue?user_id=1")
    future_items = [i for i in r.json() if i["concept_id"] == 2]
    assert len(future_items) == 0

async def test_guessed_correct_sets_short_interval(client):
    r = await client.post("/progress", json={
        "user_id": 1, "concept_id": 1,
        "answered_correctly": True, "confidence": "guessed"
    })
    assert r.json()["interval_days"] <= 4.0  # Trust a guess less

async def test_knew_it_correct_grows_interval(client):
    # First answer sets interval, second should grow it
    await client.post("/progress", json={
        "user_id": 1, "concept_id": 1,
        "answered_correctly": True, "confidence": "knew_it"
    })
    r = await client.post("/progress", json={
        "user_id": 1, "concept_id": 1,
        "answered_correctly": True, "confidence": "knew_it"
    })
    assert r.json()["interval_days"] > 2.5
```

```bash
cd backend && pytest tests/ -v
# Expected: ALL tests pass including SM-2 unit tests AND review queue integration tests
```

- [ ] `pytest tests/` — all PASS
- [ ] Review queue only returns items where `next_review_at <= NOW`
- [ ] "Guessed" correct answer produces shorter interval than "Knew it"
- [ ] Wrong answer resets interval to 1.0 and reduces `ease_factor`
- [ ] SM-2 state persists — visible in SQLite after restart

---

## Phase 9 — Polish + Assets

### Task 9.1: PixelLab MCP test sprite

```bash
# Ensure .mcp.json is configured with PIXELLAB_API_KEY
# Via Claude Code, invoke the asset-tracker agent:
# @asset-tracker generate ronin_idle — Form 1, idle pose, transparent background, 96x128px
```

**Aesthetic gate:** Compare result to Ghost of Tsushima pixel art quality. If it's lo-fi or flat, use the Midjourney fallback prompt from `asset-tracker-agent.md`. **Do not proceed with batch generation until the test sprite passes the quality bar.**

---

### Task 9.2: Framer Motion polish pass

Wire remaining transitions:
- Module unlock animation (flash + text reveal)
- Character evolution (full-screen silhouette transform)
- World map avatar walk animation
- Spec exercise particle effect on submission

---

## ✅ CHECKPOINT 9 — Final

**Verify before declaring done:**
- [ ] Full learning flow works: module select → concept read → quiz → confidence → review queue
- [ ] At least one character evolution triggers correctly at the right module threshold
- [ ] PixelLab test sprite meets quality bar OR Midjourney fallback used and placeholder replaced
- [ ] `pytest backend/tests/ -v` — all tests pass
- [ ] `docker compose up` — both services start cleanly
- [ ] No `border-radius` anywhere in the app
- [ ] No hardcoded paths or API keys in source code
- [ ] `.env` is NOT tracked by git
- [ ] `pipeline_log` table has entries for every generation run

---

## ✅ CHECKPOINT 9 — Polish + Assets

```bash
# Full test suite — everything must be green before declaring done
cd backend && pytest tests/ -v --cov=. --cov-report=term-missing
cd ../frontend && npm test -- --coverage
```

- [ ] Backend: `pytest` — all PASS, coverage ≥ 70% on `pipeline/` and `routers/`
- [ ] Frontend: `vitest` — all PASS
- [ ] PixelLab test sprite (ronin_idle) evaluated — meets Ghost of Tsushima quality bar OR Midjourney fallback used
- [ ] At least one sprite replaced from placeholder div to real asset in manifest
- [ ] Framer Motion transitions wired: concept reveal, quiz transition, character evolution
- [ ] FORGE SPEC particle effect fires on spec exercise submission

---

## Phase E2E — Final Acceptance

Run the 3 critical flow tests written in Phase 0. These were failing then — they must pass now.

```bash
# Both services must be running
cd /Users/t-rawww/zenkai
npx playwright test e2e/critical-flows.spec.ts --reporter=list
```

Expected output:
```
✓ learn flow — read a concept end-to-end
✓ quiz flow — answer a question with confidence rating
✓ review flow — due items surface and update schedule

3 passed
```

**If all 3 pass, Zenkai is built.**

If any fail, use Playwright's trace viewer to diagnose:
```bash
npx playwright test e2e/critical-flows.spec.ts --trace on
npx playwright show-trace test-results/*/trace.zip
```

### Final commit
```bash
cd /Users/t-rawww/zenkai
git add .
git commit -m "feat: Zenkai complete — all 3 E2E flows passing"
git push origin main
```

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-03-01-zenkai-implementation.md`.**

**Option 1 — Subagent-Driven (this session)**
Dispatch one subagent per task, review between tasks. Fast iteration, tight feedback loop.

**Option 2 — Parallel Session (separate)**
Open a new session with `superpowers:executing-plans`. Batch execution with checkpoint reviews between phases.

**Recommendation:** Use Option 2. Each phase is self-contained enough that a fresh session per phase is cleaner than one long session. Open the zenkai repo in a new Claude Code session, point it to this plan, and execute phase by phase.
