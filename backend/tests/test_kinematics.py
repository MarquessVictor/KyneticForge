from __future__ import annotations

import math

import numpy as np
import pytest

from app.robotics.kinematics import (
    ArmGeometry,
    end_effector_position_closed_form,
    forward_kinematics,
)
from app.robotics.transforms import is_rigid_transform

GEOM = ArmGeometry(base_height=0.3, upper_arm_length=0.4, forearm_length=0.3)
d = math.radians


def ee(angles, geom=GEOM):
    return forward_kinematics(geom, angles).end_effector_position


# --- Known, analytically verifiable poses ------------------------------------------------


def test_zero_pose_arm_stretched_along_x():
    np.testing.assert_allclose(ee([0, 0, 0]), [0.7, 0.0, 0.3], atol=1e-12)


def test_shoulder_vertical_points_straight_up():
    np.testing.assert_allclose(ee([0, d(90), 0]), [0.0, 0.0, 1.0], atol=1e-12)


def test_base_rotation_quarter_turn_moves_arm_to_y():
    np.testing.assert_allclose(ee([d(90), 0, 0]), [0.0, 0.7, 0.3], atol=1e-12)


def test_base_rotation_half_turn_moves_arm_to_negative_x():
    np.testing.assert_allclose(ee([d(180), 0, 0]), [-0.7, 0.0, 0.3], atol=1e-12)


def test_elbow_right_angle_down():
    # Upper arm horizontal, forearm pointing straight down.
    np.testing.assert_allclose(ee([0, 0, d(-90)]), [0.4, 0.0, 0.0], atol=1e-12)


def test_elbow_fully_folded_returns_to_shoulder_offset():
    # L1 = 0.4, L2 = 0.3 folded back: tip at 0.1 m from the shoulder.
    np.testing.assert_allclose(ee([0, 0, d(180)]), [0.1, 0.0, 0.3], atol=1e-12)


def test_45_45_pose():
    s = math.sqrt(2) / 2
    expected = [0.4 * s + 0.0, 0.0, 0.3 + 0.4 * s + 0.3]
    np.testing.assert_allclose(ee([0, d(45), d(45)]), expected, atol=1e-12)


def test_joint_positions_and_axes():
    fk = forward_kinematics(GEOM, [0, 0, 0])
    np.testing.assert_allclose(fk.joints[0].position, [0, 0, 0], atol=1e-12)
    np.testing.assert_allclose(fk.joints[1].position, [0, 0, 0.3], atol=1e-12)
    np.testing.assert_allclose(fk.joints[2].position, [0.4, 0, 0.3], atol=1e-12)
    # Base axis is world Z; shoulder/elbow axes are horizontal, perpendicular to the arm plane.
    np.testing.assert_allclose(fk.joints[0].axis, [0, 0, 1], atol=1e-12)
    np.testing.assert_allclose(fk.joints[1].axis, [0, -1, 0], atol=1e-12)
    np.testing.assert_allclose(fk.joints[2].axis, [0, -1, 0], atol=1e-12)


def test_positive_shoulder_angle_raises_the_arm():
    assert ee([0, d(10), 0])[2] > ee([0, 0, 0])[2]


# --- Structural properties -------------------------------------------------------------


@pytest.mark.parametrize(
    "angles",
    [
        [0, 0, 0],
        [d(30), d(60), d(-75)],
        [d(-180), d(-45), d(-150)],
        [d(180), d(135), d(150)],
        [1.234, -2.1, 0.77],
    ],
)
def test_matrix_chain_matches_closed_form(angles):
    np.testing.assert_allclose(
        ee(angles), end_effector_position_closed_form(GEOM, angles), atol=1e-12
    )


@pytest.mark.parametrize("angles", [[0, 0, 0], [0.4, -1.0, 2.0], [math.pi, math.pi, -math.pi]])
def test_frames_are_rigid_and_cumulative(angles):
    fk = forward_kinematics(GEOM, angles)
    for frame in fk.frames:
        assert is_rigid_transform(frame)
    np.testing.assert_allclose(
        fk.frames[2],
        fk.local_transforms[0] @ fk.local_transforms[1] @ fk.local_transforms[2],
        atol=1e-12,
    )


def test_link_lengths_are_preserved():
    rng = np.random.default_rng(7)
    for _ in range(50):
        q = rng.uniform(-math.pi, math.pi, size=3)
        fk = forward_kinematics(GEOM, q)
        shoulder, elbow = fk.joints[1].position, fk.joints[2].position
        assert math.isclose(np.linalg.norm(elbow - shoulder), 0.4, abs_tol=1e-12)
        assert math.isclose(np.linalg.norm(fk.end_effector_position - elbow), 0.3, abs_tol=1e-12)
        # The tip can never exceed the maximum reach from the shoulder.
        assert np.linalg.norm(fk.end_effector_position - shoulder) <= GEOM.max_reach + 1e-12


def test_end_effector_rotation_in_zero_pose():
    fk = forward_kinematics(GEOM, [0, 0, 0])
    # x3 along world X (arm direction), y3 along world Z, z3 along world -Y.
    np.testing.assert_allclose(
        fk.end_effector_rotation, [[1, 0, 0], [0, 0, -1], [0, 1, 0]], atol=1e-12
    )


# --- Invalid input -------------------------------------------------------------------


@pytest.mark.parametrize("angles", [[0, 0], [0, 0, 0, 0], []])
def test_wrong_number_of_angles_rejected(angles):
    with pytest.raises(ValueError, match="expected 3 joint angles"):
        forward_kinematics(GEOM, angles)


@pytest.mark.parametrize("bad", [math.nan, math.inf, -math.inf])
def test_non_finite_angles_rejected(bad):
    with pytest.raises(ValueError, match="finite"):
        forward_kinematics(GEOM, [0, bad, 0])


def test_non_finite_geometry_rejected():
    with pytest.raises(ValueError, match="finite"):
        forward_kinematics(ArmGeometry(0.3, math.nan, 0.3), [0, 0, 0])
