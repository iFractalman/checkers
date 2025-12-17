"""
Small FastAPI app to serve the web UI (webapp/) over HTTPS on Railway.

Railway will expose this as an HTTP service; use that URL as CHECKERS_WEBAPP_URL
so Telegram can open it as a WebApp inside the client.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
WEBAPP_DIR = BASE_DIR / "webapp"

app = FastAPI(title="Checkers Web UI")


@app.get("/")
async def root() -> RedirectResponse:
    """Redirect root to /webapp/ so visiting the base URL shows the board."""
    return RedirectResponse(url="/webapp/")


if WEBAPP_DIR.exists():
    # Serve static files under /webapp
    app.mount(
        "/webapp",
        StaticFiles(directory=str(WEBAPP_DIR), html=True),
        name="webapp",
    )
else:
    # Fallback in case the folder is missing on deployment
    @app.get("/webapp")
    async def missing_webapp() -> FileResponse:  # type: ignore[override]
        raise RuntimeError("webapp/ directory not found on server")



