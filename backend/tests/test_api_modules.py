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
    locked = [m for m in r.json() if m["order_index"] > 0]
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
