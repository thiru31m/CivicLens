import pytest
from backend.app.seed import seed_database
from backend.app.database import engine, Base


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    seed_database()
    yield
