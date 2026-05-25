import os

os.environ["LBC_DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["LBC_SEED_DEMO_DATA"] = "true"
os.environ["LBC_SCHEDULER_ENABLED"] = "false"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client
