from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.database import init_db
    await init_db()
    yield


app = FastAPI(title="Zenkai API", version="0.1.0", lifespan=lifespan)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)


from backend.routers import modules, concepts, progress, character, sessions, pipeline

app.include_router(modules.router)
app.include_router(concepts.router)
app.include_router(progress.router)
app.include_router(character.router)
app.include_router(sessions.router)
app.include_router(pipeline.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
