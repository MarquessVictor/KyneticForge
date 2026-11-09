from __future__ import annotations

import math

import pytest
from pydantic import ValidationError

from app.core.units import LengthUnit, deg_to_rad, length_from_si, length_to_si, rad_to_deg
from app.robotics.kinematics import ArmGeometry
from app.robotics.validation import (
    JointLimit,
    is_within_limits,
    validate_geometry,
    validate_joint_angles,
    validate_joint_limits,
)
from app.schemas.robot import RobotConfig

LIMITS = [JointLimit(-math.pi, math.pi), JointLimit(-0.5, 2.0), JointLimit(-2.0, 2.0)]


# --- units ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("value", "unit", "metres"),
    [(1.0, "m", 1.0), (250.0, "cm", 2.5), (300.0, "mm", 0.3), (0.0, LengthUnit.MILLIMETRE, 0.0)],
)
def test_length_conversion_roundtrip(value, unit, metres):
    assert math.isclose(length_to_si(value, unit), metres)
    assert math.isclose(length_from_si(metres, unit), value)


def test_unknown_unit_rejected():
    with pytest.raises(ValueError):
        length_to_si(1.0, "inch")


@pytest.mark.parametrize(
    ("deg", "rad"), [(0, 0), (180, math.pi), (-90, -math.pi / 2), (360, 2 * math.pi)]
)
def test_angle_conversion(deg, rad):
    assert math.isclose(deg_to_rad(deg), rad, abs_tol=1e-15)
    assert math.isclose(rad_to_deg(rad), deg, abs_tol=1e-12)


# --- geometry -------------------------------------------------------------------------


def test_valid_geometry_has_no_issues():
    assert validate_geometry(ArmGeometry(0.3, 0.4, 0.3)) == []


def test_zero_base_height_is_allowed():
    assert validate_geometry(ArmGeometry(0.0, 0.4, 0.3)) == []


@pytest.mark.parametrize(
    ("geom", "field"),
    [
        (ArmGeometry(-0.1, 0.4, 0.3), "geometry.baseHeight"),
        (ArmGeometry(0.3, 0.0, 0.3), "geometry.upperArmLength"),
        (ArmGeometry(0.3, 0.4, 11.0), "geometry.forearmLength"),
        (ArmGeometry(0.3, math.inf, 0.3), "geometry.upperArmLength"),
    ],
)
def test_invalid_geometry(geom, field):
    issues = validate_geometry(geom)
    assert [i.field for i in issues] == [field]


# --- joint limits ---------------------------------------------------------------------


def test_valid_limits():
    assert validate_joint_limits(LIMITS) == []


def test_inverted_limits_rejected():
    issues = validate_joint_limits([JointLimit(1.0, -1.0), *LIMITS[1:]])
    assert issues and "lower than maximum" in issues[0].message


def test_limits_beyond_full_turn_rejected():
    issues = validate_joint_limits([JointLimit(-7.0, 0.0), *LIMITS[1:]])
    assert issues and "[-360°, 360°]" in issues[0].message


def test_limit_count_enforced():
    assert validate_joint_limits(LIMITS[:2])


def test_angles_exactly_on_limits_are_accepted():
    assert validate_joint_angles([-math.pi, 2.0, -2.0], LIMITS) == []
    assert is_within_limits(2.0 + 1e-12, LIMITS[1])


def test_angle_outside_limit_reports_degrees():
    issues = validate_joint_angles([0.0, 2.1, 0.0], LIMITS)
    assert len(issues) == 1
    assert issues[0].field == "joints[1].angle"
    assert "outside the joint limits" in issues[0].message


def test_non_finite_angle_rejected():
    assert (
        validate_joint_angles([0.0, math.nan, 0.0], LIMITS)[0].message == "must be a finite number"
    )


# --- RobotConfig schema (domain rules wired into Pydantic) ----------------------------


def test_default_robot_is_valid(robot):
    RobotConfig.model_validate(robot)


def test_robot_with_angle_outside_limits_is_rejected(robot):
    robot["joints"][2]["angle"] = math.radians(170)
    with pytest.raises(ValidationError, match="outside the joint limits"):
        RobotConfig.model_validate(robot)


def test_robot_with_home_outside_limits_is_rejected(robot):
    robot["joints"][1]["homeAngle"] = math.radians(-90)
    with pytest.raises(ValidationError, match="homeAngle"):
        RobotConfig.model_validate(robot)


def test_robot_with_wrong_joint_ids_is_rejected(robot):
    robot["joints"][0]["id"] = "base"
    with pytest.raises(ValidationError, match="joint ids"):
        RobotConfig.model_validate(robot)


def test_robot_with_unknown_fields_is_rejected(robot):
    robot["script"] = "import os"
    with pytest.raises(ValidationError):
        RobotConfig.model_validate(robot)


def test_robot_with_nan_is_rejected(robot):
    robot["geometry"]["forearmLength"] = float("nan")
    with pytest.raises(ValidationError):
        RobotConfig.model_validate(robot)
