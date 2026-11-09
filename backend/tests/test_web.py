"""Single-process "app mode": the API also serves the built frontend."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def _client(dist):
    return TestClient(create_app(Settings(database_url="sqlite:///:memory:", frontend_dist=dist)))


def test_serves_built_frontend_and_keeps_api(tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html><title>KF</title>", encoding="utf-8")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")

    with _client(tmp_path) as client:
        page = client.get("/")
        assert page.status_code == 200
        assert "<title>KF</title>" in page.text
        assert client.get("/assets/app.js").status_code == 200
        # API routes are not shadowed by the static mount.
        assert client.get("/api/v1/health").json()["status"] == "ok"
        missing = client.get("/api/v1/projects/nope")
        assert missing.status_code == 404
        assert missing.json()["error"]["code"] == "project_not_found"


def test_shows_instructions_when_frontend_not_built(tmp_path):
    with _client(tmp_path / "does-not-exist") as client:
        page = client.get("/")
        assert page.status_code == 200
        assert "npm run build" in page.text
        assert client.get("/api/v1/health").status_code == 200


def test_frontend_serving_can_be_disabled():
    with _client(None) as client:
        assert "npm run build" in client.get("/").text
