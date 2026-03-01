import json
from fastapi import APIRouter, HTTPException
from backend.database import get_db

router = APIRouter(prefix="/concepts", tags=["concepts"])


@router.get("/{concept_id}")
async def get_concept(concept_id: int):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM concepts WHERE id=?", (concept_id,)) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Concept not found")
        data = dict(row)
        for field in ("default_layer", "deep_layer", "prediction_question", "worked_example"):
            if data.get(field):
                try:
                    data[field] = json.loads(data[field])
                except (json.JSONDecodeError, TypeError):
                    pass
        return data
    finally:
        await db.close()


@router.get("/{concept_id}/quiz")
async def get_concept_quiz(concept_id: int):
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM quiz_questions WHERE concept_id=? ORDER BY id",
            (concept_id,),
        ) as cursor:
            rows = await cursor.fetchall()
        results = []
        for row in rows:
            q = dict(row)
            for field in ("options",):
                if q.get(field):
                    try:
                        q[field] = json.loads(q[field])
                    except (json.JSONDecodeError, TypeError):
                        pass
            results.append(q)
        return results
    finally:
        await db.close()
