"""Forward kinematics for the KyneticForge 3-DOF RRR arm (reference implementation).

The arm is described with standard Denavit-Hartenberg parameters (see
``docs/KINEMATICS.md``):

======  ===========  ======  =====  ======
Link    θ (joint)    d       a      α
======  ===========  ======  =====  ======
1       q1 (base)    L0      0      +π/2
2       q2 (shoulder) 0      L1     0
3       q3 (elbow)   0       L2     0
======  ===========  ======  =====  ======

World frame {0}: Z up, X forward, Y left (right-handed). Joint *i* rotates about
the ``z_(i-1)`` axis located at the origin of frame ``{i-1}``. Frame {3} is the
end-effector (tool) frame located at the tip of the forearm.

Closed form of the end-effector position (used by the tests)::

    r = L1·cos(q2) + L2·cos(q2 + q3)
    x = cos(q1) · r
    y = sin(q1) · r
    z = L0 + L1·sin(q2) + L2·sin(q2 + q3)
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np

from app.robotics.transforms import Matrix, dh_transform, position_of

JOINT_COUNT = 3
JOINT_IDS: tuple[str, str, str] = ("j1", "j2", "j3")


@dataclass(frozen=True, slots=True)
class ArmGeometry:
    """Geometric parameters of the arm, in metres."""

    base_height: float
    upper_arm_length: float
    forearm_length: float

    @property
    def max_reach(self) -> float:
        """Maximum horizontal/radial distance of the end effector from the shoulder."""
        return self.upper_arm_length + self.forearm_length


@dataclass(frozen=True, slots=True)
class DHParameters:
    """One row of a standard Denavit-Hartenberg table."""

    theta: float
    d: float
    a: float
    alpha: float


@dataclass(frozen=True, slots=True)
class JointState:
    """Location and rotation axis of a joint, expressed in the world frame."""

    joint_id: str
    position: Matrix
    axis: Matrix


@dataclass(frozen=True, slots=True)
class ForwardKinematicsResult:
    """Structured output of :func:`forward_kinematics`.

    Attributes:
        joint_angles: Input joint angles (rad).
        dh_table: DH parameters actually used for each link.
        local_transforms: ``A_i = T_(i-1)_i`` for i = 1..3.
        frames: Cumulative world transforms ``T_0_i`` for i = 1..3.
        joints: World position and axis of each joint.
        end_effector: ``T_0_3`` (pose of the tool frame).
    """

    joint_angles: tuple[float, float, float]
    dh_table: tuple[DHParameters, ...]
    local_transforms: tuple[Matrix, ...]
    frames: tuple[Matrix, ...]
    joints: tuple[JointState, ...]
    end_effector: Matrix

    @property
    def end_effector_position(self) -> Matrix:
        return position_of(self.end_effector)

    @property
    def end_effector_rotation(self) -> Matrix:
        return np.array(self.end_effector[:3, :3], dtype=np.float64)


def dh_table(geometry: ArmGeometry, joint_angles: Sequence[float]) -> tuple[DHParameters, ...]:
    """DH table of the arm for the given joint angles (rad)."""
    q1, q2, q3 = _as_joint_tuple(joint_angles)
    return (
        DHParameters(theta=q1, d=geometry.base_height, a=0.0, alpha=math.pi / 2),
        DHParameters(theta=q2, d=0.0, a=geometry.upper_arm_length, alpha=0.0),
        DHParameters(theta=q3, d=0.0, a=geometry.forearm_length, alpha=0.0),
    )


def forward_kinematics(
    geometry: ArmGeometry, joint_angles: Sequence[float]
) -> ForwardKinematicsResult:
    """Compute the full forward kinematics of the arm.

    Args:
        geometry: Link lengths in metres.
        joint_angles: ``(q1, q2, q3)`` in radians.

    Returns:
        A :class:`ForwardKinematicsResult` with every intermediate transform.

    Raises:
        ValueError: If the number of angles is not 3 or any value is not finite.
    """
    q = _as_joint_tuple(joint_angles)
    _ensure_finite_geometry(geometry)
    table = dh_table(geometry, q)

    local = tuple(dh_transform(p.theta, p.d, p.a, p.alpha) for p in table)

    frames: list[Matrix] = []
    accumulated = np.eye(4, dtype=np.float64)
    for a_i in local:
        accumulated = accumulated @ a_i
        frames.append(accumulated.copy())

    # Joint i sits at the origin of frame {i-1} and rotates about z_(i-1).
    parent_frames = (np.eye(4, dtype=np.float64), frames[0], frames[1])
    joints = tuple(
        JointState(
            joint_id=JOINT_IDS[i],
            position=position_of(parent),
            axis=np.array(parent[:3, 2], dtype=np.float64),
        )
        for i, parent in enumerate(parent_frames)
    )

    return ForwardKinematicsResult(
        joint_angles=q,
        dh_table=table,
        local_transforms=local,
        frames=tuple(frames),
        joints=joints,
        end_effector=frames[-1],
    )


def end_effector_position_closed_form(
    geometry: ArmGeometry, joint_angles: Sequence[float]
) -> Matrix:
    """Analytic end-effector position, independent from the matrix chain (used for checks)."""
    q1, q2, q3 = _as_joint_tuple(joint_angles)
    r = geometry.upper_arm_length * math.cos(q2) + geometry.forearm_length * math.cos(q2 + q3)
    z = (
        geometry.base_height
        + geometry.upper_arm_length * math.sin(q2)
        + geometry.forearm_length * math.sin(q2 + q3)
    )
    return np.array([math.cos(q1) * r, math.sin(q1) * r, z], dtype=np.float64)


def _as_joint_tuple(joint_angles: Sequence[float]) -> tuple[float, float, float]:
    values = tuple(float(v) for v in joint_angles)
    if len(values) != JOINT_COUNT:
        raise ValueError(f"expected {JOINT_COUNT} joint angles, got {len(values)}")
    if not all(math.isfinite(v) for v in values):
        raise ValueError("joint angles must be finite numbers")
    return values  # type: ignore[return-value]


def _ensure_finite_geometry(geometry: ArmGeometry) -> None:
    for name in ("base_height", "upper_arm_length", "forearm_length"):
        if not math.isfinite(getattr(geometry, name)):
            raise ValueError(f"{name} must be a finite number")
