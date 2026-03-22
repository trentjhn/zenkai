# Content Pipeline + Module Unlock Gating Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix KB source paths in the DB, add directory-mode support for Module 10 (Playbooks), run the content pipeline for Modules 3–9, and implement module unlock gating (≥70% quiz score unlocks the next module) with frontend UI on the completion page.

**Architecture:** The backend handles all unlock logic — a new `POST /modules/{id}/complete` endpoint aggregates `user_progress` per module to compute a score, writes `quiz_score_achieved`, and unlocks the next module if score ≥ 0.7. The completion page fires this mutation on mount and shows the result. Module 10 needs a directory-reader in `kb_reader.py` since its concepts are individual `.md` files rather than `##` sections within one doc.

**Tech Stack:** FastAPI + aiosqlite (backend), Next.js 14 App Router + React Query useMutation (frontend), pytest + httpx AsyncClient (backend tests), Vitest + Testing Library (frontend tests).

---

## Context You Must Understand First

### KB Path Mismatch (Root Cause)
All `kb_source_path` values in the `modules` table are missing their subdirectory prefix. The fix is a SQL migration.

| Module | Current (broken) | Correct |
|--------|-----------------|---------|
| 2 | `prompt-engineering/prompt-engineering.md` | `LEARNING/FOUNDATIONS/prompt-engineering/prompt-engineering.md` |
| 3 | `context-engineering/context-engineering.md` | `LEARNING/FOUNDATIONS/context-engineering/context-engineering.md` |
| 4 | `reasoning-llms/reasoning-llms.md` | `LEARNING/FOUNDATIONS/reasoning-llms/reasoning-llms.md` |
| 5 | `agentic-engineering/agentic-engineering.md` | `LEARNING/AGENTS_AND_SYSTEMS/agentic-engineering/agentic-engineering.md` |
| 6 | `skills/skills.md` | `LEARNING/AGENTS_AND_SYSTEMS/skills/skills.md` |
| 7 | `evaluation/evaluation.md` | `LEARNING/PRODUCTION/evaluation/evaluation.md` |
| 8 | `fine-tuning/fine-tuning.md` | `LEARNING/PRODUCTION/fine-tuning/fine-tuning.md` |
| 9 | `ai-security/ai-security.md` | `LEARNING/PRODUCTION/ai-security/ai-security.md` |
| 10 | `playbooks/` | `future-reference/playbooks/` |

`KB_PATH` is `/Users/t-rawww/AI-Knowledgebase/` — `kb_reader.py` does `Path(kb_path) / relative_path`.

### Module 10 is a Directory
`future-reference/playbooks/` contains 10 individual `.md` files (one per playbook topic). The existing pipeline parses `## ` headings within a single file. For Module 10, each `.md` file is itself a concept. We need a directory-aware mode in `kb_reader.py` and `orchestrator.py`.

### Unlock Logic
- `modules.quiz_score_achieved` stores 0.0–1.0 (NULL until first attempt)
- `user_progress.answered_correctly` is already written by `POST /progress` on every concept attempt
- Score = total correct answers / total answers for all concepts in the module
- If score ≥ 0.7 AND a next module exists by `order_index + 1`, set `is_unlocked = 1` on it
- The completion page (`/complete/[moduleId]`) fires the complete mutation on mount

### Running tests
```bash
# Backend — from /Users/t-rawww/zenkai/backend/
venv/bin/pytest tests/ -q

# Frontend — from /Users/t-rawww/zenkai/frontend/
npm test -- --run
```

### Running the server (needed for manual pipeline steps)
```bash
# From /Users/t-rawww/zenkai/ (repo root)
backend/venv/bin/uvicorn backend.main:app --port 8000
```

---

## Task 1: Fix KB Source Paths (DB Migration)

**Files:**
- Create: `backend/migrations/001_fix_kb_source_paths.sql`
- Modify (apply): run the SQL against `backend/zenkai.db`

**Step 1: Write the migration file**

Create `backend/migrations/001_fix_kb_source_paths.sql`:

```sql
-- Migration 001: fix kb_source_path values to include full subdirectory prefix
-- KB_PATH = /Users/t-rawww/AI-Knowledgebase/
-- All paths are relative to KB_PATH.

UPDATE modules SET kb_source_path = 'LEARNING/FOUNDATIONS/prompt-engineering/prompt-engineering.md'
  WHERE title = 'Prompt Engineering';

UPDATE modules SET kb_source_path = 'LEARNING/FOUNDATIONS/context-engineering/context-engineering.md'
  WHERE title = 'Context Engineering';

UPDATE modules SET kb_source_path = 'LEARNING/FOUNDATIONS/reasoning-llms/reasoning-llms.md'
  WHERE title = 'Reasoning LLMs';

UPDATE modules SET kb_source_path = 'LEARNING/AGENTS_AND_SYSTEMS/agentic-engineering/agentic-engineering.md'
  WHERE title = 'Agentic Engineering';

UPDATE modules SET kb_source_path = 'LEARNING/AGENTS_AND_SYSTEMS/skills/skills.md'
  WHERE title = 'Skills';

UPDATE modules SET kb_source_path = 'LEARNING/PRODUCTION/evaluation/evaluation.md'
  WHERE title = 'Evaluation';

UPDATE modules SET kb_source_path = 'LEARNING/PRODUCTION/fine-tuning/fine-tuning.md'
  WHERE title = 'Fine-tuning';

UPDATE modules SET kb_source_path = 'LEARNING/PRODUCTION/ai-security/ai-security.md'
  WHERE title = 'AI Security';

UPDATE modules SET kb_source_path = 'future-reference/playbooks/'
  WHERE title = 'Playbooks';
```

**Step 2: Apply the migration to the live DB**

```bash
sqlite3 backend/zenkai.db < backend/migrations/001_fix_kb_source_paths.sql
```

**Step 3: Verify**

```bash
sqlite3 backend/zenkai.db "SELECT id, title, kb_source_path FROM modules ORDER BY order_index;"
```

Expected: all paths now have correct prefixes. Module 2 should show `LEARNING/FOUNDATIONS/prompt-engineering/prompt-engineering.md`.

**Step 4: Verify the files actually exist at those paths**

```bash
python3 -c "
from pathlib import Path
KB = Path('/Users/t-rawww/AI-Knowledgebase/')
paths = [
  'LEARNING/FOUNDATIONS/prompt-engineering/prompt-engineering.md',
  'LEARNING/FOUNDATIONS/context-engineering/context-engineering.md',
  'LEARNING/FOUNDATIONS/reasoning-llms/reasoning-llms.md',
  'LEARNING/AGENTS_AND_SYSTEMS/agentic-engineering/agentic-engineering.md',
  'LEARNING/AGENTS_AND_SYSTEMS/skills/skills.md',
  'LEARNING/PRODUCTION/evaluation/evaluation.md',
  'LEARNING/PRODUCTION/fine-tuning/fine-tuning.md',
  'LEARNING/PRODUCTION/ai-security/ai-security.md',
  'future-reference/playbooks/',
]
for p in paths:
    full = KB / p
    exists = full.exists()
    print(f\"{'OK' if exists else 'MISSING'}: {p}\")
"
```

Expected: all show `OK`.

**Step 5: Commit**

```bash
git add backend/migrations/001_fix_kb_source_paths.sql
git commit -m "fix: correct kb_source_path values for all modules (add LEARNING/* prefix)"
```

---

## Task 2: Directory-Mode KB Reader (Module 10 Support)

Module 10 (`future-reference/playbooks/`) is a directory of `.md` files. Each file is one concept. Add `read_kb_directory` to `kb_reader.py`.

**Files:**
- Modify: `backend/pipeline/kb_reader.py`
- Test: `backend/tests/test_kb_reader.py`

**Step 1: Write failing tests**

Open `backend/tests/test_kb_reader.py`. Add these tests at the end:

```python
def test_read_kb_directory_returns_dict_of_file_contents(tmp_path):
    """Each .md file in the dir becomes an entry: {stem: text}."""
    (tmp_path / "foo.md").write_text("# Foo\nsome content")
    (tmp_path / "bar.md").write_text("# Bar\nother content")
    (tmp_path / "ignore.txt").write_text("ignored")

    from backend.pipeline.kb_reader import read_kb_directory
    result = read_kb_directory(str(tmp_path))
    assert set(result.keys()) == {"foo", "bar"}
    assert "some content" in result["foo"]
    assert "other content" in result["bar"]


def test_read_kb_directory_sorted_alphabetically(tmp_path):
    """Files are returned in sorted order (deterministic concept order_index)."""
    (tmp_path / "zzz.md").write_text("last")
    (tmp_path / "aaa.md").write_text("first")
    from backend.pipeline.kb_reader import read_kb_directory
    result = read_kb_directory(str(tmp_path))
    assert list(result.keys()) == ["aaa", "zzz"]


def test_read_kb_directory_raises_if_path_not_dir(tmp_path):
    """Raises FileNotFoundError if the directory does not exist."""
    from backend.pipeline.kb_reader import read_kb_directory
    import pytest
    with pytest.raises(FileNotFoundError):
        read_kb_directory(str(tmp_path / "nonexistent"))
```

**Step 2: Run to verify failure**

```bash
# From backend/
venv/bin/pytest tests/test_kb_reader.py -q -k "directory"
```

Expected: `ImportError: cannot import name 'read_kb_directory'`

**Step 3: Implement `read_kb_directory` in `kb_reader.py`**

Open `backend/pipeline/kb_reader.py`. Add this function after `read_kb_doc`:

```python
def read_kb_directory(dir_path: str) -> dict[str, str]:
    """
    Read all .md files in a directory.
    Returns an ordered dict: {filename_stem: file_text}, sorted alphabetically.
    Used for directory-based modules like Module 10 (Playbooks).
    """
    path = Path(dir_path)
    if not path.is_dir():
        raise FileNotFoundError(f"KB directory not found: {path}")
    files = sorted(path.glob("*.md"))
    return {f.stem: f.read_text(encoding="utf-8") for f in files}
```

**Step 4: Run tests to verify pass**

```bash
venv/bin/pytest tests/test_kb_reader.py -q -k "directory"
```

Expected: 3 tests pass.

**Step 5: Commit**

```bash
git add backend/pipeline/kb_reader.py backend/tests/test_kb_reader.py
git commit -m "feat: add read_kb_directory for directory-based KB modules"
```

---

## Task 3: Orchestrator Directory-Mode (Module 10 Pipeline)

Detect when `kb_source_path` ends with `/` and use `read_kb_directory` instead of `read_kb_doc` + `list_concept_sections`. In directory mode, filename stem = concept title, full file content = section.

**Files:**
- Modify: `backend/pipeline/orchestrator.py`
- Test: `backend/tests/test_orchestrator.py`

**Step 1: Read the existing orchestrator tests first**

```bash
cat backend/tests/test_orchestrator.py
```

Note how they mock `generate_with_claude` and seed modules in the test DB.

**Step 2: Write a failing test for directory mode**

Open `backend/tests/test_orchestrator.py`. Add this test at the end:

```python
async def test_pipeline_directory_mode_generates_concepts_per_file(test_db, tmp_path, monkeypatch):
    """Directory-mode: each .md file in the dir becomes one concept."""
    import json
    from unittest.mock import AsyncMock, patch

    # Create a fake playbooks directory with 2 files
    kb_dir = tmp_path / "playbooks"
    kb_dir.mkdir()
    (kb_dir / "building-agents.md").write_text("## Building Agents\nsome content")
    (kb_dir / "rag-pipelines.md").write_text("## RAG Pipelines\nother content")

    fake_kb_root = str(tmp_path)

    # Module 10 (id=10) has order_index=9 in the test DB — point it at our fake dir
    async with aiosqlite.connect(test_db) as db:
        await db.execute(
            "UPDATE modules SET kb_source_path=? WHERE id=10",
            ("playbooks/",),
        )
        await db.commit()

    fake_output = {
        "title": "t", "hook": "h", "explanation": ["e"], "analogy": None,
        "mechanism": ["m"], "edge_cases": ["ec"], "key_number": "k", "failure_story": "fs",
        "question": "q", "options": ["a","b","c","d"], "correct_index": 0, "reveal_explanation": "re",
        "artifact_type": "prompt", "artifact": "a", "annotations": [],
    }

    with patch("backend.pipeline.orchestrator.generate_with_claude", new=AsyncMock(return_value=fake_output)):
        result = await run_pipeline_for_module(10, fake_kb_root)

    assert len(result["generated"]) == 2
    assert "building-agents" in result["generated"]
    assert "rag-pipelines" in result["generated"]

    async with aiosqlite.connect(test_db) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT title FROM concepts WHERE module_id=10") as cur:
            titles = [r["title"] for r in await cur.fetchall()]
    assert set(titles) == {"building-agents", "rag-pipelines"}
```

**Step 3: Run to verify failure**

```bash
venv/bin/pytest tests/test_orchestrator.py -q -k "directory"
```

Expected: fails (orchestrator tries to open a single file, not a directory).

**Step 4: Modify `orchestrator.py`**

Add `read_kb_directory` to the import block at the top:

```python
from backend.pipeline.kb_reader import (
    read_kb_doc,
    read_kb_directory,
    extract_concept_section,
    list_concept_sections,
    compute_section_hash,
)
```

Add `from pathlib import Path` if not already present.

In `run_pipeline_for_module`, replace the KB-reading block (currently lines ~56–63, starting with `kb_source = module["kb_source_path"]` and ending with `logger.info(f"Module {module_id}: found {len(concept_titles)} concept sections")`):

```python
kb_source = module["kb_source_path"]
if not kb_source:
    logger.info(f"Module {module_id} has no KB source — skipping pipeline")
    return results

is_directory = kb_source.endswith("/")

if is_directory:
    dir_path = str(Path(kb_path) / kb_source)
    concept_map = read_kb_directory(dir_path)
    concept_entries = list(concept_map.items())  # [(stem, text), ...]
    logger.info(f"Module {module_id}: found {len(concept_entries)} concept files (directory mode)")
else:
    doc_text = read_kb_doc(kb_path, kb_source)
    concept_titles = list_concept_sections(doc_text)
    concept_entries = [
        (title, extract_concept_section(doc_text, title))
        for title in concept_titles
        if extract_concept_section(doc_text, title)
    ]
    logger.info(f"Module {module_id}: found {len(concept_entries)} concept sections")
```

Replace the loop header from `for order_idx, title in enumerate(concept_titles):` to:

```python
for order_idx, (title, section) in enumerate(concept_entries):
    if not section:
        continue
```

The rest of the loop body is **unchanged** — `title` and `section` are the same variables.

In `generate_quiz_for_module`, replace its KB-reading block (starting from `kb_source = module["kb_source_path"]` through `doc_text = read_kb_doc(kb_path, kb_source)`):

```python
kb_source = module["kb_source_path"]
if not kb_source:
    logger.info(f"Module {module_id} has no KB source — skipping quiz generation")
    return results

is_directory = kb_source.endswith("/")
if is_directory:
    dir_path = str(Path(kb_path) / kb_source)
    concept_file_map: dict | None = read_kb_directory(dir_path)
    doc_text = None
else:
    doc_text = read_kb_doc(kb_path, kb_source)
    concept_file_map = None
```

Inside the `for concept in concepts:` loop, replace `section = extract_concept_section(doc_text, title)` with:

```python
if concept_file_map is not None:
    section = concept_file_map.get(title)
else:
    section = extract_concept_section(doc_text, title)  # type: ignore[arg-type]
```

**Step 5: Run the new test**

```bash
venv/bin/pytest tests/test_orchestrator.py -q -k "directory"
```

Expected: PASS.

**Step 6: Run all backend tests**

```bash
venv/bin/pytest tests/ -q
```

Expected: all pass.

**Step 7: Commit**

```bash
git add backend/pipeline/orchestrator.py backend/tests/test_orchestrator.py
git commit -m "feat: orchestrator directory-mode for Module 10 (Playbooks)"
```

---

## Task 4: Backend — Module Complete Endpoint

New endpoint: `POST /modules/{module_id}/complete`

Returns `{"score": 0.857, "next_module_id": 4, "next_module_unlocked": true}`.

**Files:**
- Modify: `backend/routers/modules.py`
- Test: `backend/tests/test_api_modules.py`

**Step 1: Write failing tests**

Open `backend/tests/test_api_modules.py`. Add these helper and test functions at the end:

```python
async def _seed_progress(db_path: str, concept_id: int, user_id: int, correct: bool):
    """Insert a user_progress row for testing."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            """INSERT INTO user_progress (user_id, concept_id, answered_correctly, confidence, time_spent_ms)
               VALUES (?, ?, ?, 'knew_it', 1000)""",
            (user_id, concept_id, correct),
        )
        await db.commit()


async def test_complete_module_returns_score(client: AsyncClient, test_db: str):
    """Score is calculated as correct/total from user_progress for the module."""
    concept_id = await _seed_concept(test_db, module_id=1)
    await _seed_progress(test_db, concept_id, user_id=1, correct=True)
    await _seed_progress(test_db, concept_id, user_id=1, correct=True)
    await _seed_progress(test_db, concept_id, user_id=1, correct=False)

    r = await client.post("/modules/1/complete", json={"user_id": 1})
    assert r.status_code == 200
    data = r.json()
    assert abs(data["score"] - (2 / 3)) < 0.01


async def test_complete_module_unlocks_next_on_70_pct(client: AsyncClient, test_db: str):
    """Score >= 0.7 unlocks the next module by order_index."""
    concept_id = await _seed_concept(test_db, module_id=1)
    for _ in range(7):
        await _seed_progress(test_db, concept_id, user_id=1, correct=True)
    for _ in range(3):
        await _seed_progress(test_db, concept_id, user_id=1, correct=False)

    r = await client.post("/modules/1/complete", json={"user_id": 1})
    assert r.status_code == 200
    assert r.json()["next_module_unlocked"] is True
    assert r.json()["score"] >= 0.7

    modules_r = await client.get("/modules")
    modules_by_order = {m["order_index"]: m for m in modules_r.json()}
    # Module at order_index=1 should now be unlocked
    assert modules_by_order[1]["is_unlocked"] is True


async def test_complete_module_no_unlock_below_threshold(client: AsyncClient, test_db: str):
    """Score < 0.7 does NOT unlock the next module."""
    concept_id = await _seed_concept(test_db, module_id=1)
    for _ in range(6):
        await _seed_progress(test_db, concept_id, user_id=1, correct=True)
    for _ in range(4):
        await _seed_progress(test_db, concept_id, user_id=1, correct=False)

    r = await client.post("/modules/1/complete", json={"user_id": 1})
    assert r.status_code == 200
    assert r.json()["next_module_unlocked"] is False

    modules_r = await client.get("/modules")
    modules_by_order = {m["order_index"]: m for m in modules_r.json()}
    assert modules_by_order[1]["is_unlocked"] is False


async def test_complete_module_no_progress_returns_null_score(client: AsyncClient, test_db: str):
    """No user_progress rows → score is null, no unlock."""
    r = await client.post("/modules/1/complete", json={"user_id": 1})
    assert r.status_code == 200
    data = r.json()
    assert data["score"] is None
    assert data["next_module_unlocked"] is False


async def test_complete_module_not_found(client: AsyncClient):
    r = await client.post("/modules/9999/complete", json={"user_id": 1})
    assert r.status_code == 404
```

**Step 2: Run to verify failure**

```bash
venv/bin/pytest tests/test_api_modules.py -q -k "complete"
```

Expected: all 5 fail with 404 or connection error (endpoint doesn't exist).

**Step 3: Implement the endpoint in `modules.py`**

Add these imports at the top of `backend/routers/modules.py`:

```python
from pydantic import BaseModel
from typing import Optional
```

Add after the `get_module` function:

```python
class CompleteRequest(BaseModel):
    user_id: int = 1


@router.post("/{module_id}/complete")
async def complete_module(module_id: int, body: CompleteRequest):
    db = await get_db()
    try:
        async with db.execute("SELECT id, order_index FROM modules WHERE id=?", (module_id,)) as cur:
            module = await cur.fetchone()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")

        async with db.execute(
            """SELECT COUNT(*) as total,
                      SUM(CASE WHEN up.answered_correctly=1 THEN 1 ELSE 0 END) as correct
               FROM user_progress up
               JOIN concepts c ON c.id = up.concept_id
               WHERE c.module_id = ? AND up.user_id = ?""",
            (module_id, body.user_id),
        ) as cur:
            row = await cur.fetchone()

        total = row["total"]
        correct = row["correct"] or 0

        if total == 0:
            return {"score": None, "next_module_id": None, "next_module_unlocked": False}

        score = correct / total

        await db.execute(
            "UPDATE modules SET quiz_score_achieved=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
            (score, module_id),
        )

        next_unlocked = False
        next_module_id = None
        async with db.execute(
            "SELECT id FROM modules WHERE order_index=?",
            (module["order_index"] + 1,),
        ) as cur:
            next_module = await cur.fetchone()

        if next_module:
            next_module_id = next_module["id"]
            if score >= 0.7:
                await db.execute(
                    "UPDATE modules SET is_unlocked=1, unlocked_at=CURRENT_TIMESTAMP WHERE id=?",
                    (next_module_id,),
                )
                next_unlocked = True

        await db.commit()
        return {"score": score, "next_module_id": next_module_id, "next_module_unlocked": next_unlocked}
    finally:
        await db.close()
```

**Step 4: Run the new tests**

```bash
venv/bin/pytest tests/test_api_modules.py -q
```

Expected: all pass including the 5 new tests.

**Step 5: Run all backend tests**

```bash
venv/bin/pytest tests/ -q
```

Expected: all pass.

**Step 6: Commit**

```bash
git add backend/routers/modules.py backend/tests/test_api_modules.py
git commit -m "feat: POST /modules/{id}/complete — score calculation and unlock gating"
```

---

## Task 5: Frontend — Completion Page Calls Complete Endpoint

The completion page fires `api.completeModule` on mount via `useMutation`, then conditionally shows a score badge and unlock banner.

**Files:**
- Modify: `frontend/lib/types.ts` — add `CompleteResponse`
- Modify: `frontend/lib/api.ts` — add `completeModule`
- Modify: `frontend/app/complete/[moduleId]/page.tsx` — add mutation + UI
- Modify: `frontend/tests/CompletePage.test.tsx` — mock useMutation + new tests

**Step 1: Add `CompleteResponse` type**

Open `frontend/lib/types.ts`. Add at the end:

```typescript
export interface CompleteResponse {
  score: number | null
  next_module_id: number | null
  next_module_unlocked: boolean
}
```

**Step 2: Add `completeModule` to api.ts**

Open `frontend/lib/api.ts`. Add `CompleteResponse` to the import:

```typescript
import type {
  Module,
  ModuleDetail,
  Concept,
  Character,
  ProgressPayload,
  ProgressResponse,
  ReviewItem,
  CompleteResponse,
} from "@/lib/types"
```

Add to the `api` object after `endSession`:

```typescript
  completeModule: (moduleId: number, userId = 1) =>
    apiFetch<CompleteResponse>(`/modules/${moduleId}/complete`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),
```

**Step 3: Write failing tests**

Open `frontend/tests/CompletePage.test.tsx`. Replace the entire `@tanstack/react-query` mock with one that covers both `useQuery` and `useMutation`:

```typescript
import { useMutation } from "@tanstack/react-query"

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === "character") {
      return { data: { character_form: 1, total_xp: 350 }, isLoading: false }
    }
    if (queryKey[0] === "modules") {
      return {
        data: { id: 2, title: "Prompt Engineering", concepts: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        isLoading: false,
      }
    }
    return { data: null, isLoading: false }
  },
  useMutation: vi.fn(),
}))
```

Add a helper above the `describe` block:

```typescript
function mockMutation(data: unknown = null) {
  vi.mocked(useMutation).mockReturnValue({
    mutate: vi.fn(),
    data,
    isPending: false,
    isSuccess: data !== null,
    isError: false,
    isIdle: data === null,
    reset: vi.fn(),
  } as ReturnType<typeof useMutation>)
}
```

Update existing tests to call `mockMutation()` before each render:

```typescript
it("renders module title", () => {
  mockMutation()
  render(<CompletePage />)
  expect(screen.getByText("Prompt Engineering")).toBeInTheDocument()
})

it("renders XP value", () => {
  mockMutation()
  render(<CompletePage />)
  expect(screen.getByTestId("xp-display")).toBeInTheDocument()
})

it("renders return button", () => {
  mockMutation()
  render(<CompletePage />)
  expect(screen.getByTestId("return-btn")).toBeInTheDocument()
})
```

Add new tests:

```typescript
it("shows score when complete mutation returns data", () => {
  mockMutation({ score: 0.857, next_module_id: 3, next_module_unlocked: false })
  render(<CompletePage />)
  expect(screen.getByTestId("score-display")).toBeInTheDocument()
})

it("shows unlock banner when next module is unlocked", () => {
  mockMutation({ score: 0.857, next_module_id: 3, next_module_unlocked: true })
  render(<CompletePage />)
  expect(screen.getByTestId("unlock-banner")).toBeInTheDocument()
})

it("hides unlock banner when score below threshold", () => {
  mockMutation({ score: 0.6, next_module_id: 3, next_module_unlocked: false })
  render(<CompletePage />)
  expect(screen.queryByTestId("unlock-banner")).not.toBeInTheDocument()
})
```

**Step 4: Run to verify failures**

```bash
# From frontend/
npm test -- --run CompletePage
```

Expected: tests fail (useMutation not set up in page yet, elements missing).

**Step 5: Update `frontend/app/complete/[moduleId]/page.tsx`**

Add `useMutation` to the react-query import. Add the mutation hook and `useEffect` to call it on mount. Add score + unlock UI elements. The full updated file:

```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/queryKeys"
import { AppHeader } from "@/components/ui/AppHeader"
import { SamuraiButton } from "@/components/ui/SamuraiButton"
import { RoninSprite } from "@/components/ui/RoninSprite"
import { getLocationByModuleId } from "@/lib/worldMapConfig"

export default function CompletePage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const router = useRouter()
  const moduleIdNum = Number(moduleId)

  const [displayXp, setDisplayXp] = useState(0)

  const { data: character } = useQuery({
    queryKey: queryKeys.character(),
    queryFn: api.getCharacter,
  })

  const { data: module } = useQuery({
    queryKey: queryKeys.module(moduleIdNum),
    queryFn: () => api.getModule(moduleIdNum),
  })

  const { mutate: completeModule, data: completeData } = useMutation({
    mutationFn: () => api.completeModule(moduleIdNum),
  })

  const location = getLocationByModuleId(moduleIdNum)

  // Fire complete mutation once on mount
  useEffect(() => {
    completeModule()
  }, [completeModule])

  // XP count-up animation
  useEffect(() => {
    if (!character) return
    const target = character.total_xp
    const duration = 1200
    const startTime = performance.now()
    let rafId: number
    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      setDisplayXp(Math.round(target * progress))
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [character])

  function handleReturn() {
    sessionStorage.setItem("zenkai-just-completed", moduleId)
    router.push("/world-map")
  }

  const score = completeData?.score ?? null
  const scorePercent = score !== null ? Math.round(score * 100) : null
  const nextUnlocked = completeData?.next_module_unlocked ?? false

  return (
    <div className="fixed inset-0 bg-zen-void flex flex-col select-none">
      <AppHeader />

      <div className="flex flex-col items-center justify-center flex-1 px-6 gap-8">
        {/* Location label */}
        {location && (
          <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
            {location.biome} · {location.name}
          </p>
        )}

        {/* Completion badge */}
        <div className="clipped-corners border border-zen-gold/30 bg-zen-slate px-8 py-5 text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40 mb-2">
            Module Complete
          </p>
          <h1 className="font-heading text-2xl font-bold text-zen-gold leading-tight">
            {module?.title ?? "…"}
          </h1>
          {module && (
            <p className="font-mono text-[10px] text-zen-plasma/50 mt-1">
              {module.concepts.length} concept{module.concepts.length !== 1 ? "s" : ""} studied
            </p>
          )}
        </div>

        {/* Score display — shown once completeModule resolves */}
        {scorePercent !== null && (
          <div className="text-center" data-testid="score-display">
            <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
              Comprehension Score
            </p>
            <p className="font-heading text-2xl font-bold text-zen-plasma tabular-nums mt-1">
              {scorePercent}%
            </p>
          </div>
        )}

        {/* Unlock banner */}
        {nextUnlocked && (
          <div
            data-testid="unlock-banner"
            className="clipped-corners border border-zen-plasma/40 bg-zen-slate/60 px-6 py-3 text-center"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-zen-plasma">
              Next module unlocked
            </p>
          </div>
        )}

        {/* Character sprite */}
        <RoninSprite animation="breathing-idle" direction="south" scale={1.2} />

        {/* XP display */}
        <div className="text-center" data-testid="xp-display">
          <p className="font-mono text-[9px] uppercase tracking-widest text-zen-plasma/40">
            Total XP
          </p>
          <p className="font-heading text-3xl font-bold text-zen-gold tabular-nums mt-1">
            {displayXp}
          </p>
        </div>

        {/* Return CTA */}
        <SamuraiButton
          data-testid="return-btn"
          className="w-full max-w-xs"
          onClick={handleReturn}
        >
          Return to World Map
        </SamuraiButton>
      </div>
    </div>
  )
}
```

**Step 6: Run tests**

```bash
npm test -- --run CompletePage
```

Expected: all 6 tests pass.

**Step 7: Run full frontend test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

**Step 8: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/api.ts \
        "frontend/app/complete/[moduleId]/page.tsx" \
        frontend/tests/CompletePage.test.tsx
git commit -m "feat: completion page fires completeModule, shows score + unlock banner"
```

---

## Task 6: Run Content Pipeline for Modules 3–9

Operational step — no new code. Tasks 1–3 must be complete. Backend must be running.

**Step 1: Start backend**

```bash
# From /Users/t-rawww/zenkai/
backend/venv/bin/uvicorn backend.main:app --port 8000
```

**Step 2: Run concept pipeline per module (one at a time)**

Trigger each module, wait for the background task to complete (~2–3 min), check status, then move to the next:

```bash
# Trigger module 3
curl -X POST http://localhost:8000/pipeline/sync -H "Content-Type: application/json" -d '{"module_id": 3}'

# After ~3 minutes, check status
curl http://localhost:8000/pipeline/status

# Trigger module 4 once 3 is done
curl -X POST http://localhost:8000/pipeline/sync -H "Content-Type: application/json" -d '{"module_id": 4}'
# ... repeat for 5, 6, 7, 8, 9, 10
```

**Step 3: Run quiz generation per module**

After all concept pipelines complete:

```bash
for MODULE_ID in 3 4 5 6 7 8 9 10; do
  curl -s -X POST http://localhost:8000/pipeline/sync-quiz \
    -H "Content-Type: application/json" \
    -d "{\"module_id\": $MODULE_ID}"
  echo "Quiz queued for module $MODULE_ID"
done
```

**Step 4: Verify data**

```bash
sqlite3 backend/zenkai.db "
SELECT m.id, m.title,
       COUNT(DISTINCT c.id) as concepts,
       COUNT(DISTINCT qq.id) as quiz_qs
FROM modules m
LEFT JOIN concepts c ON c.module_id = m.id
LEFT JOIN quiz_questions qq ON qq.concept_id = c.id
GROUP BY m.id
ORDER BY m.id;"
```

Expected: modules 2–10 each have 5–10 concepts and 15–30 quiz questions.

---

## Final Verification

After all tasks complete:

```bash
# Backend
cd backend && venv/bin/pytest tests/ -q

# Frontend
cd frontend && npm test -- --run
```

Both suites must pass before creating the PR.
