import logging
import os
import subprocess
import sys

logger = logging.getLogger(__name__)


def play(path: str, volume: float = 1.0):
    """Play an audio file at the given volume (0.0–1.0)."""
    volume = max(0.0, min(1.0, volume))

    if sys.platform == "darwin":
        # afplay -v accepts values above 1.0 but we stay within safe range
        subprocess.run(["afplay", "-v", str(volume), path], check=True)
    else:
        # Raspberry Pi / Linux — use mpg123
        # Scale 0.0–1.0 to 0–32768 (mpg123 --scale range)
        scale = int(volume * 32768)
        subprocess.run(["mpg123", "--scale", str(scale), "-q", path], check=True)

    os.unlink(path)
