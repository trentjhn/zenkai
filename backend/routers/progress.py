from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.database import get_db
from backend.pipeline.sm2 import SM2State, update_schedule

router = APIRouter(prefix="/progress", tags=["progress"])


class ProgressPayload(BaseModel):
    user_id: int
    concept_id: int
    answered_correctly: bool
    confidence: Literal["knew_it", "somewhat_sure", "guessed"]
    time_spent_ms: int


@router.post("")
async def record_progress(body: ProgressPayload):
    db = await get_db()
    try:
        # Validate concept exists
        async with db.execute("SELECT id FROM concepts WHERE id=?", (body.concept_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Concept not found")

        # Fetch or bootstrap SM-2 state
        async with db.execute(
            "SELECT interval_days, ease_factor, repetitions FROM review_schedule WHERE user_id=? AND concept_id=?",
            (body.user_id, body.concept_id),
        ) as cur:
            row = await cur.fetchone()

        if row:
            state = SM2State(
                interval_days=row["interval_days"],
                ease_factor=row["ease_factor"],
                repetitions=row["repetitions"],
            )
        else:
            state = SM2State(interval_days=1.0, ease_factor=2.5, repetitions=0)

        new_state = update_schedule(state, body.answered_correctly, body.confidence)
        next_review = datetime.now(timezone.utc) + timedelta(days=new_state.interval_days)
        next_review_str = next_review.strftime("%Y-%m-%d %H:%M:%S")

        if row:
            await db.execute(
                """UPDATE review_schedule
                   SET interval_days=?, ease_factor=?, repetitions=?, next_review_at=?
                   WHERE user_id=? AND concept_id=?""",
                (new_state.interval_days, new_state.ease_factor, new_state.repetitions,
                 next_review_str, body.user_id, body.concept_id),
            )
        else:
            await db.execute(
                """INSERT INTO review_schedule
                   (user_id, concept_id, interval_days, ease_factor, repetitions, next_review_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (body.user_id, body.concept_id, new_state.interval_days,
                 new_state.ease_factor, new_state.repetitions, next_review_str),
            )

        await db.execute(
            """INSERT INTO user_progress
               (user_id, concept_id, answered_correctly, confidence, time_spent_ms)
               VALUES (?, ?, ?, ?, ?)""",
            (body.user_id, body.concept_id, body.answered_correctly,
             body.confidence, body.time_spent_ms),
        )
        await db.commit()

        return {
            "interval_days": new_state.interval_days,
            "ease_factor": new_state.ease_factor,
            "repetitions": new_state.repetitions,
            "next_review_at": next_review_str,
        }
    finally:
        await db.close()


@router.get("/review-queue")
async def get_review_queue(user_id: int = 1):
    db = await get_db()
    try:
        async with db.execute(
            """SELECT rs.concept_id, rs.next_review_at, rs.interval_days, c.title, c.module_id
               FROM review_schedule rs
               JOIN concepts c ON c.id = rs.concept_id
               WHERE rs.user_id=? AND rs.next_review_at <= CURRENT_TIMESTAMP
               ORDER BY rs.next_review_at""",
            (user_id,),
        ) as cur:
            rows = await cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()
