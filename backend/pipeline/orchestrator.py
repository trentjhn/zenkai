"""
Content pipeline orchestrator.

Reads KB sections, computes SHA-256 hashes for delta detection,
calls Claude for generation (one concept at a time), and caches
results in SQLite. Every run is logged to pipeline_log.
"""
import json
import logging
from pathlib import Path
from typing import Optional

from backend.pipeline.kb_reader import (
    read_kb_doc,
    read_kb_directory,
    extract_concept_section,
    list_concept_sections,
    compute_section_hash,
)
from backend.pipeline.claude_client import generate_with_claude, SONNET, HAIKU
from backend.pipeline.prompts import prompt_1a, prompt_1b, prompt_1c, prompt_1d, prompt_3
from backend.database import get_db

logger = logging.getLogger(__name__)


def should_regenerate_concept(stored_hash: Optional[str], current_hash: str) -> bool:
    """Return True if content should be regenerated (hash changed or never generated)."""
    return stored_hash is None or stored_hash != current_hash


async def _log_pipeline(db, module_id: int, concept_id: Optional[int],
                         prompt_type: str, model: str, success: bool,
                         error_message: Optional[str] = None) -> None:
    await db.execute(
        """INSERT INTO pipeline_log (module_id, concept_id, prompt_type, model_used, success, error_message)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (module_id, concept_id, prompt_type, model, success, error_message),
    )
    await db.commit()


async def run_pipeline_for_module(module_id: int, kb_path: str) -> dict:
    """
    Run content generation for all concepts in a module.
    Sequential — one concept at a time (rate limit compliance).
    Returns a status report: {generated, skipped, failed}.
    """
    db = await get_db()
    results: dict = {"module_id": module_id, "generated": [], "skipped": [], "failed": []}

    try:
        async with db.execute("SELECT * FROM modules WHERE id=?", (module_id,)) as cursor:
            module = await cursor.fetchone()
        if not module:
            raise ValueError(f"Module {module_id} not found")

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

        for order_idx, (title, section) in enumerate(concept_entries):
            if not section:
                continue

            current_hash = compute_section_hash(section)

            async with db.execute(
                "SELECT id, content_hash FROM concepts WHERE module_id=? AND title=?",
                (module_id, title),
            ) as cursor:
                existing = await cursor.fetchone()

            if existing and not should_regenerate_concept(existing["content_hash"], current_hash):
                results["skipped"].append(title)
                logger.info(f"Skipped (hash match): {title}")
                continue

            concept_id = existing["id"] if existing else None

            try:
                default_layer = await generate_with_claude(
                    prompt_1a(title, section),
                    model=SONNET,
                    expected_fields=["title", "hook", "explanation", "analogy"],
                )
                await _log_pipeline(db, module_id, concept_id, "1a", SONNET, True)

                deep_layer = await generate_with_claude(
                    prompt_1b(title, section),
                    model=SONNET,
                    expected_fields=["mechanism", "edge_cases", "key_number", "failure_story"],
                )
                await _log_pipeline(db, module_id, concept_id, "1b", SONNET, True)

                prediction = await generate_with_claude(
                    prompt_1c(title, section),
                    model=HAIKU,
                    expected_fields=["question", "options", "correct_index", "reveal_explanation"],
                )
                await _log_pipeline(db, module_id, concept_id, "1c", HAIKU, True)

                worked_example = await generate_with_claude(
                    prompt_1d(title, section),
                    model=SONNET,
                    expected_fields=["artifact_type", "artifact", "annotations"],
                )
                await _log_pipeline(db, module_id, concept_id, "1d", SONNET, True)

                if existing:
                    await db.execute(
                        """UPDATE concepts
                           SET default_layer=?, deep_layer=?, prediction_question=?,
                               worked_example=?, content_hash=?, generated_at=CURRENT_TIMESTAMP
                           WHERE id=?""",
                        (
                            json.dumps(default_layer), json.dumps(deep_layer),
                            json.dumps(prediction), json.dumps(worked_example),
                            current_hash, existing["id"],
                        ),
                    )
                else:
                    await db.execute(
                        """INSERT INTO concepts
                           (module_id, order_index, title, default_layer, deep_layer,
                            prediction_question, worked_example, content_hash)
                           VALUES (?,?,?,?,?,?,?,?)""",
                        (
                            module_id, order_idx, title,
                            json.dumps(default_layer), json.dumps(deep_layer),
                            json.dumps(prediction), json.dumps(worked_example),
                            current_hash,
                        ),
                    )

                await db.commit()
                results["generated"].append(title)
                logger.info(f"Generated: {title}")

            except Exception as e:
                results["failed"].append({"title": title, "error": str(e)})
                logger.error(f"Failed to generate '{title}': {e}")
                await _log_pipeline(db, module_id, concept_id, "generation", SONNET, False, str(e))

    finally:
        await db.close()

    return results


async def generate_quiz_for_module(module_id: int, kb_path: str) -> dict:
    """
    Generate 3 MC quiz questions per concept for a module (prompt_3).
    Skips concepts that already have quiz questions — idempotent.
    Returns {generated: [titles], skipped: [titles], failed: [...]}.
    """
    db = await get_db()
    results: dict = {"module_id": module_id, "generated": [], "skipped": [], "failed": []}

    try:
        async with db.execute("SELECT * FROM modules WHERE id=?", (module_id,)) as cursor:
            module = await cursor.fetchone()
        if not module:
            raise ValueError(f"Module {module_id} not found")

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

        async with db.execute(
            "SELECT id, title FROM concepts WHERE module_id=? ORDER BY order_index",
            (module_id,),
        ) as cursor:
            concepts = await cursor.fetchall()

        for concept in concepts:
            concept_id = concept["id"]
            title = concept["title"]

            # Skip if questions already exist
            async with db.execute(
                "SELECT COUNT(*) as n FROM quiz_questions WHERE concept_id=?",
                (concept_id,),
            ) as cursor:
                row = await cursor.fetchone()
            if row["n"] > 0:
                results["skipped"].append(title)
                logger.info(f"Quiz already exists, skipping: {title}")
                continue

            if concept_file_map is not None:
                section = concept_file_map.get(title)
            else:
                section = extract_concept_section(doc_text, title)  # type: ignore[arg-type]
            if not section:
                results["failed"].append({"title": title, "error": "Section not found in KB"})
                continue

            try:
                questions = await generate_with_claude(
                    prompt_3(title, section),
                    model=HAIKU,
                    expected_fields=[],  # returns a list — validated below
                )
                # prompt_3 returns a list, not a dict
                if not isinstance(questions, list):
                    raise ValueError(f"Expected list, got {type(questions)}")

                for q in questions:
                    await db.execute(
                        """INSERT INTO quiz_questions (concept_id, question_type, content)
                           VALUES (?, ?, ?)""",
                        (concept_id, q.get("type", "mc"), json.dumps(q)),
                    )

                await db.commit()
                await _log_pipeline(db, module_id, concept_id, "3", HAIKU, True)
                results["generated"].append(title)
                logger.info(f"Quiz generated: {title}")

            except Exception as e:
                results["failed"].append({"title": title, "error": str(e)})
                logger.error(f"Quiz generation failed for '{title}': {e}")
                await _log_pipeline(db, module_id, concept_id, "3", HAIKU, False, str(e))

    finally:
        await db.close()

    return results
