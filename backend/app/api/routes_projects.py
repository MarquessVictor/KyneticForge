"""Project CRUD, export and import endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_app_settings, get_db
from app.core.config import Settings
from app.schemas.project import (
    ProjectCreate,
    ProjectDocument,
    ProjectRead,
    ProjectSummary,
    ProjectUpdate,
)
from app.services import project_service
from app.services.project_service import InvalidProjectDocumentError

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSummary])
def list_projects(db: Session = Depends(get_db)) -> list[ProjectSummary]:
    return project_service.list_projects(db)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> ProjectRead:
    return project_service.create_project(db, payload)


@router.post("/import", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def import_project(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
) -> ProjectRead:
    """Import a project document. The body is parsed and validated here, never executed."""
    body = await request.body()
    if len(body) > settings.max_import_bytes:
        raise InvalidProjectDocumentError(
            f"document is larger than the {settings.max_import_bytes} byte limit"
        )
    try:
        raw = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise InvalidProjectDocumentError("document is not valid JSON") from exc
    return project_service.import_project(db, raw)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, db: Session = Depends(get_db)) -> ProjectRead:
    return project_service.get_project(db, project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)
) -> ProjectRead:
    return project_service.update_project(db, project_id, payload)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)) -> Response:
    project_service.delete_project(db, project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{project_id}/export", response_model=ProjectDocument)
def export_project(project_id: str, db: Session = Depends(get_db)) -> ProjectDocument:
    return project_service.export_project(db, project_id)
