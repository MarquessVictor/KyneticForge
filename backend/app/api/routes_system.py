"""Health and configuration endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import APP_NAME, APP_VERSION
from app.robotics.validation import ANGLE_BOUND, MAX_LENGTH, MIN_BASE_HEIGHT, MIN_LINK_LENGTH
from app.schemas.base import ApiModel
from app.schemas.project import PROJECT_SCHEMA_VERSION
from app.schemas.robot import RobotConfig
from app.services.project_service import default_robot

router = APIRouter(tags=["system"])


class HealthResponse(ApiModel):
    status: str
    name: str
    version: str


class GeometryConstraints(ApiModel):
    min_link_length: float
    min_base_height: float
    max_length: float
    angle_bound: float


class AppConfigResponse(ApiModel):
    name: str
    version: str
    project_schema_version: int
    default_robot: RobotConfig
    constraints: GeometryConstraints


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", name=APP_NAME, version=APP_VERSION)


@router.get("/config", response_model=AppConfigResponse)
def app_config() -> AppConfigResponse:
    return AppConfigResponse(
        name=APP_NAME,
        version=APP_VERSION,
        project_schema_version=PROJECT_SCHEMA_VERSION,
        default_robot=default_robot(),
        constraints=GeometryConstraints(
            min_link_length=MIN_LINK_LENGTH,
            min_base_height=MIN_BASE_HEIGHT,
            max_length=MAX_LENGTH,
            angle_bound=ANGLE_BOUND,
        ),
    )
