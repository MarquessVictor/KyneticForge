"""Unit conversion helpers.

KyneticForge stores and computes everything in SI units (metres, radians).
Conversions to display units happen only at the edges (UI / reports).
"""

from __future__ import annotations

import math
from enum import StrEnum


class LengthUnit(StrEnum):
    METRE = "m"
    CENTIMETRE = "cm"
    MILLIMETRE = "mm"


_METRES_PER_UNIT: dict[LengthUnit, float] = {
    LengthUnit.METRE: 1.0,
    LengthUnit.CENTIMETRE: 0.01,
    LengthUnit.MILLIMETRE: 0.001,
}


def length_to_si(value: float, unit: LengthUnit | str) -> float:
    """Convert a length expressed in ``unit`` to metres."""
    return value * _METRES_PER_UNIT[LengthUnit(unit)]


def length_from_si(value_m: float, unit: LengthUnit | str) -> float:
    """Convert a length in metres to ``unit``."""
    return value_m / _METRES_PER_UNIT[LengthUnit(unit)]


def deg_to_rad(degrees: float) -> float:
    return math.radians(degrees)


def rad_to_deg(radians: float) -> float:
    return math.degrees(radians)
