import json
import pytest
import aiosqlite
from httpx import AsyncClient


async def _seed_concept(db_path: str) -> int:
    """Insert a concept + review_schedule row so progress can be posted."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            """INSERT INTO concepts (module_id, order_index, title, default_layer, deep_layer,
               prediction_question, worked_example, content_hash)
               VALUES (1, 0, 'Test', '{}', '{}', '{}', '{}', 'h')"""
        )
        concept_id = cursor.lastrowid
        await db.execute(
            """INSERT INTO review_schedule
               (user_id, concept_id, interval_days, ease_factor, repetitions, next_review_at)
               VALUES (1, ?, 1.0, 2.5, 0, CURRENT_TIMESTAMP)""",
            (concept_id,),
        )
        await db.commit()
        return concept_id


async def test_post_progress_returns_next_review(client: AsyncClient, test_db: str):
    concept_id = await _seed_concept(test_db)
    r = await client.post("/progress", json={
        "user_id": 1,
        "concept_id": concept_id,
        "answered_correctly": True,
        "confidence": "knew_it",
        "time_spent_ms": 4200,
    })
    assert r.status_code == 200
    data = r.json()
    assert "next_review_at" in data
    assert data["interval_days"] > 1.0


async def test_post_progress_incorrect_resets_interval(client: AsyncClient, test_db: str):
    concept_id = await _seed_concept(test_db)
    r = await client.post("/progress", json={
        "user_id": 1,
        "concept_id": concept_id,
        "answered_correctly": False,
        "confidence": "guessed",
        "time_spent_ms": 1000,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["interval_days"] == pytest.approx(1.0)


async def test_review_queue_returns_list(client: AsyncClient, test_db: str):
    await _seed_concept(test_db)
    r = await client.get("/progress/review-queue")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_post_progress_concept_not_found(client: AsyncClient):
    r = await client.post("/progress", json={
        "user_id": 1,
        "concept_id": 99999,
        "answered_correctly": True,
        "confidence": "knew_it",
        "time_spent_ms": 1000,
    })
    assert r.status_code == 404
