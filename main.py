#!/usr/bin/env python3
"""
H.A.N.U.M.A.N. — Honestly A Noble Unit Maintaining All Networks
Entry point for Phase 0: voice loop.
"""

import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("hanuman")

from core.brain import think
from core.context import ConversationContext
from input.stt import listen
from output.tts import synthesise
from output.speaker import play
from output.volume_controller import get_volume


def speak(text: str):
    logger.info(f"HANUMAN: {text}")
    path = synthesise(text)
    play(path, volume=get_volume())


def main():
    context = ConversationContext()

    logger.info("HANUMAN online.")
    speak("All systems online, sir. HANUMAN is ready.")

    while True:
        try:
            user_text = listen()

            if not user_text.strip():
                continue

            # Exit phrases
            if any(phrase in user_text.lower() for phrase in ["shut down", "goodbye", "goodnight hanuman"]):
                speak("Understood, sir. All networks maintained. Signing off.")
                break

            logger.info(f"You: {user_text}")
            context.add_user(user_text)

            response = think(context.messages())
            context.add_assistant(response)

            speak(response)

        except KeyboardInterrupt:
            speak("Shutting down, sir.")
            break
        except Exception as e:
            logger.error(f"Error: {e}")
            speak("I encountered an issue, sir. Standing by.")


if __name__ == "__main__":
    main()
