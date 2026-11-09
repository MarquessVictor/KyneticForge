"""Serves the built frontend (frontend/dist) from the API process.

This is what makes the single-command "app mode" possible: after
`npm run build`, FastAPI serves both the REST API (/api/v1) and the web
interface (/) on one port, so Node.js is not needed at runtime.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

_NOT_BUILT_PAGE = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>KyneticForge Studio</title>
<style>body{background:#0d1014;color:#e6edf3;font:15px system-ui,sans-serif;
max-width:640px;margin:15vh auto;padding:0 16px;line-height:1.6}
code{background:#171c22;border:1px solid #2c3540;border-radius:4px;padding:2px 6px}
h1{font-size:20px}a{color:#4fd3f0}</style></head><body>
<h1>KyneticForge Studio — a interface ainda não foi gerada</h1>
<p>O backend está funcionando, mas a pasta <code>frontend/dist</code> não existe.</p>
<p>Feche este servidor e abra o app pelo <code>KyneticForge.bat</code>
(ele gera a interface automaticamente), ou rode uma vez:</p>
<p><code>cd frontend</code> e depois <code>npm run build</code></p>
<p>A API continua disponível em <a href="/docs">/docs</a>.</p>
</body></html>"""


def frontend_is_built(dist: Path | None) -> bool:
    return dist is not None and (dist / "index.html").is_file()


def mount_frontend(app: FastAPI, dist: Path | None) -> None:
    """Mount the built frontend at "/" (must run after the API routers are included)."""
    if frontend_is_built(dist):
        assert dist is not None
        app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
        return

    @app.get("/", include_in_schema=False)
    def frontend_not_built() -> HTMLResponse:
        return HTMLResponse(_NOT_BUILT_PAGE)
