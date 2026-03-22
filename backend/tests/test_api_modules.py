import pytest
import aiosqlite
from httpx import AsyncClient


async def _seed_concept(db_path: str, module_id: int) -> int:
    """Insert a minimal concept row for testing."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            """INSERT INTO concepts (module_id, order_index, title, default_layer, deep_layer,
               prediction_question, worked_example, content_hash)
               VALUES (?, 0, ?, '{}', '{}', '{}', '{}', 'testhash')""",
            (module_id, "Test Concept"),
        )
        await db.commit()
        return cursor.lastrowid


async def test_list_modules_returns_10(client: AsyncClient):
    r = await client.get("/modules")
    assert r.status_code == 200
    assert len(r.json()) == 10


async def test_module_0_is_unlocked(client: AsyncClient):
    r = await client.get("/modules")
    module_0 = next(m for m in r.json() if m["order_index"] == 0)
    assert module_0["is_unlocked"]


async def test_locked_modules_not_unlocked(client: AsyncClient):
    r = await client.get("/modules")
    locked = [m for m in r.json() if m["order_index"] > 1]
    assert all(not m["is_unlocked"] for m in locked)


async def test_module_not_found_returns_404(client: AsyncClient):
    r = await client.get("/modules/9999")
    assert r.status_code == 404


async def test_module_detail_includes_concepts(client: AsyncClient, test_db: str):
    await _seed_concept(test_db, module_id=1)
    r = await client.get("/modules/1")
    assert r.status_code == 200
    data = r.json()
    assert "concepts" in data
    assert len(data["concepts"]) == 1
    assert data["concepts"][0]["title"] == "Test Concept"


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

    # Verify score was actually persisted to DB
    async with aiosqlite.connect(test_db) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT quiz_score_achieved FROM modules WHERE id=1") as cur:
            row = await cur.fetchone()
    assert abs(row["quiz_score_achieved"] - (2 / 3)) < 0.01


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
    assert abs(r.json()["score"] - 0.7) < 0.001

    modules_r = await client.get("/modules")
    modules_by_order = {m["order_index"]: m for m in modules_r.json()}
    assert modules_by_order[1]["is_unlocked"] is True


async def test_complete_module_no_unlock_below_threshold(client: AsyncClient, test_db: str):
    """Score < 0.7 does NOT unlock a locked next module."""
    # Use module id=3 (order_index=2, 'Context Engineering') which is seeded as locked.
    # Completing module id=2 (order_index=1) with <70% should leave order_index=2 locked.
    concept_id = await _seed_concept(test_db, module_id=2)
    for _ in range(6):
        await _seed_progress(test_db, concept_id, user_id=1, correct=True)
    for _ in range(4):
        await _seed_progress(test_db, concept_id, user_id=1, correct=False)

    r = await client.post("/modules/2/complete", json={"user_id": 1})
    assert r.status_code == 200
    assert r.json()["next_module_unlocked"] is False

    modules_r = await client.get("/modules")
    modules_by_order = {m["order_index"]: m for m in modules_r.json()}
    assert modules_by_order[2]["is_unlocked"] is False


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
