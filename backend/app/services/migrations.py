"""Schema migrations for project documents.

Each entry maps a source schema version to a function that upgrades the raw
``project`` payload to ``version + 1``. Version 1 is the first public format, so
the registry is currently empty; it exists so that future releases can read
documents written by older versions instead of rejecting them.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from app.schemas.project import PROJECT_SCHEMA_VERSION

Migration = Callable[[dict[str, Any]], dict[str, Any]]

MIGRATIONS: dict[int, Migration] = {}


class UnsupportedSchemaVersionError(ValueError):
    pass


def upgrade_document(document: dict[str, Any]) -> dict[str, Any]:
    """Upgrade a raw project document to :data:`PROJECT_SCHEMA_VERSION`.

    Raises:
        UnsupportedSchemaVersionError: if the document is newer than this build or
            no migration path exists.
    """
    version = document.get("schemaVersion")
    if not isinstance(version, int) or isinstance(version, bool) or version < 1:
        raise UnsupportedSchemaVersionError("schemaVersion must be a positive integer")
    if version > PROJECT_SCHEMA_VERSION:
        raise UnsupportedSchemaVersionError(
            f"document schema version {version} is newer than the supported version "
            f"{PROJECT_SCHEMA_VERSION}; update KyneticForge Studio to open it"
        )
    upgraded = dict(document)
    while upgraded["schemaVersion"] < PROJECT_SCHEMA_VERSION:
        current = upgraded["schemaVersion"]
        migrate = MIGRATIONS.get(current)
        if migrate is None:
            raise UnsupportedSchemaVersionError(f"no migration from schema version {current}")
        upgraded = migrate(upgraded)
        upgraded["schemaVersion"] = current + 1
    return upgraded
