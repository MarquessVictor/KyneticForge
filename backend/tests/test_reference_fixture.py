"""Guards the shared fixture that the frontend uses for its equivalence tests."""

from __future__ import annotations

import json

import numpy as np

from app.robotics.kinematics import ArmGeometry, end_effector_position_closed_form
from app.robotics.reference_fixtures import FIXTURE_PATH, build_reference_fixture


def test_committed_fixture_matches_reference_implementation():
    assert FIXTURE_PATH.exists(), "run `python -m scripts.generate_fixtures` in backend/"
    committed = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    fresh = build_reference_fixture()
    assert committed["defaultRobot"] == fresh["defaultRobot"]
    assert committed["constraints"] == fresh["constraints"]
    assert len(committed["cases"]) == len(fresh["cases"])
    for got, want in zip(committed["cases"], fresh["cases"], strict=True):
        assert got["name"] == want["name"]
        np.testing.assert_allclose(got["jointAngles"], want["jointAngles"], atol=0)
        for key in ("frames", "jointPositions", "jointAxes", "endEffectorPosition"):
            np.testing.assert_allclose(got["expected"][key], want["expected"][key], atol=1e-12)


def test_fixture_cases_agree_with_closed_form():
    for case in build_reference_fixture()["cases"]:
        g = case["geometry"]
        geom = ArmGeometry(g["baseHeight"], g["upperArmLength"], g["forearmLength"])
        np.testing.assert_allclose(
            case["expected"]["endEffectorPosition"],
            end_effector_position_closed_form(geom, case["jointAngles"]),
            atol=1e-12,
        )
