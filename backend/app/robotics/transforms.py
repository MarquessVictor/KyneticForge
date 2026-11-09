"""Homogeneous transformation primitives (SE(3)) built on NumPy.

Conventions
-----------
* Right-handed coordinate frames, angles in radians, lengths in metres (SI).
* A homogeneous transform ``T`` is a 4x4 ``float64`` matrix
  ``[[R, p], [0, 0, 0, 1]]`` mapping coordinates expressed in a child frame
  into its parent frame: ``x_parent = T @ x_child``.
* Transforms compose left-to-right along a kinematic chain:
  ``T_0_n = T_0_1 @ T_1_2 @ ... @ T_(n-1)_n``.
"""

from __future__ import annotations

import math

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]

#: Tolerance used to decide whether a matrix is a valid rigid-body transform.
ORTHONORMAL_TOLERANCE = 1e-9


def rot_x(angle: float) -> Matrix:
    """3x3 rotation matrix about the X axis."""
    c, s = math.cos(angle), math.sin(angle)
    return np.array([[1.0, 0.0, 0.0], [0.0, c, -s], [0.0, s, c]], dtype=np.float64)


def rot_y(angle: float) -> Matrix:
    """3x3 rotation matrix about the Y axis."""
    c, s = math.cos(angle), math.sin(angle)
    return np.array([[c, 0.0, s], [0.0, 1.0, 0.0], [-s, 0.0, c]], dtype=np.float64)


def rot_z(angle: float) -> Matrix:
    """3x3 rotation matrix about the Z axis."""
    c, s = math.cos(angle), math.sin(angle)
    return np.array([[c, -s, 0.0], [s, c, 0.0], [0.0, 0.0, 1.0]], dtype=np.float64)


def homogeneous(rotation: Matrix | None = None, translation: Matrix | None = None) -> Matrix:
    """Build a 4x4 homogeneous transform from a 3x3 rotation and a 3-vector translation."""
    t = np.eye(4, dtype=np.float64)
    if rotation is not None:
        r = np.asarray(rotation, dtype=np.float64)
        if r.shape != (3, 3):
            raise ValueError(f"rotation must be 3x3, got shape {r.shape}")
        t[:3, :3] = r
    if translation is not None:
        p = np.asarray(translation, dtype=np.float64).reshape(-1)
        if p.shape != (3,):
            raise ValueError(f"translation must have 3 components, got shape {p.shape}")
        t[:3, 3] = p
    return t


def translation(x: float, y: float, z: float) -> Matrix:
    """Pure translation transform."""
    return homogeneous(translation=np.array([x, y, z], dtype=np.float64))


def rotation_x(angle: float) -> Matrix:
    """Pure rotation transform about X."""
    return homogeneous(rotation=rot_x(angle))


def rotation_z(angle: float) -> Matrix:
    """Pure rotation transform about Z."""
    return homogeneous(rotation=rot_z(angle))


def dh_transform(theta: float, d: float, a: float, alpha: float) -> Matrix:
    """Standard (distal) Denavit-Hartenberg link transform.

    ``A_i = Rot_z(theta) · Trans_z(d) · Trans_x(a) · Rot_x(alpha)``

    which expands to::

        [[cθ, -sθ·cα,  sθ·sα, a·cθ],
         [sθ,  cθ·cα, -cθ·sα, a·sθ],
         [ 0,     sα,     cα,    d],
         [ 0,      0,      0,    1]]
    """
    ct, st = math.cos(theta), math.sin(theta)
    ca, sa = math.cos(alpha), math.sin(alpha)
    return np.array(
        [
            [ct, -st * ca, st * sa, a * ct],
            [st, ct * ca, -ct * sa, a * st],
            [0.0, sa, ca, d],
            [0.0, 0.0, 0.0, 1.0],
        ],
        dtype=np.float64,
    )


def invert_transform(t: Matrix) -> Matrix:
    """Closed-form inverse of a rigid-body transform: ``[[Rᵀ, -Rᵀp], [0, 1]]``."""
    r = t[:3, :3]
    p = t[:3, 3]
    return homogeneous(rotation=r.T, translation=-r.T @ p)


def is_rigid_transform(t: Matrix, tol: float = ORTHONORMAL_TOLERANCE) -> bool:
    """Return True if ``t`` is a proper rigid-body transform (R ∈ SO(3), last row [0,0,0,1])."""
    m = np.asarray(t, dtype=np.float64)
    if m.shape != (4, 4) or not np.all(np.isfinite(m)):
        return False
    r = m[:3, :3]
    orthonormal = np.allclose(r.T @ r, np.eye(3), atol=tol)
    proper = abs(float(np.linalg.det(r)) - 1.0) <= tol
    bottom = np.allclose(m[3], [0.0, 0.0, 0.0, 1.0], atol=tol)
    return bool(orthonormal and proper and bottom)


def position_of(t: Matrix) -> Matrix:
    """Origin of the frame described by ``t``, expressed in the parent frame."""
    return np.array(t[:3, 3], dtype=np.float64)
