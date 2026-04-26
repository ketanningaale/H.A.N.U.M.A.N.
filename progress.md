# HANUMAN — Build Progress

> Last updated: 2026-04-26

---

## Current Status

**Phase:** Pre-build — planning complete, ready to build Phase 0  
**Voice:** `en-GB-RyanNeural` (British, JARVIS-style)  
**LLM:** Claude API (primary) + Ollama (fallback)

---

## Phase 0 — Voice Loop
> Goal: HANUMAN can hear you, think, and speak back in character.

- [ ] Python virtual environment set up
- [ ] Ollama installed and `llama3:8b` pulled
- [ ] Anthropic API key configured
- [ ] `core/brain.py` — Ollama + Claude API wrapper with auto-fallback
- [ ] Persona system prompt injected into every request
- [ ] `input/stt.py` — faster-whisper transcription working
- [ ] `output/tts.py` — edge-tts generating audio in `en-GB-RyanNeural`
- [ ] `output/speaker.py` — audio playback working on macOS
- [ ] `main.py` — basic voice loop: listen → think → speak
- [ ] HANUMAN sounds like HANUMAN in first conversation

**Done when:** *"What time is it?" → HANUMAN replies in voice, in character.*

---

## Phase 1 — Clap Activation
> Goal: No wake word. Clap to activate.

- [ ] `awareness/clap_detector.py` — always-on amplitude monitor
- [ ] Single clap detected reliably
- [ ] Double clap detected (within 0.5s window)
- [ ] Triple clap detected (within 1s window)
- [ ] Single clap toggles STT listening on/off
- [ ] Soft audio chime confirms activation
- [ ] Sensitivity tuned — no false triggers from background noise

**Done when:** *One clap → HANUMAN activates. Silence → HANUMAN waits.*

---

## Phase 2 — Adaptive Volume
> Goal: Volume responds to environment automatically.

- [ ] `awareness/noise_monitor.py` — continuous ambient RMS measurement
- [ ] Noise → dB → multiplier mapping implemented
- [ ] Time-of-day multiplier implemented
- [ ] `output/volume_controller.py` — combines all three inputs
- [ ] `output/speaker.py` updated to accept volume parameter
- [ ] Distance multiplier wired in (depends on Phase 3 camera)
- [ ] Clamped to min 0.25 / max 1.0
- [ ] Tested: quiet night → whisper, loud day → full volume

**Done when:** *HANUMAN is noticeably quieter at 11pm than at 3pm in the same room.*

---

## Phase 3 — Camera & Presence
> Goal: HANUMAN sees you and greets you first.

- [ ] `awareness/camera.py` — Aqara RTSP stream connected via OpenCV
- [ ] Frame capture working at idle fps (0.5fps) and active fps (2fps)
- [ ] `awareness/face_recognition.py` — face detection working on stream
- [ ] `scripts/register_face.py` — face registration flow working
- [ ] Own face registered and reliably recognised
- [ ] `awareness/presence.py` — HOME/AWAY state machine working
- [ ] On face recognised → proactive greeting triggered
- [ ] Greeting varies by time of day (morning / afternoon / evening)
- [ ] Auto AWAY after 10 minutes without detected face
- [ ] Unknown face → alert triggered
- [ ] Bounding box distance estimate feeding into volume controller
- [ ] "HANUMAN, what do you see?" → Claude Vision API analyses frame

**Done when:** *Walk into the room → HANUMAN greets before you say a word.*

---

## Phase 4 — Memory
> Goal: HANUMAN remembers you across sessions.

- [ ] `memory/short_term.py` — rolling N-turn conversation buffer
- [ ] `memory/long_term.py` — SQLite store initialised
- [ ] Automatic fact extraction from conversation
- [ ] "HANUMAN, remember that..." → explicit storage
- [ ] Memory summary injected into context at session start
- [ ] Memory persists across restarts

**Done when:** *Tell HANUMAN your coffee preference on Monday. It recalls it on Wednesday.*

---

## Phase 5 — Tools
> Goal: HANUMAN can do things, not just talk.

- [ ] `core/tool_router.py` — LLM-guided intent → tool dispatch
- [ ] `tools/web_search.py` — DuckDuckGo, LLM-summarised results
- [ ] `tools/system_tool.py` — time, date, battery, CPU, RAM
- [ ] `tools/file_manager.py` — read, write, list files
- [ ] `tools/notes.py` — local note-taking
- [ ] Tool chaining working: search + summarise + save

**Done when:** *"Search for X and save the summary to my notes" works end-to-end.*

---

## Phase 6 — Calendar & Gmail via Claude MCP
> Goal: HANUMAN manages your schedule and inbox.

- [ ] Google Calendar API credentials configured
- [ ] `tools/calendar_tool.py` — list, create, delete events
- [ ] Gmail MCP connector configured
- [ ] `tools/gmail_tool.py` — search, read, draft emails
- [ ] Morning briefing: calendar + urgent emails spoken on arrival
- [ ] Proactive alerts: "Sir, your 3pm call is in 15 minutes"

**Done when:** *"What's on tomorrow and do I have urgent emails?" → accurate spoken answer.*

---

## Phase 7 — Lights
> Goal: HANUMAN controls the environment.

- [ ] Home Assistant installed and running locally
- [ ] Lights connected to Home Assistant
- [ ] `tools/lights.py` — Home Assistant REST API wrapper
- [ ] Voice control: "Lights to 40%", "Warm light"
- [ ] Mode → light profile mapping active
- [ ] Auto-lights: on when face detected, off in AWAY mode

**Done when:** *"HANUMAN, I'm heading to bed" → lights dim and fade off.*

---

## Phase 8 — Modes
> Goal: HANUMAN adapts its entire behaviour to context.

- [ ] `core/mode_manager.py` — mode state machine
- [ ] NORMAL, FOCUS, NIGHT, WINDDOWN, MOODY, MORNING, AWAY implemented
- [ ] Double clap cycles modes
- [ ] Voice commands change mode
- [ ] Time-based auto-switching (MORNING 6am, NIGHT 10pm)
- [ ] Mode modifiers injected into persona prompt
- [ ] Volume, lights, and response style all shift with mode
- [ ] Mode logged with timestamps

**Done when:** *"Focus mode" → responses shorten, lights shift cool white, no small talk.*

---

## Phase 9 — Web UI & API
> Goal: Interact with HANUMAN from any device on the network.

- [ ] `api/server.py` — FastAPI server running
- [ ] `/chat` endpoint (text in, text/audio out)
- [ ] `/status` endpoint (mode, presence, volume level)
- [ ] `/mode` endpoint (get/set mode)
- [ ] `/camera/snapshot` endpoint
- [ ] `ui/index.html` — minimal chat interface with mode indicator
- [ ] Streaming LLM responses to UI in real-time
- [ ] Simple token authentication

**Done when:** *Open browser on phone → chat with HANUMAN, see current mode.*

---

## Phase 10 — Raspberry Pi Migration
> Goal: HANUMAN runs 24/7 on Pi, MacBook not required.

- [ ] Raspberry Pi 5 (8GB) set up with Raspberry Pi OS
- [ ] Ollama installed → `phi3:mini` pulled
- [ ] `faster-whisper` `tiny` model running on ARM
- [ ] Piper TTS installed and generating audio
- [ ] `scripts/install_rpi.sh` runs cleanly end-to-end
- [ ] Config switched to RPi profile (`phi3:mini`, `piper`, `tiny`)
- [ ] HANUMAN boots automatically via systemd service
- [ ] Response latency benchmarked and acceptable
- [ ] M4 no longer needed for operation

**Done when:** *MacBook off. HANUMAN still running.*

---

## Decisions Log

| Date | Decision | Reason |
|---|---|---|
| 2026-04-26 | Voice: `en-GB-RyanNeural` | Tested against Indian English. British register fits JARVIS character better. |
| 2026-04-26 | LLM: Claude API primary, Ollama fallback | Claude has vision + MCP connectors. Ollama for offline/free fallback. |
| 2026-04-26 | No wake word | JARVIS never had one. Camera presence = activation trigger. |
| 2026-04-26 | Modes deferred to Phase 8 | Infrastructure built in earlier phases; modes compose everything above. |
| 2026-04-26 | Adaptive volume: 3 inputs | Noise + time + distance gives genuinely context-aware output. |
