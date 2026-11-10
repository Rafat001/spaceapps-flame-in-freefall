import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="flame-test-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp / 'test.sqlite'}"
os.environ["INDEX_PATH"] = str(_tmp / "index")
os.environ["AI_EMBEDDING_PROVIDER"] = "hash"   # offline + deterministic for tests
os.environ["AI_LLM_PROVIDER"] = "none"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.ingest.load import load  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def seeded():
    return load()


@pytest.fixture(scope="session")
def client(seeded):
    from app.main import app

    return TestClient(app)


@pytest.fixture()
def session(seeded):
    from app.db import SessionLocal

    s = SessionLocal()
    yield s
    s.close()
