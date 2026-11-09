"""Uniform JSON error responses: ``{"error": {"code", "message", "details"}}``."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.services.kinematics_service import KinematicsInputError
from app.services.project_service import InvalidProjectDocumentError, ProjectNotFoundError

logger = logging.getLogger("kyneticforge.api")


def error_response(
    status_code: int, code: str, message: str, details: list[Any] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "details": details or []}},
    )


def _format_validation_errors(exc: RequestValidationError) -> list[dict[str, Any]]:
    return [
        {"loc": [str(p) for p in err.get("loc", ())], "message": err.get("msg", "")}
        for err in exc.errors()
    ]


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "validation_error",
            "request validation failed",
            _format_validation_errors(exc),
        )

    @app.exception_handler(ProjectNotFoundError)
    async def _not_found(_: Request, exc: ProjectNotFoundError) -> JSONResponse:
        return error_response(status.HTTP_404_NOT_FOUND, "project_not_found", str(exc))

    @app.exception_handler(InvalidProjectDocumentError)
    async def _bad_document(_: Request, exc: InvalidProjectDocumentError) -> JSONResponse:
        return error_response(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "invalid_project_document", str(exc), exc.details
        )

    @app.exception_handler(KinematicsInputError)
    async def _bad_kinematics(_: Request, exc: KinematicsInputError) -> JSONResponse:
        details = [{"loc": [i.field], "message": i.message} for i in exc.issues]
        return error_response(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "invalid_kinematics_input", str(exc), details
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return error_response(exc.status_code, "http_error", str(exc.detail))

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error", exc_info=exc)
        return error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "internal_error", "an unexpected error occurred"
        )
