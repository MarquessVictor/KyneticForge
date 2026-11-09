"""Robot validation and kinematics endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.kinematics import ForwardKinematicsRequest, ForwardKinematicsResponse
from app.schemas.robot import RobotConfigInput, ValidationReport
from app.services.kinematics_service import compute_forward_kinematics, validate_robot_config

router = APIRouter(tags=["robotics"])


@router.post("/robotics/validate", response_model=ValidationReport)
def validate_robot(config: RobotConfigInput) -> ValidationReport:
    """Return every domain issue of a robot configuration (never fails on domain errors)."""
    return validate_robot_config(config)


@router.post("/kinematics/forward", response_model=ForwardKinematicsResponse)
def forward(request: ForwardKinematicsRequest) -> ForwardKinematicsResponse:
    """Reference forward kinematics (NumPy). Angles in radians, lengths in metres."""
    return compute_forward_kinematics(request)
