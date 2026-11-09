"""Persistence tests against a real (temporary file) SQLite database."""

from __future__ import annotations

import pytest

from app.database.session import Database
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services import project_service
from app.services.migrations import UnsupportedSchemaVersionError, upgrade_document


@pytest.fixture
def database(tmp_path):
    db = Database(f"sqlite:///{(tmp_path / 'kf.db').as_posix()}")
    db.create_schema()
    yield db
    db.dispose()


def test_projects_persist_across_sessions(database):
    with database.session_factory() as session:
        created = project_service.create_project(session, ProjectCreate(name="Persisted"))

    with database.session_factory() as session:
        loaded = project_service.get_project(session, created.id)
    assert loaded.name == "Persisted"
    assert loaded.robot == created.robot
    assert loaded.created_at.tzinfo is not None


def test_update_changes_timestamp_and_keeps_created(database):
    with database.session_factory() as session:
        created = project_service.create_project(session, ProjectCreate(name="A"))
        updated = project_service.update_project(session, created.id, ProjectUpdate(name="B"))
    assert updated.created_at == created.created_at
    assert updated.updated_at >= created.updated_at


def test_list_orders_by_most_recently_updated(database):
    with database.session_factory() as session:
        a = project_service.create_project(session, ProjectCreate(name="A"))
        project_service.create_project(session, ProjectCreate(name="B"))
        project_service.update_project(session, a.id, ProjectUpdate(description="touched"))
        names = [p.name for p in project_service.list_projects(session)]
    assert names == ["A", "B"]


def test_missing_project_raises(database):
    with database.session_factory() as session, pytest.raises(project_service.ProjectNotFoundError):
        project_service.get_project(session, "nope")


def test_upgrade_document_current_version_is_identity():
    doc = {"schemaVersion": 1, "format": "kyneticforge.project"}
    assert upgrade_document(doc) == doc


@pytest.mark.parametrize("version", [0, -1, "1", None, True, 2])
def test_upgrade_document_rejects_unsupported_versions(version):
    with pytest.raises(UnsupportedSchemaVersionError):
        upgrade_document({"schemaVersion": version})
