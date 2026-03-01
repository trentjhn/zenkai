"""
Database initialization and connection management for Zenkai.
Full schema is in schema.sql — loaded on first startup via init_db().
"""
import os
import aiosqlite
from pathlib import Path


def get_db_path() -> str:
    db_path = os.getenv("DB_PATH")
    if not db_path:
        raise RuntimeError("DB_PATH environment variable is not set. Set it in your .env file.")
    return db_path


async def init_db() -> None:
    """Initialize the SQLite database, creating all tables from schema.sql."""
    db_path = get_db_path()
    schema_file = Path(__file__).parent / "schema.sql"

    async with aiosqlite.connect(db_path) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")

        if schema_file.exists():
            schema_sql = schema_file.read_text()
            await db.executescript(schema_sql)

        await db.commit()
