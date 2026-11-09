"""Request/response schemas for the forward-kinematics endpoint."""

from __future__ import annotations

from pydantic import Field

from app.schemas.base import ApiModel
from app.schemas.robot import GeometryInput

Vector3 = list[float]
Matrix3 = list[list[float]]
Matrix4 = list[list[float]]


class JointLimitInput(ApiModel):
    min_angle: float
    max_angle: float


class ForwardKinematicsRequest(ApiModel):
    geometry: GeometryInput
    joint_angles: list[float] = Field(min_length=3, max_length=3, description="Radians.")
    joint_limits: list[JointLimitInput] | None = Field(
        default=None,
        min_length=3,
        max_length=3,
        description="Optional limits; when given, angles outside them are rejected.",
    )


class DHRow(ApiModel):
    theta: float
    d: float
    a: float
    alpha: float


class JointStateOut(ApiModel):
    id: str
    position: Vector3
    axis: Vector3


class EndEffectorOut(ApiModel):
    position: Vector3
    rotation: Matrix3
    transform: Matrix4


class ForwardKinematicsResponse(ApiModel):
    joint_angles: list[float]
    dh_table: list[DHRow]
    local_transforms: list[Matrix4]
    frames: list[Matrix4]
    joints: list[JointStateOut]
    end_effector: EndEffectorOut
