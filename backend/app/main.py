"""FastAPI application factory.

Run in development with::

    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes_projects, routes_robotics, routes_system
from app.api.errors import register_error_handlers
from app.core.config import APP_NAME, APP_VERSION, Settings, get_settings
from app.database.session import Database
from app.web import mount_frontend

API_PREFIX = "/api/v1"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    database = Database(settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        database.create_schema()
        yield
        database.dispose()

    app = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)
    app.state.settings = settings
    app.state.database = database

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )
    register_error_handlers(app)

    app.include_router(routes_system.router, prefix=API_PREFIX)
    app.include_router(routes_robotics.router, prefix=API_PREFIX)
    app.include_router(routes_projects.router, prefix=API_PREFIX)
    # Last: the static mount at "/" must not shadow the API routes.
    mount_frontend(app, settings.frontend_dist)
    return app


app = create_app()
