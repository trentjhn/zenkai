import os
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks
from backend.database import get_db
from backend.pipeline.orchestrator import run_pipeline_for_module, generate_quiz_for_module

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


class SyncRequest(BaseModel):
    module_id: int


@router.post("/sync")
async def sync_module(body: SyncRequest, background_tasks: BackgroundTasks):
    kb_path = os.getenv("KB_PATH")
    if not kb_path:
        raise HTTPException(status_code=500, detail="KB_PATH not configured")
    background_tasks.add_task(run_pipeline_for_module, body.module_id, kb_path)
    return {"status": "queued", "module_id": body.module_id}


@router.post("/sync-quiz")
async def sync_quiz(body: SyncRequest, background_tasks: BackgroundTasks):
    kb_path = os.getenv("KB_PATH")
    if not kb_path:
        raise HTTPException(status_code=500, detail="KB_PATH not configured")
    background_tasks.add_task(generate_quiz_for_module, body.module_id, kb_path)
    return {"status": "queued", "module_id": body.module_id}


@router.get("/status")
async def pipeline_status():
    db = await get_db()
    try:
        async with db.execute(
            """SELECT module_id,
                      SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) as successes,
                      SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) as failures,
                      MAX(run_at) as last_run
               FROM pipeline_log
               GROUP BY module_id
               ORDER BY module_id"""
        ) as cur:
            rows = await cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()
