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
| 1 | Project scaffold + DB schema | Both services run, DB created with all 10 tables |
| 2 | Design system | App renders with correct aesthetic — clipped corners, correct colors, no Inter |
| 3 | Content pipeline | Run pipeline on Module 1, verify all content in SQLite |
| 4 | Backend API | All routes return correct data, test with httpie |
| 5 | Core learning UI | Full concept reading flow works end-to-end |
| 6 | Quiz battle | Quiz flow works, answers and confidence submit to backend |
| 7 | World map + character | All screens navigate correctly, progression gates work |
| 8 | Spaced repetition | Review queue surfaces correctly-scheduled items |
| 9 | Polish + assets | PixelLab test sprite evaluated, Framer Motion transitions wired |

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

**Verify before proceeding:**
- [ ] `npm run dev` in `frontend/` starts Next.js on port 3000
- [ ] `uvicorn main:app --reload` in `backend/` starts FastAPI on port 8000
- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `pytest tests/test_database.py` — 2 tests pass
- [ ] `zenkai.db` is created on backend startup with all 11 tables
- [ ] Module 0 row has `is_unlocked = 1`
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

**Verify before proceeding:**
- [ ] Background is `#09090b`, not white or grey
- [ ] Font is Geist — visibly NOT Inter (compare: Geist has more character width, rounder glyphs)
- [ ] `clipped-corners` utility produces diagonal cuts on corners — NO border-radius
- [ ] `zen-gold`, `zen-plasma`, `zen-sakura` colors render correctly
- [ ] CSS variables `--register-study-bg` and `--register-battle-bg` are declared in `:root`
- [ ] `SamuraiButton` renders with clipped corners in all 3 variants
- [ ] `AssetPlaceholder` renders with correct label and dimensions

Do not proceed until all 7 items check out. **Color palette note:** once the full UI is visible, compare `zen-gold` and `zen-plasma` against the Pinterest samurai reference images. They may need adjustment.

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

**Verify before proceeding:**

1. Set `KB_PATH` in your `.env` to the local AI-Knowledgebase path
2. Run the pipeline manually:
```bash
cd backend
python -c "
import asyncio
from dotenv import load_dotenv
load_dotenv()
from pipeline.orchestrator import run_pipeline_for_module
import os
result = asyncio.run(run_pipeline_for_module(2, os.getenv('KB_PATH')))
print(result)
"
```
Expected: All concepts in Module 1 (Prompt Engineering) generated. Check SQLite:
```bash
sqlite3 zenkai.db "SELECT title, length(default_layer) as dl_len FROM concepts WHERE module_id=2;"
```
- [ ] At least 5 concepts generated
- [ ] `default_layer` column has valid JSON (length > 100 per concept)
- [ ] `content_hash` populated for each concept
- [ ] Re-running pipeline shows all concepts in `skipped` (delta detection working)
- [ ] All 6 pipeline tests pass: `pytest backend/tests/ -v`

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

**Verify before proceeding:**

```bash
# Test all key endpoints
http GET http://localhost:8000/modules
http GET http://localhost:8000/modules/1
http GET http://localhost:8000/concepts/1
http GET http://localhost:8000/concepts/1/quiz
http GET http://localhost:8000/character
http POST http://localhost:8000/sessions/start
```

- [ ] All endpoints return 200 with valid JSON
- [ ] 404 returns properly formatted error for unknown IDs
- [ ] `GET /modules` returns all 10 modules
- [ ] `GET /concepts/1` includes all four JSON fields (default_layer, deep_layer, prediction_question, worked_example)
- [ ] `POST /progress` correctly updates `review_schedule` with new SM-2 values

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

**Verify before proceeding:**
- [ ] Navigate to `/learn/1/1` — renders prediction question, then concept card, then worked example
- [ ] "Go Deeper" animates open smoothly (no snap/jump)
- [ ] Confidence chips submit to backend and return 200
- [ ] Confidence chips show candle/flame/fire icons — NOT text labels
- [ ] Zero border-radius anywhere on screen — all clipped corners
- [ ] Background is study register (`--register-study-bg`) — cool blue-grey tone

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

**Verify before proceeding:**
- [ ] Background visibly shifts from cool (study) to warm (battle) when entering quiz
- [ ] 4 move cards render, selecting one highlights before reveal
- [ ] Correct answer triggers teal glow, wrong answer triggers screen shake
- [ ] Confidence chips appear after every answer
- [ ] `POST /progress` called with correct `answered_correctly` and `confidence` values
- [ ] StreakBar is pure CSS — no image asset required

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

**Verify before proceeding:**
- [ ] World map renders 10 module nodes in correct order
- [ ] Locked modules show fog overlay or lock icon
- [ ] Module 0 is unlocked by default
- [ ] Completing a module quiz at ≥70% unlocks the next module
- [ ] Character sheet shows correct form based on module completion
- [ ] Navigation between world map → module → quiz → back works without errors

---

## Phase 8 — Spaced Repetition UI

### Task 8.1: Review queue page

**Files:**
- Create: `frontend/app/review/page.tsx`

Fetches `GET /progress/review-queue` and presents due concepts as quiz questions. On completion, posts progress with updated confidence. SM-2 runs on the backend and updates `next_review_at`.

---

## ✅ CHECKPOINT 8 — Spaced Repetition

**Verify before proceeding:**
- [ ] Answer a concept with "Guessed" — verify `next_review_at` is set to ~tomorrow
- [ ] Answer same concept with "Knew it" — verify `next_review_at` jumps further out
- [ ] Answer incorrectly — verify interval resets to 1 day and `ease_factor` decreases
- [ ] Review queue page shows only concepts due today or earlier
- [ ] SM-2 state updates persist across app restarts

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

## Execution Options

**Plan complete and saved to `docs/plans/2026-03-01-zenkai-implementation.md`.**

**Option 1 — Subagent-Driven (this session)**
Dispatch one subagent per task, review between tasks. Fast iteration, tight feedback loop.

**Option 2 — Parallel Session (separate)**
Open a new session with `superpowers:executing-plans`. Batch execution with checkpoint reviews between phases.

**Recommendation:** Use Option 2. Each phase is self-contained enough that a fresh session per phase is cleaner than one long session. Open the zenkai repo in a new Claude Code session, point it to this plan, and execute phase by phase.
