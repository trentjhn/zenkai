"""
Content pipeline orchestrator.

Reads KB sections, computes SHA-256 hashes for delta detection,
calls Claude for generation (one concept at a time), and caches
results in SQLite. Every run is logged to pipeline_log.
"""
import json
import logging
from typing import Optional

from backend.pipeline.kb_reader import (
    read_kb_doc,
    extract_concept_section,
    list_concept_sections,
    compute_section_hash,
)
from backend.pipeline.claude_client import generate_with_claude, SONNET, HAIKU
from backend.pipeline.prompts import prompt_1a, prompt_1b, prompt_1c, prompt_1d
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

        doc_text = read_kb_doc(kb_path, kb_source)
        concept_titles = list_concept_sections(doc_text)
        logger.info(f"Module {module_id}: found {len(concept_titles)} concept sections")

        for order_idx, title in enumerate(concept_titles):
            section = extract_concept_section(doc_text, title)
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
