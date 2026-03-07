import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.database import init_db


@pytest.fixture
async def test_db(tmp_path, monkeypatch):
    """Isolated SQLite DB per test — never touches zenkai.db."""
    db_file = str(tmp_path / "test_zenkai.db")
    monkeypatch.setenv("DB_PATH", db_file)
    await init_db()
    return db_file


@pytest.fixture
async def client(test_db):
    """FastAPI AsyncClient wired to a fresh test DB."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
