import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

logger = logging.getLogger(__name__)

app = FastAPI(title="HANUMAN", docs_url=None, redoc_url=None)

# Serve the built React app (ui/dist)
_dist = Path(__file__).parent.parent / "ui" / "dist"
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

# ── Connection Manager ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self._clients: list[WebSocket] = []
        self._state: dict[str, Any] = {
            "status":   "idle",
            "mode":     "NORMAL",
            "presence": "away",
            "volume":   0.85,
        }

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._clients.append(ws)
        # Send current state immediately on connect
        await ws.send_text(json.dumps({"type": "state", **self._state}))
        logger.info(f"UI client connected. Total: {len(self._clients)}")

    def disconnect(self, ws: WebSocket):
        self._clients.remove(ws)
        logger.info(f"UI client disconnected. Total: {len(self._clients)}")

    async def broadcast(self, payload: dict):
        if not self._clients:
            return
        text = json.dumps(payload)
        dead = []
        for ws in self._clients:
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._clients.remove(ws)

    async def set_state(self, **kwargs):
        self._state.update(kwargs)
        await self.broadcast({"type": "state", **kwargs})

    async def send_message(self, role: str, text: str):
        await self.broadcast({"type": "message", "role": role, "text": text})


manager = ConnectionManager()


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index():
    # Serve built React app; fallback to raw source during development
    dist = Path(__file__).parent.parent / "ui" / "dist" / "index.html"
    src  = Path(__file__).parent.parent / "ui" / "index.html"
    return (dist if dist.exists() else src).read_text()


@app.get("/status")
async def status():
    return manager._state


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)

            if msg.get("type") == "text":
                # Text message from UI — hand off to HANUMAN's brain
                # Import here to avoid circular imports
                from core.brain import think
                from core.context import ConversationContext
                from output.tts import synthesise
                from output.speaker import play
                from output.volume_controller import get_volume

                text = msg.get("text", "").strip()
                if not text:
                    continue

                await manager.send_message("user", text)
                await manager.set_state(status="thinking")

                try:
                    ctx = ConversationContext()
                    ctx.add_user(text)
                    response = think(ctx.messages())
                    ctx.add_assistant(response)

                    await manager.send_message("assistant", response)
                    await manager.set_state(status="speaking")

                    path = synthesise(response)
                    play(path, volume=get_volume())

                    await manager.set_state(status="idle")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    await manager.set_state(status="idle")

    except WebSocketDisconnect:
        manager.disconnect(ws)
