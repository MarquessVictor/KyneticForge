"""Builds the shared kinematics reference fixture.

The fixture (``shared/fixtures/kinematics-reference.json``) is the contract
between the NumPy reference implementation and the TypeScript real-time
implementation used by the 3D viewer:

* ``backend/tests/test_reference_fixture.py`` asserts the committed file still
  matches what this module produces (so the backend is the reference).
* ``frontend/src/features/kinematics/forwardKinematics.test.ts`` asserts the
  TypeScript implementation reproduces every case within ``tolerance``.

Regenerate with ``python -m scripts.generate_fixtures`` from ``backend/``.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np

from app.robotics.kinematics import ArmGeometry, forward_kinematics
from app.robotics.presets import default_robot_config
from app.robotics.validation import ANGLE_BOUND, MAX_LENGTH, MIN_BASE_HEIGHT, MIN_LINK_LENGTH

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3] / "shared" / "fixtures" / "kinematics-reference.json"
)
TOLERANCE = 1e-9

_d = math.radians


def _cases() -> list[tuple[str, dict[str, float], list[float]]]:
    default_geom = {"baseHeight": 0.3, "upperArmLength": 0.4, "forearmLength": 0.3}
    rng = np.random.default_rng(seed=20260101)
    cases: list[tuple[str, dict[str, float], list[float]]] = [
        ("zero pose: arm stretched along +X", default_geom, [0.0, 0.0, 0.0]),
        ("default home pose", default_geom, [_d(30), _d(60), _d(-75)]),
        ("shoulder vertical: arm pointing up", default_geom, [0.0, _d(90), 0.0]),
        ("elbow folded back", default_geom, [0.0, 0.0, _d(150)]),
        ("base +90 deg: arm along +Y", default_geom, [_d(90), 0.0, 0.0]),
        ("base -180 deg (limit)", default_geom, [_d(-180), _d(-45), _d(-150)]),
        ("upper extremes", default_geom, [_d(180), _d(135), _d(150)]),
        (
            "asymmetric geometry",
            {"baseHeight": 0.0, "upperArmLength": 1.25, "forearmLength": 0.05},
            [_d(-37.5), _d(12.25), _d(-99.0)],
        ),
    ]
    for index in range(4):
        geom = {
            "baseHeight": float(rng.uniform(0.0, 1.0)),
            "upperArmLength": float(rng.uniform(0.05, 2.0)),
            "forearmLength": float(rng.uniform(0.05, 2.0)),
        }
        angles = [float(v) for v in rng.uniform(-math.pi, math.pi, size=3)]
        cases.append((f"seeded random #{index + 1}", geom, angles))
    return cases


def _matrix(m: np.ndarray) -> list[list[float]]:
    return [[float(v) for v in row] for row in m]


def build_reference_fixture() -> dict[str, Any]:
    cases: list[dict[str, Any]] = []
    for name, geom, angles in _cases():
        geometry = ArmGeometry(geom["baseHeight"], geom["upperArmLength"], geom["forearmLength"])
        fk = forward_kinematics(geometry, angles)
        cases.append(
            {
                "name": name,
                "geometry": geom,
                "jointAngles": angles,
                "expected": {
                    "frames": [_matrix(f) for f in fk.frames],
                    "jointPositions": [[float(v) for v in j.position] for j in fk.joints],
                    "jointAxes": [[float(v) for v in j.axis] for j in fk.joints],
                    "endEffectorPosition": [float(v) for v in fk.end_effector_position],
                },
            }
        )
    return {
        "description": (
            "Reference forward-kinematics results produced by the NumPy backend. "
            "Generated file - do not edit by hand."
        ),
        "generator": "backend/scripts/generate_fixtures.py",
        "units": {"length": "m", "angle": "rad"},
        "tolerance": TOLERANCE,
        "defaultRobot": default_robot_config(),
        "constraints": {
            "minLinkLength": MIN_LINK_LENGTH,
            "minBaseHeight": MIN_BASE_HEIGHT,
            "maxLength": MAX_LENGTH,
            "angleBound": ANGLE_BOUND,
        },
        "cases": cases,
    }
