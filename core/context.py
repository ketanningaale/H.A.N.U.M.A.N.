import yaml


def _max_turns() -> int:
    with open("config/settings.yaml") as f:
        return yaml.safe_load(f)["memory"]["short_term_turns"]


class ConversationContext:
    """Rolling short-term conversation buffer."""

    def __init__(self):
        self._turns: list[dict] = []
        self._max = _max_turns()

    def add_user(self, text: str):
        self._turns.append({"role": "user", "content": text})
        self._trim()

    def add_assistant(self, text: str):
        self._turns.append({"role": "assistant", "content": text})
        self._trim()

    def messages(self) -> list[dict]:
        return list(self._turns)

    def clear(self):
        self._turns.clear()

    def _trim(self):
        # Keep pairs to avoid orphaned turns; drop oldest pair first
        while len(self._turns) > self._max * 2:
            self._turns.pop(0)
            self._turns.pop(0)
