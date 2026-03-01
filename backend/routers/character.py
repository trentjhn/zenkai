from fastapi import APIRouter
from backend.database import get_db

router = APIRouter(prefix="/character", tags=["character"])


@router.get("")
async def get_character(user_id: int = 1):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM users WHERE id=?", (user_id,)) as cur:
            user = await cur.fetchone()
        async with db.execute(
            "SELECT slot, item_name, item_type FROM character_equipment WHERE user_id=?",
            (user_id,),
        ) as cur:
            equipment = await cur.fetchall()
        return {
            **dict(user),
            "equipment": [dict(e) for e in equipment],
        }
    finally:
        await db.close()
