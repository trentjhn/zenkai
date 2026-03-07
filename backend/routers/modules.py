from fastapi import APIRouter, HTTPException
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
        return [dict(row) for row in rows]
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
