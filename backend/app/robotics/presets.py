"""Built-in robot presets (SI units, radians)."""

from __future__ import annotations

import math
from typing import Any


def default_robot_config() -> dict[str, Any]:
    """Default 3-DOF arm. Home pose is clearly visible and inside every limit.

    Returned as camelCase JSON-compatible data so it can be validated by
    :class:`app.schemas.robot.RobotConfig` and shared with the frontend fixtures.
    """
    r = math.radians
    return {
        "model": "rrr-3dof",
        "geometry": {"baseHeight": 0.3, "upperArmLength": 0.4, "forearmLength": 0.3},
        "joints": [
            {
                "id": "j1",
                "name": "Base",
                "minAngle": r(-180),
                "maxAngle": r(180),
                "homeAngle": r(30),
                "angle": r(30),
            },
            {
                "id": "j2",
                "name": "Shoulder",
                "minAngle": r(-45),
                "maxAngle": r(135),
                "homeAngle": r(60),
                "angle": r(60),
            },
            {
                "id": "j3",
                "name": "Elbow",
                "minAngle": r(-150),
                "maxAngle": r(150),
                "homeAngle": r(-75),
                "angle": r(-75),
            },
        ],
        "displayUnit": "m",
    }
