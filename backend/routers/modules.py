from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.database import get_db

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("")
async def list_modules():
    db = await get_db()
    try:
        async with db.execute(
            "SELECT id, order_index, title, is_unlocked, quiz_score_achieved FROM modules ORDER BY order_index"
        ) as cursor:
            rows = await cursor.fetchall()
        result = []
        for row in rows:
            item = dict(row)
            item["is_unlocked"] = bool(item["is_unlocked"])
            result.append(item)
        return result
    finally:
        await db.close()


@router.get("/{module_id}")
async def get_module(module_id: int):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM modules WHERE id=?", (module_id,)) as cursor:
            module = await cursor.fetchone()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        async with db.execute(
            "SELECT id, order_index, title FROM concepts WHERE module_id=? ORDER BY order_index",
            (module_id,),
        ) as cursor:
            concepts = await cursor.fetchall()
        result = dict(module)
        result["concepts"] = [dict(c) for c in concepts]
        return result
    finally:
        await db.close()


class CompleteRequest(BaseModel):
    user_id: int = 1


@router.post("/{module_id}/complete")
async def complete_module(module_id: int, body: CompleteRequest):
    db = await get_db()
    try:
        async with db.execute(
            "SELECT id, order_index FROM modules WHERE id=?", (module_id,)
        ) as cur:
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
