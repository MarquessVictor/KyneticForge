from __future__ import annotations

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.database.session import Database


def get_db(request: Request) -> Iterator[Session]:
    database: Database = request.app.state.database
    yield from database.session()


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings
