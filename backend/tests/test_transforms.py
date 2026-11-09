from __future__ import annotations

import math

import numpy as np
import pytest

from app.robotics.transforms import (
    dh_transform,
    homogeneous,
    invert_transform,
    is_rigid_transform,
    rot_x,
    rot_y,
    rot_z,
    rotation_x,
    rotation_z,
    translation,
)


@pytest.mark.parametrize("rot", [rot_x, rot_y, rot_z])
@pytest.mark.parametrize("angle", [0.0, 0.3, -1.2, math.pi, 2.5])
def test_rotations_are_proper_orthonormal(rot, angle):
    r = rot(angle)
    np.testing.assert_allclose(r.T @ r, np.eye(3), atol=1e-12)
    assert math.isclose(np.linalg.det(r), 1.0, abs_tol=1e-12)


def test_rot_z_quarter_turn_maps_x_to_y():
    np.testing.assert_allclose(rot_z(math.pi / 2) @ [1, 0, 0], [0, 1, 0], atol=1e-12)


def test_rot_x_quarter_turn_maps_y_to_z():
    np.testing.assert_allclose(rot_x(math.pi / 2) @ [0, 1, 0], [0, 0, 1], atol=1e-12)


def test_rot_y_quarter_turn_maps_z_to_x():
    np.testing.assert_allclose(rot_y(math.pi / 2) @ [0, 0, 1], [1, 0, 0], atol=1e-12)


def test_homogeneous_layout():
    t = homogeneous(rot_z(0.5), [1.0, 2.0, 3.0])
    np.testing.assert_allclose(t[:3, :3], rot_z(0.5))
    np.testing.assert_allclose(t[:3, 3], [1, 2, 3])
    np.testing.assert_allclose(t[3], [0, 0, 0, 1])


def test_homogeneous_rejects_bad_shapes():
    with pytest.raises(ValueError):
        homogeneous(np.eye(2))
    with pytest.raises(ValueError):
        homogeneous(translation=[1.0, 2.0])


def test_dh_transform_matches_elementary_composition():
    theta, d, a, alpha = 0.7, 0.25, 0.4, -1.1
    expected = rotation_z(theta) @ translation(0, 0, d) @ translation(a, 0, 0) @ rotation_x(alpha)
    np.testing.assert_allclose(dh_transform(theta, d, a, alpha), expected, atol=1e-12)


def test_transform_order_matters():
    # Rotate-then-translate is not the same as translate-then-rotate.
    a = rotation_z(math.pi / 2) @ translation(1, 0, 0)
    b = translation(1, 0, 0) @ rotation_z(math.pi / 2)
    np.testing.assert_allclose(a[:3, 3], [0, 1, 0], atol=1e-12)
    np.testing.assert_allclose(b[:3, 3], [1, 0, 0], atol=1e-12)


def test_invert_transform_roundtrip():
    t = dh_transform(0.3, 0.1, 0.5, 1.0) @ dh_transform(-1.4, 0.0, 0.2, 0.0)
    np.testing.assert_allclose(t @ invert_transform(t), np.eye(4), atol=1e-12)
    np.testing.assert_allclose(invert_transform(t), np.linalg.inv(t), atol=1e-12)


def test_is_rigid_transform():
    assert is_rigid_transform(dh_transform(0.3, 0.1, 0.5, 1.0))
    scaled = np.eye(4)
    scaled[0, 0] = 2.0
    assert not is_rigid_transform(scaled)
    reflection = np.eye(4)
    reflection[2, 2] = -1.0
    assert not is_rigid_transform(reflection)
    nan = np.eye(4)
    nan[0, 3] = np.nan
    assert not is_rigid_transform(nan)
