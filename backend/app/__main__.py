"""Run KyneticForge Studio as a single application.

    python -m app                 # API + interface on http://127.0.0.1:8000, opens the browser
    python -m app --no-browser    # same, without opening the browser
    python -m app --port 8080     # another port

The interface must have been built once with `npm run build` in frontend/
(the KyneticForge.bat launcher does this automatically).
"""

from __future__ import annotations

import argparse
import threading
import time
import urllib.request
import webbrowser

import uvicorn

from app.core.config import APP_NAME, APP_VERSION, get_settings
from app.web import frontend_is_built


def _open_browser_when_ready(url: str, health_url: str, timeout: float = 30.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(health_url, timeout=1):
                webbrowser.open(url)
                return
        except OSError:
            time.sleep(0.3)


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app", description=f"Run {APP_NAME}.")
    parser.add_argument("--host", default="127.0.0.1", help="address to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="port (default: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="do not open the browser")
    args = parser.parse_args()

    url = f"http://{args.host}:{args.port}"
    print(f"\n  {APP_NAME} v{APP_VERSION}")
    if frontend_is_built(get_settings().frontend_dist):
        print(f"  Aberto em {url}  (Ctrl+C para encerrar)\n")
    else:
        print("  AVISO: interface não gerada (frontend/dist). Rode 'npm run build' em frontend/.")
        print(f"  API disponível em {url}/docs\n")

    if not args.no_browser:
        threading.Thread(
            target=_open_browser_when_ready,
            args=(url, f"{url}/api/v1/health"),
            daemon=True,
        ).start()

    uvicorn.run("app.main:app", host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
