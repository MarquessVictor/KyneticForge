"""Adapters between API schemas and the robotics engine."""

from __future__ import annotations

from app.robotics.kinematics import forward_kinematics
from app.robotics.validation import (
    JointLimit,
    ValidationIssue,
    validate_geometry,
    validate_joint_angles,
    validate_joint_limits,
)
from app.schemas.kinematics import (
    DHRow,
    EndEffectorOut,
    ForwardKinematicsRequest,
    ForwardKinematicsResponse,
    JointStateOut,
)
from app.schemas.robot import RobotConfigInput, ValidationIssueOut, ValidationReport


class KinematicsInputError(ValueError):
    def __init__(self, issues: list[ValidationIssue]) -> None:
        super().__init__("; ".join(f"{i.field}: {i.message}" for i in issues))
        self.issues = issues


def compute_forward_kinematics(request: ForwardKinematicsRequest) -> ForwardKinematicsResponse:
    geometry = request.geometry.to_domain()
    issues = validate_geometry(geometry)
    limits = None
    if request.joint_limits is not None:
        limits = [JointLimit(lim.min_angle, lim.max_angle) for lim in request.joint_limits]
        issues += validate_joint_limits(limits)
    issues += validate_joint_angles(request.joint_angles, limits if not issues else None)
    if issues:
        raise KinematicsInputError(issues)

    result = forward_kinematics(geometry, request.joint_angles)
    return ForwardKinematicsResponse(
        joint_angles=list(result.joint_angles),
        dh_table=[DHRow(theta=p.theta, d=p.d, a=p.a, alpha=p.alpha) for p in result.dh_table],
        local_transforms=[m.tolist() for m in result.local_transforms],
        frames=[m.tolist() for m in result.frames],
        joints=[
            JointStateOut(id=j.joint_id, position=j.position.tolist(), axis=j.axis.tolist())
            for j in result.joints
        ],
        end_effector=EndEffectorOut(
            position=result.end_effector_position.tolist(),
            rotation=result.end_effector_rotation.tolist(),
            transform=result.end_effector.tolist(),
        ),
    )


def validate_robot_config(config: RobotConfigInput) -> ValidationReport:
    issues = config.domain_issues()
    return ValidationReport(
        valid=not any(i.severity == "error" for i in issues),
        issues=[
            ValidationIssueOut(field=i.field, message=i.message, severity=i.severity)
            for i in issues
        ],
    )
