from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.robotics.presets import default_robot_config


@pytest.fixture
def client() -> Iterator[TestClient]:
    app = create_app(Settings(database_url="sqlite:///:memory:"))
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def robot() -> dict[str, Any]:
    return default_robot_config()
