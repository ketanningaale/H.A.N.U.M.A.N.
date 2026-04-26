#!/usr/bin/env python3
"""
H.A.N.U.M.A.N. — Honestly A Noble Unit Maintaining All Networks
Entry point — runs voice loop and web UI server concurrently.
"""

import asyncio
import logging
import os
import threading
from typing import Optional

import uvicorn
import yaml
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("hanuman")

from api.server import manager
from core.brain import think
from core.context import ConversationContext
from input.stt import listen
from output.tts import synthesise
from output.speaker import play
from output.volume_controller import get_volume


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cfg():
    with open("config/settings.yaml") as f:
        return yaml.safe_load(f)


def _broadcast(status: str):
    """Fire-and-forget state broadcast to UI from the sync voice thread."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(manager.set_state(status=status), loop)
    except Exception:
        pass  # UI broadcast is best-effort — never block the voice loop


def _broadcast_message(role: str, text: str):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(manager.send_message(role, text), loop)
    except Exception:
        pass


def speak(text: str, context: Optional[ConversationContext] = None):
    _broadcast("speaking")
    logger.info(f"HANUMAN: {text}")
    if context:
        context.add_assistant(text)
    _broadcast_message("assistant", text)
    path = synthesise(text)
    play(path, volume=get_volume())
    _broadcast("idle")


# ── Voice Loop (runs in background thread) ────────────────────────────────────

def voice_loop():
    context = ConversationContext()
    logger.info("Voice loop started.")
    speak("All systems online, sir. HANUMAN is ready.", context)

    while True:
        try:
            _broadcast("listening")
            user_text = listen()

            if not user_text.strip():
                _broadcast("idle")
                continue

            if any(p in user_text.lower() for p in ["shut down", "goodbye", "goodnight hanuman"]):
                speak("Understood, sir. All networks maintained. Signing off.", context)
                break

            logger.info(f"You: {user_text}")
            _broadcast_message("user", user_text)
            context.add_user(user_text)

            _broadcast("thinking")
            response = think(context.messages())

            speak(response, context)

        except KeyboardInterrupt:
            speak("Shutting down, sir.")
            break
        except Exception as e:
            logger.error(f"Voice loop error: {e}")
            _broadcast("idle")


# ── Entry Point ───────────────────────────────────────────────────────────────

def main():
    cfg = _cfg()["api"]

    # Voice loop runs in a daemon thread — exits when main process exits
    voice_thread = threading.Thread(target=voice_loop, daemon=True)
    voice_thread.start()

    # Web server runs on the main thread
    logger.info(f"UI available at http://{cfg['host']}:{cfg['port']}")
    uvicorn.run(
        "api.server:app",
        host=cfg["host"],
        port=cfg["port"],
        log_level="warning",
        reload=False,
    )


if __name__ == "__main__":
    main()
