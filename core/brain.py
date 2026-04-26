import os
import logging
from pathlib import Path
from typing import Optional
import yaml
import anthropic
import ollama as ollama_client

logger = logging.getLogger(__name__)

_settings: dict = {}
_persona_template: str = ""


def _load():
    global _settings, _persona_template
    if _settings:
        return
    with open("config/settings.yaml") as f:
        _settings = yaml.safe_load(f)
    _persona_template = Path(_settings["persona"]["prompt_file"]).read_text()


def _persona(mode: str = "NORMAL", mode_instruction: str = "") -> str:
    _load()
    return _persona_template.format(mode=mode, mode_instruction=mode_instruction)


def think(
    messages: list[dict],
    mode: str = "NORMAL",
    mode_instruction: str = "",
) -> str:
    """
    Send messages to the LLM and return the response text.
    Tries Claude first, falls back to Ollama if unavailable.
    """
    _load()
    cfg = _settings["llm"]
    system = _persona(mode, mode_instruction)

    if cfg["primary"] == "claude":
        try:
            return _claude(system, messages, cfg)
        except Exception as e:
            if cfg.get("offline_fallback"):
                logger.warning(f"Claude unavailable ({e}), falling back to Ollama.")
                return _ollama(system, messages, cfg)
            raise

    return _ollama(system, messages, cfg)


def _claude(system: str, messages: list[dict], cfg: dict) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = client.messages.create(
        model=cfg["claude_model"],
        max_tokens=1024,
        system=system,
        messages=messages,
    )
    return response.content[0].text.strip()


def _ollama(system: str, messages: list[dict], cfg: dict) -> str:
    full_messages = [{"role": "system", "content": system}] + messages
    response = ollama_client.chat(
        model=cfg["ollama_model"],
        messages=full_messages,
    )
    return response["message"]["content"].strip()
