import asyncio
import logging
import tempfile
import os
import yaml
import edge_tts

logger = logging.getLogger(__name__)


def _cfg() -> dict:
    with open("config/settings.yaml") as f:
        return yaml.safe_load(f)["tts"]


async def _synthesise(text: str, voice: str, rate: str, path: str):
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)
    await communicate.save(path)


def synthesise(text: str) -> str:
    """Convert text to speech, save to a temp mp3, return the file path."""
    cfg = _cfg()
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp.close()

    asyncio.run(_synthesise(text, cfg["voice"], cfg.get("rate", "-5%"), tmp.name))
    logger.info(f"TTS synthesised: '{text[:60]}...' → {tmp.name}")
    return tmp.name
