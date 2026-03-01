from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from backend.database import get_db

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionStart(BaseModel):
    user_id: int = 1
    module_id: int


class SessionPatch(BaseModel):
    concepts_read: int = 0
    questions_answered: int = 0
    correct_answers: int = 0
    xp_earned: int = 0


@router.post("/start")
async def start_session(body: SessionStart):
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO sessions (user_id, module_id) VALUES (?, ?)",
            (body.user_id, body.module_id),
        )
        await db.commit()
        return {"session_id": cursor.lastrowid}
    finally:
        await db.close()


@router.patch("/{session_id}")
async def update_session(session_id: int, body: SessionPatch):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM sessions WHERE id=?", (session_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Session not found")
        await db.execute(
            """UPDATE sessions
               SET concepts_read = concepts_read + ?,
                   questions_answered = questions_answered + ?,
                   correct_answers = correct_answers + ?,
                   xp_earned = xp_earned + ?
               WHERE id=?""",
            (body.concepts_read, body.questions_answered, body.correct_answers,
             body.xp_earned, session_id),
        )
        await db.commit()
        return {"session_id": session_id, "updated": True}
    finally:
        await db.close()


@router.post("/{session_id}/end")
async def end_session(session_id: int):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM sessions WHERE id=?", (session_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Session not found")
        await db.execute(
            "UPDATE sessions SET ended_at=CURRENT_TIMESTAMP WHERE id=?",
            (session_id,),
        )
        await db.commit()
        return {"session_id": session_id, "ended": True}
    finally:
        await db.close()
