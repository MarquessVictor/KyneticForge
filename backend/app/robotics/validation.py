"""Domain validation rules for robot geometry and joint configuration.

These rules are the single source of truth for what a valid KyneticForge
3-DOF arm looks like. Pydantic schemas call into this module so that the
``/robotics/validate`` endpoint, project persistence and import all apply the
same checks.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

from app.robotics.kinematics import JOINT_COUNT, JOINT_IDS, ArmGeometry

#: Minimum length of a link (m). Prevents degenerate, zero-length links.
MIN_LINK_LENGTH = 0.01
#: Maximum length of any geometric parameter (m).
MAX_LENGTH = 10.0
#: Base height may be zero (shoulder on the floor) but not negative.
MIN_BASE_HEIGHT = 0.0
#: Joint limits must lie in [-2π, 2π] (one full turn each way).
ANGLE_BOUND = 2.0 * math.pi
#: Numerical tolerance when comparing angles against limits (rad).
LIMIT_TOLERANCE = 1e-9

Severity = Literal["error", "warning"]


@dataclass(frozen=True, slots=True)
class ValidationIssue:
    field: str
    message: str
    severity: Severity = "error"


@dataclass(frozen=True, slots=True)
class JointLimit:
    min_angle: float
    max_angle: float


def validate_geometry(geometry: ArmGeometry) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    checks = (
        ("geometry.baseHeight", geometry.base_height, MIN_BASE_HEIGHT),
        ("geometry.upperArmLength", geometry.upper_arm_length, MIN_LINK_LENGTH),
        ("geometry.forearmLength", geometry.forearm_length, MIN_LINK_LENGTH),
    )
    for field, value, minimum in checks:
        if not math.isfinite(value):
            issues.append(ValidationIssue(field, "must be a finite number"))
        elif value < minimum:
            issues.append(ValidationIssue(field, f"must be at least {minimum:g} m"))
        elif value > MAX_LENGTH:
            issues.append(ValidationIssue(field, f"must not exceed {MAX_LENGTH:g} m"))
    return issues


def validate_joint_limits(limits: Sequence[JointLimit]) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    if len(limits) != JOINT_COUNT:
        return [ValidationIssue("joints", f"exactly {JOINT_COUNT} joints are required")]
    for index, limit in enumerate(limits):
        prefix = f"joints[{index}]"
        lo, hi = limit.min_angle, limit.max_angle
        if not (math.isfinite(lo) and math.isfinite(hi)):
            issues.append(ValidationIssue(prefix, "joint limits must be finite numbers"))
            continue
        if lo < -ANGLE_BOUND - LIMIT_TOLERANCE or hi > ANGLE_BOUND + LIMIT_TOLERANCE:
            issues.append(ValidationIssue(prefix, "joint limits must lie within [-360°, 360°]"))
        if lo >= hi:
            issues.append(ValidationIssue(prefix, "minimum angle must be lower than maximum angle"))
    return issues


def is_within_limits(angle: float, limit: JointLimit) -> bool:
    return limit.min_angle - LIMIT_TOLERANCE <= angle <= limit.max_angle + LIMIT_TOLERANCE


def validate_joint_angles(
    angles: Sequence[float],
    limits: Sequence[JointLimit] | None = None,
    field_name: str = "angle",
) -> list[ValidationIssue]:
    """Check that angles are finite and (optionally) within their joint limits."""
    if len(angles) != JOINT_COUNT:
        return [ValidationIssue("jointAngles", f"exactly {JOINT_COUNT} angles are required")]
    issues: list[ValidationIssue] = []
    for index, angle in enumerate(angles):
        prefix = f"joints[{index}].{field_name}"
        if not math.isfinite(angle):
            issues.append(ValidationIssue(prefix, "must be a finite number"))
            continue
        if limits is not None and not is_within_limits(angle, limits[index]):
            lo, hi = limits[index].min_angle, limits[index].max_angle
            issues.append(
                ValidationIssue(
                    prefix,
                    f"{math.degrees(angle):.3f}° is outside the joint limits "
                    f"[{math.degrees(lo):.3f}°, {math.degrees(hi):.3f}°]",
                )
            )
    return issues


def validate_joint_ids(ids: Sequence[str]) -> list[ValidationIssue]:
    if tuple(ids) != JOINT_IDS:
        return [ValidationIssue("joints", f"joint ids must be {list(JOINT_IDS)} in this order")]
    return []


def validate_robot(
    geometry: ArmGeometry,
    joint_ids: Sequence[str],
    limits: Sequence[JointLimit],
    angles: Sequence[float],
    home_angles: Sequence[float],
) -> list[ValidationIssue]:
    """Run every domain rule for a full robot configuration."""
    issues = validate_geometry(geometry)
    issues += validate_joint_ids(joint_ids)
    limit_issues = validate_joint_limits(limits)
    issues += limit_issues
    # Angle-vs-limit checks are only meaningful when the limits themselves are valid.
    usable_limits = limits if not limit_issues else None
    issues += validate_joint_angles(angles, usable_limits, "angle")
    issues += validate_joint_angles(home_angles, usable_limits, "homeAngle")
    return issues
