"""Regenerate ``shared/fixtures/kinematics-reference.json``.

Usage (from ``backend/``)::

    python -m scripts.generate_fixtures
"""

from __future__ import annotations

import json

from app.robotics.reference_fixtures import FIXTURE_PATH, build_reference_fixture


def main() -> None:
    FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE_PATH.write_text(
        json.dumps(build_reference_fixture(), indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {FIXTURE_PATH}")


if __name__ == "__main__":
    main()
