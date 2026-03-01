"""
Database initialization and connection management for Zenkai.
Full schema is in schema.sql — loaded on first startup via init_db().
"""
import os
import aiosqlite
from pathlib import Path

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_db_path() -> str:
    db_path = os.getenv("DB_PATH")
    if not db_path:
        raise RuntimeError(
            "DB_PATH environment variable is not set. "
            "Copy .env.example to .env and set DB_PATH."
        )
    return db_path


async def get_db() -> aiosqlite.Connection:
    """Open a database connection with row_factory set for dict-like access."""
    db = await aiosqlite.connect(get_db_path())
    db.row_factory = aiosqlite.Row
    return db


async def init_db() -> None:
    """Initialize the SQLite database, creating all tables from schema.sql."""
    schema = SCHEMA_PATH.read_text()
    async with aiosqlite.connect(get_db_path()) as db:
        await db.executescript(schema)
        await db.commit()
