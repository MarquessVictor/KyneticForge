"""Project and project-document (export/import) schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.base import ApiModel
from app.schemas.robot import RobotConfig

#: Version of the exported project document format. Bump on breaking changes and
#: register a migration in :mod:`app.services.migrations`.
PROJECT_SCHEMA_VERSION = 1
PROJECT_DOCUMENT_FORMAT = "kyneticforge.project"

ProjectName = Field(min_length=1, max_length=120)
ProjectDescription = Field(default="", max_length=2000)


class ProjectCreate(ApiModel):
    name: str = ProjectName
    description: str = ProjectDescription
    robot: RobotConfig | None = Field(
        default=None, description="Robot configuration; the default arm is used when omitted."
    )


class ProjectUpdate(ApiModel):
    """Partial update: only provided fields are changed."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    robot: RobotConfig | None = None


class ProjectSummary(ApiModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime


class ProjectRead(ProjectSummary):
    schema_version: int
    robot: RobotConfig


class ProjectDocumentBody(ApiModel):
    name: str = ProjectName
    description: str = ProjectDescription
    robot: RobotConfig


class ProjectDocument(ApiModel):
    """Portable JSON document produced by export and accepted by import."""

    format: Literal["kyneticforge.project"] = PROJECT_DOCUMENT_FORMAT
    schema_version: int = Field(ge=1)
    app_version: str = Field(max_length=32)
    exported_at: datetime
    project: ProjectDocumentBody
