"""Robot configuration schemas.

Two layers:

* ``*Input`` models only enforce *structure* (types, finiteness, sizes). They are
  used by ``/robotics/validate`` so it can return a full issue report instead of
  failing at the first error.
* ``RobotConfig`` additionally enforces every *domain* rule from
  :mod:`app.robotics.validation` and is used wherever a robot is persisted or
  rendered (project create/update/import).
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field, model_validator

from app.robotics.kinematics import ArmGeometry
from app.robotics.validation import JointLimit, ValidationIssue, validate_robot
from app.schemas.base import ApiModel

RobotModel = Literal["rrr-3dof"]
DisplayUnit = Literal["m", "cm", "mm"]


class GeometryInput(ApiModel):
    """Arm geometry in metres."""

    base_height: float = Field(description="Distance from floor to shoulder axis (m).")
    upper_arm_length: float = Field(description="Shoulder to elbow length L1 (m).")
    forearm_length: float = Field(description="Elbow to end-effector length L2 (m).")

    def to_domain(self) -> ArmGeometry:
        return ArmGeometry(self.base_height, self.upper_arm_length, self.forearm_length)


class JointInput(ApiModel):
    """A revolute joint. All angles in radians."""

    id: str = Field(max_length=16)
    name: str = Field(min_length=1, max_length=60)
    min_angle: float
    max_angle: float
    home_angle: float
    angle: float

    def limit(self) -> JointLimit:
        return JointLimit(self.min_angle, self.max_angle)


class RobotConfigInput(ApiModel):
    model: RobotModel = "rrr-3dof"
    geometry: GeometryInput
    joints: list[JointInput] = Field(min_length=3, max_length=3)
    display_unit: DisplayUnit = "m"

    def domain_issues(self) -> list[ValidationIssue]:
        return validate_robot(
            geometry=self.geometry.to_domain(),
            joint_ids=[j.id for j in self.joints],
            limits=[j.limit() for j in self.joints],
            angles=[j.angle for j in self.joints],
            home_angles=[j.home_angle for j in self.joints],
        )


class RobotConfig(RobotConfigInput):
    """A robot configuration that satisfies every domain rule."""

    @model_validator(mode="after")
    def _check_domain_rules(self) -> RobotConfig:
        errors = [i for i in self.domain_issues() if i.severity == "error"]
        if errors:
            details = "; ".join(f"{i.field}: {i.message}" for i in errors)
            raise ValueError(f"invalid robot configuration: {details}")
        return self


class ValidationIssueOut(ApiModel):
    field: str
    message: str
    severity: Literal["error", "warning"]


class ValidationReport(ApiModel):
    valid: bool
    issues: list[ValidationIssueOut]
