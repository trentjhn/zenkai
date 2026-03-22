import aiosqlite
import pytest

from backend.pipeline.orchestrator import should_regenerate_concept, run_pipeline_for_module, generate_quiz_for_module


def test_should_regenerate_when_no_hash():
    assert should_regenerate_concept(stored_hash=None, current_hash="abc123") is True


def test_should_not_regenerate_when_hash_matches():
    assert should_regenerate_concept(stored_hash="abc123", current_hash="abc123") is False


def test_should_regenerate_when_hash_changed():
    assert should_regenerate_concept(stored_hash="old123", current_hash="new456") is True


@pytest.mark.asyncio
async def test_pipeline_directory_mode_generates_concepts_per_file(test_db, tmp_path):
    """Directory-mode: each .md file in the dir becomes one concept."""
    from unittest.mock import AsyncMock, patch

    # Create a fake playbooks directory with 2 files
    kb_dir = tmp_path / "playbooks"
    kb_dir.mkdir()
    (kb_dir / "building-agents.md").write_text("## Building Agents\nsome content")
    (kb_dir / "rag-pipelines.md").write_text("## RAG Pipelines\nother content")

    fake_kb_root = str(tmp_path)

    # Module 10 (id=10) — point it at our fake directory (path ends with /)
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


@pytest.mark.asyncio
async def test_quiz_directory_mode_generates_questions_per_file(test_db, tmp_path):
    """Directory-mode quiz gen: uses concept_file_map instead of extract_concept_section."""
    from unittest.mock import AsyncMock, patch

    # Create a fake playbooks directory
    kb_dir = tmp_path / "playbooks"
    kb_dir.mkdir()
    (kb_dir / "building-agents.md").write_text("# Building Agents\nsome content about agents")

    fake_kb_root = str(tmp_path)

    # Set module 10 to directory mode
    async with aiosqlite.connect(test_db) as db:
        await db.execute(
            "UPDATE modules SET kb_source_path=? WHERE id=10",
            ("playbooks/",),
        )
        # Insert a concept for module 10 with title matching the file stem
        await db.execute(
            """INSERT INTO concepts (module_id, order_index, title, default_layer, deep_layer,
               prediction_question, worked_example, content_hash)
               VALUES (10, 0, 'building-agents', '{}', '{}', '{}', '{}', 'testhash')"""
        )
        await db.commit()

    fake_questions = [
        {"type": "mc", "question": "q?", "options": ["a", "b", "c", "d"], "correct_index": 0, "explanation": "e"}
    ]

    with patch("backend.pipeline.orchestrator.generate_with_claude", new=AsyncMock(return_value=fake_questions)):
        result = await generate_quiz_for_module(10, fake_kb_root)

    assert "building-agents" in result["generated"]

    # Verify quiz_questions were written to DB
    async with aiosqlite.connect(test_db) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT qq.id FROM quiz_questions qq
               JOIN concepts c ON c.id = qq.concept_id
               WHERE c.module_id=10"""
        ) as cur:
            rows = await cur.fetchall()
    assert len(rows) == 1
