from __future__ import annotations

import json
import math

import pytest

API = "/api/v1"


# --- system ---------------------------------------------------------------------------


def test_health(client):
    body = client.get(f"{API}/health").json()
    assert body == {"status": "ok", "name": "KyneticForge Studio", "version": "0.1.0"}


def test_config_exposes_default_robot_and_constraints(client):
    body = client.get(f"{API}/config").json()
    assert body["projectSchemaVersion"] == 1
    assert body["defaultRobot"]["model"] == "rrr-3dof"
    assert [j["id"] for j in body["defaultRobot"]["joints"]] == ["j1", "j2", "j3"]
    assert body["constraints"]["minLinkLength"] > 0


def test_cors_allows_dev_origin_only(client):
    ok = client.get(f"{API}/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    blocked = client.get(f"{API}/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in blocked.headers


# --- kinematics -----------------------------------------------------------------------

GEOMETRY = {"baseHeight": 0.3, "upperArmLength": 0.4, "forearmLength": 0.3}


def test_forward_kinematics_zero_pose(client):
    res = client.post(
        f"{API}/kinematics/forward", json={"geometry": GEOMETRY, "jointAngles": [0, 0, 0]}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["endEffector"]["position"] == pytest.approx([0.7, 0.0, 0.3], abs=1e-12)
    assert len(body["frames"]) == 3
    assert len(body["localTransforms"]) == 3
    assert [j["id"] for j in body["joints"]] == ["j1", "j2", "j3"]
    assert body["dhTable"][0]["alpha"] == pytest.approx(math.pi / 2)


def test_forward_kinematics_rejects_angles_outside_limits(client):
    limits = [{"minAngle": -1, "maxAngle": 1}] * 3
    res = client.post(
        f"{API}/kinematics/forward",
        json={"geometry": GEOMETRY, "jointAngles": [0, 1.5, 0], "jointLimits": limits},
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "invalid_kinematics_input"


def test_forward_kinematics_rejects_bad_geometry(client):
    res = client.post(
        f"{API}/kinematics/forward",
        json={"geometry": {**GEOMETRY, "forearmLength": -1}, "jointAngles": [0, 0, 0]},
    )
    assert res.status_code == 422


@pytest.mark.parametrize("angles", [[0, 0], [0, 0, 0, 0], [0, "x", 0]])
def test_forward_kinematics_rejects_malformed_angles(client, angles):
    res = client.post(
        f"{API}/kinematics/forward", json={"geometry": GEOMETRY, "jointAngles": angles}
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "validation_error"


def test_validate_reports_all_issues(client, robot):
    robot["geometry"]["upperArmLength"] = 0
    robot["joints"][0]["minAngle"] = 1.0
    robot["joints"][0]["maxAngle"] = -1.0
    res = client.post(f"{API}/robotics/validate", json=robot)
    assert res.status_code == 200
    body = res.json()
    assert body["valid"] is False
    fields = {i["field"] for i in body["issues"]}
    assert {"geometry.upperArmLength", "joints[0]"} <= fields


def test_validate_accepts_default(client, robot):
    assert client.post(f"{API}/robotics/validate", json=robot).json() == {
        "valid": True,
        "issues": [],
    }


# --- projects -------------------------------------------------------------------------


def test_project_lifecycle(client, robot):
    assert client.get(f"{API}/projects").json() == []

    created = client.post(f"{API}/projects", json={"name": "Cell A", "description": "pick & place"})
    assert created.status_code == 201
    project = created.json()
    pid = project["id"]
    assert project["schemaVersion"] == 1
    assert project["robot"]["model"] == "rrr-3dof"
    assert project["createdAt"] == project["updatedAt"]

    listed = client.get(f"{API}/projects").json()
    assert [p["id"] for p in listed] == [pid]

    robot["geometry"]["upperArmLength"] = 0.55
    robot["joints"][1]["angle"] = math.radians(20)
    updated = client.patch(f"{API}/projects/{pid}", json={"name": "Cell B", "robot": robot}).json()
    assert updated["name"] == "Cell B"
    assert updated["description"] == "pick & place"
    assert updated["robot"]["geometry"]["upperArmLength"] == 0.55
    assert updated["updatedAt"] >= updated["createdAt"]

    reopened = client.get(f"{API}/projects/{pid}").json()
    assert reopened["robot"]["joints"][1]["angle"] == pytest.approx(math.radians(20))

    assert client.delete(f"{API}/projects/{pid}").status_code == 204
    assert client.get(f"{API}/projects/{pid}").status_code == 404
    assert client.delete(f"{API}/projects/{pid}").status_code == 404


def test_create_project_with_invalid_robot_is_rejected(client, robot):
    robot["joints"][2]["angle"] = 3.0  # beyond the 150° elbow limit
    res = client.post(f"{API}/projects", json={"name": "bad", "robot": robot})
    assert res.status_code == 422


@pytest.mark.parametrize("name", ["", "   ", "x" * 121])
def test_create_project_rejects_bad_names(client, name):
    assert client.post(f"{API}/projects", json={"name": name}).status_code == 422


def test_unknown_project_returns_404_json(client):
    res = client.get(f"{API}/projects/does-not-exist")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "project_not_found"


# --- export / import ------------------------------------------------------------------


def test_export_then_import_roundtrip(client):
    pid = client.post(f"{API}/projects", json={"name": "Original"}).json()["id"]
    document = client.get(f"{API}/projects/{pid}/export").json()
    assert document["format"] == "kyneticforge.project"
    assert document["schemaVersion"] == 1
    assert document["appVersion"] == "0.1.0"

    imported = client.post(f"{API}/projects/import", content=json.dumps(document))
    assert imported.status_code == 201
    body = imported.json()
    assert body["id"] != pid
    assert body["name"] == "Original"
    original = client.get(f"{API}/projects/{pid}").json()
    assert body["robot"] == original["robot"]


def _document(robot):
    return {
        "format": "kyneticforge.project",
        "schemaVersion": 1,
        "appVersion": "0.1.0",
        "exportedAt": "2026-01-01T00:00:00Z",
        "project": {"name": "Imported", "description": "", "robot": robot},
    }


def test_import_rejects_invalid_json(client):
    res = client.post(f"{API}/projects/import", content=b"{not json")
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "invalid_project_document"


def test_import_rejects_wrong_format(client, robot):
    doc = _document(robot)
    doc["format"] = "something-else"
    assert client.post(f"{API}/projects/import", json=doc).status_code == 422


def test_import_rejects_newer_schema(client, robot):
    doc = _document(robot)
    doc["schemaVersion"] = 99
    res = client.post(f"{API}/projects/import", json=doc)
    assert res.status_code == 422
    assert "newer" in res.json()["error"]["message"]


def test_import_rejects_invalid_robot_and_saves_nothing(client, robot):
    robot["geometry"]["forearmLength"] = 0
    res = client.post(f"{API}/projects/import", json=_document(robot))
    assert res.status_code == 422
    assert res.json()["error"]["details"]
    assert client.get(f"{API}/projects").json() == []


def test_import_rejects_oversized_documents(client, robot):
    doc = _document(robot)
    doc["project"]["description"] = "x" * 300_000
    assert client.post(f"{API}/projects/import", json=doc).status_code == 422


def test_import_rejects_non_object(client):
    assert client.post(f"{API}/projects/import", json=[1, 2, 3]).status_code == 422
