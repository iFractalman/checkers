"""
Small FastAPI app to serve the web UI (webapp/) over HTTPS on Railway.

Railway will expose this as an HTTP service; use that URL as CHECKERS_WEBAPP_URL
so Telegram can open it as a WebApp inside the client.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from game_rooms import get_room, rooms

BASE_DIR = Path(__file__).resolve().parent
WEBAPP_DIR = BASE_DIR / "webapp"

app = FastAPI(title="Checkers Web UI")

# Allow CORS for Telegram WebApp
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to Telegram domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> RedirectResponse:
    """Redirect root to /webapp/ so visiting the base URL shows the board."""
    return RedirectResponse(url="/webapp/")


# API endpoints for multiplayer
class MoveRequest(BaseModel):
    room_id: str
    user_id: int
    from_row: int
    from_col: int
    to_row: int
    to_col: int


@app.get("/api/room/{room_id}")
async def get_room_state(room_id: str, user_id: int):
    """Get current game state for a room"""
    room = get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room.to_dict(user_id)


@app.post("/api/room/{room_id}/move")
async def make_move(room_id: str, move: MoveRequest):
    """Make a move in a game room"""
    room = get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    success, error = room.make_move(
        move.user_id,
        move.from_row,
        move.from_col,
        move.to_row,
        move.to_col,
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=error)
    
    return room.to_dict(move.user_id)


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



