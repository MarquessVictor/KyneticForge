"""Project persistence use-cases (create, list, read, update, delete, import, export)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import APP_VERSION
from app.models.project import ProjectORM
from app.robotics.presets import default_robot_config
from app.schemas.project import (
    PROJECT_SCHEMA_VERSION,
    ProjectCreate,
    ProjectDocument,
    ProjectDocumentBody,
    ProjectRead,
    ProjectSummary,
    ProjectUpdate,
)
from app.schemas.robot import RobotConfig
from app.services.migrations import upgrade_document


class ProjectNotFoundError(LookupError):
    def __init__(self, project_id: str) -> None:
        super().__init__(f"project '{project_id}' was not found")
        self.project_id = project_id


class InvalidProjectDocumentError(ValueError):
    def __init__(self, message: str, details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(message)
        self.details = details or []


def default_robot() -> RobotConfig:
    return RobotConfig.model_validate(default_robot_config())


def _as_utc(value: datetime) -> datetime:
    # SQLite does not keep tz info; all stored timestamps are UTC.
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _robot_json(robot: RobotConfig) -> dict[str, Any]:
    return robot.model_dump(mode="json", by_alias=True)


def to_summary(row: ProjectORM) -> ProjectSummary:
    return ProjectSummary(
        id=row.id,
        name=row.name,
        description=row.description,
        created_at=_as_utc(row.created_at),
        updated_at=_as_utc(row.updated_at),
    )


def to_read(row: ProjectORM) -> ProjectRead:
    return ProjectRead(
        id=row.id,
        name=row.name,
        description=row.description,
        created_at=_as_utc(row.created_at),
        updated_at=_as_utc(row.updated_at),
        schema_version=row.schema_version,
        robot=RobotConfig.model_validate(row.robot_config),
    )


def list_projects(db: Session) -> list[ProjectSummary]:
    rows = db.scalars(select(ProjectORM).order_by(ProjectORM.updated_at.desc())).all()
    return [to_summary(r) for r in rows]


def get_project(db: Session, project_id: str) -> ProjectRead:
    return to_read(_get_row(db, project_id))


def create_project(db: Session, payload: ProjectCreate) -> ProjectRead:
    robot = payload.robot or default_robot()
    now = datetime.now(UTC)
    row = ProjectORM(
        name=payload.name,
        description=payload.description,
        schema_version=PROJECT_SCHEMA_VERSION,
        robot_config=_robot_json(robot),
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_read(row)


def update_project(db: Session, project_id: str, payload: ProjectUpdate) -> ProjectRead:
    row = _get_row(db, project_id)
    if payload.name is not None:
        row.name = payload.name
    if payload.description is not None:
        row.description = payload.description
    if payload.robot is not None:
        row.robot_config = _robot_json(payload.robot)
        row.schema_version = PROJECT_SCHEMA_VERSION
    row.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(row)
    return to_read(row)


def delete_project(db: Session, project_id: str) -> None:
    row = _get_row(db, project_id)
    db.delete(row)
    db.commit()


def export_project(db: Session, project_id: str) -> ProjectDocument:
    project = get_project(db, project_id)
    return ProjectDocument(
        schema_version=PROJECT_SCHEMA_VERSION,
        app_version=APP_VERSION,
        exported_at=datetime.now(UTC),
        project=ProjectDocumentBody(
            name=project.name, description=project.description, robot=project.robot
        ),
    )


def parse_project_document(raw: Any) -> ProjectDocument:
    """Validate (and migrate) an untrusted project document.

    Raises:
        InvalidProjectDocumentError: with a human-readable message and details.
    """
    if not isinstance(raw, dict):
        raise InvalidProjectDocumentError("project document must be a JSON object")
    if raw.get("format") != "kyneticforge.project":
        raise InvalidProjectDocumentError(
            "not a KyneticForge project document (expected format 'kyneticforge.project')"
        )
    try:
        upgraded = upgrade_document(raw)
    except ValueError as exc:
        raise InvalidProjectDocumentError(str(exc)) from exc
    try:
        return ProjectDocument.model_validate(upgraded)
    except ValidationError as exc:
        details = [
            {"loc": [str(p) for p in err["loc"]], "message": err["msg"]} for err in exc.errors()
        ]
        raise InvalidProjectDocumentError("project document failed validation", details) from exc


def import_project(db: Session, raw: Any) -> ProjectRead:
    document = parse_project_document(raw)
    body = document.project
    return create_project(
        db, ProjectCreate(name=body.name, description=body.description, robot=body.robot)
    )


def _get_row(db: Session, project_id: str) -> ProjectORM:
    row = db.get(ProjectORM, project_id)
    if row is None:
        raise ProjectNotFoundError(project_id)
    return row
