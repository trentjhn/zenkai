import aiosqlite
from backend.database import init_db


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
    assert expected.issubset(tables), f"Missing tables: {expected - tables}"


async def test_seed_data_exists(tmp_path, monkeypatch):
    db_file = str(tmp_path / "test.db")
    monkeypatch.setenv("DB_PATH", db_file)
    await init_db()
    async with aiosqlite.connect(db_file) as db:
        async with db.execute("SELECT COUNT(*) FROM modules") as cursor:
            row = await cursor.fetchone()
            assert row[0] == 10, f"Expected 10 modules, got {row[0]}"
        async with db.execute(
            "SELECT is_unlocked FROM modules WHERE order_index=0"
        ) as cursor:
            row = await cursor.fetchone()
            assert row[0] == 1, "Module 0 should be unlocked"


async def test_default_user_seeded(tmp_path, monkeypatch):
    db_file = str(tmp_path / "test.db")
    monkeypatch.setenv("DB_PATH", db_file)
    await init_db()
    async with aiosqlite.connect(db_file) as db:
        async with db.execute(
            "SELECT username, character_form FROM users WHERE id=1"
        ) as cursor:
            row = await cursor.fetchone()
            assert row is not None, "Default user should exist"
            assert row[0] == "trenton"
            assert row[1] == 1  # Ronin form
