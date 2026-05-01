import os
import logging
import itertools
from pathlib import Path
from typing import Optional
import yaml

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
    primary: "claude" | "ollama" | "mock"
    """
    _load()
    cfg = _settings["llm"]
    system = _persona(mode, mode_instruction)

    if cfg["primary"] == "mock":
        return _mock(messages)

    if cfg["primary"] == "claude":
        try:
            import anthropic as _anthropic
            return _claude(system, messages, cfg, _anthropic)
        except Exception as e:
            if cfg.get("offline_fallback"):
                logger.warning(f"Claude unavailable ({e}), falling back to Ollama.")
                return _ollama(system, messages, cfg)
            raise

    return _ollama(system, messages, cfg)


# ── Mock engine — no API required ─────────────────────────────────────────

_MOCK_REPLIES = itertools.cycle([
    "All systems nominal, sir. Standing by.",
    "Understood. Consider it done.",
    "Noted. I will keep that in mind.",
    "Of course. Is there anything else you require?",
    "Done, sir. Merely a matter of maintaining all networks.",
    "Acknowledged. Running a quick check now.",
    "Ready when you are, sir.",
    "Everything appears to be in order.",
])

def _mock(messages: list[dict]) -> str:
    last = (messages[-1]["content"] if messages else "").lower()
    # a few context-aware canned lines
    if any(w in last for w in ["hello", "hi ", "hey", "how are"]):
        return "All systems online, sir. HANUMAN is ready."
    if any(w in last for w in ["time", "clock"]):
        from datetime import datetime
        return f"It is {datetime.now().strftime('%H:%M')}, sir."
    if any(w in last for w in ["thank", "thanks"]):
        return "Always, sir."
    if any(w in last for w in ["test", "testing"]):
        return "Test acknowledged. Voice pipeline is fully operational."
    if any(w in last for w in ["mode", "focus", "night", "morning"]):
        return "Mode change noted. Adjusting accordingly."
    return next(_MOCK_REPLIES)


# ── Real engines ───────────────────────────────────────────────────────────

def _claude(system: str, messages: list[dict], cfg: dict, _anthropic) -> str:
    client = _anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = client.messages.create(
        model=cfg["claude_model"],
        max_tokens=1024,
        system=system,
        messages=messages,
    )
    return response.content[0].text.strip()


def _ollama(system: str, messages: list[dict], cfg: dict) -> str:
    import ollama as ollama_client
    full_messages = [{"role": "system", "content": system}] + messages
    response = ollama_client.chat(
        model=cfg["ollama_model"],
        messages=full_messages,
    )
    # ollama library returns a ChatResponse object (not a dict)
    return response.message.content.strip()
