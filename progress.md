# HANUMAN — Build Progress

> Last updated: 2026-05-02

---

## Current Status

**Phase:** Phase 1 — Clap Activation (next up)
**UI:** Volumetric particle sphere HUD live at `http://localhost:8000`
**Voice:** `en-GB-RyanNeural` (British, JARVIS-style)
**LLM:** Ollama `llama3.2:3b` (primary, offline) + Claude API (when key set) + Mock (no dependencies)
**Last milestone:** Voice pipeline fully operational — Ollama wired in, all async/audio bugs resolved ✓

---

## Phase 0 — Voice Loop ✓ COMPLETE
> Goal: HANUMAN can hear you, think, and speak back in character.

- [x] Python virtual environment set up (`.venv`)
- [x] Anthropic API key configured via `.env` (optional — Ollama is primary)
- [x] `core/brain.py` — Ollama primary, Claude API fallback, mock mode (no dependencies)
- [x] Persona system prompt injected into every request via `config/persona.txt`
- [x] `core/context.py` — rolling conversation buffer (20 turns)
- [x] `input/stt.py` — faster-whisper with VAD silence detection + hallucination guard
- [x] `output/tts.py` — edge-tts generating audio in `en-GB-RyanNeural`
- [x] `output/speaker.py` — `afplay` on macOS, `mpg123` on RPi, volume param
- [x] `output/volume_controller.py` — noise + time + distance adaptive volume
- [x] `main.py` — voice loop: listen → think → speak, graceful shutdown
- [x] Smoke test passed — *"All systems online, sir. HANUMAN is ready."*

**Completed:** 2026-04-26

---

## Web UI & API ✓ COMPLETE (v2 rebuilt 2026-04-27)
> Goal: Interact with HANUMAN from any device on the network.

- [x] `ui/` — React + Vite + TypeScript, 350 KB bundle (no Three.js)
- [x] `ui/src/components/ui/particle-ring.tsx` — volumetric 3D particle sphere (Canvas 2D)
  - Particula algorithm: uniform sphere-volume distribution (cube-root radius sampling)
  - 3D simplex-noise turbulence on 3 independent planes drives per-particle velocity
  - Perspective projection (`depth = FOCAL - rz`) — front particles larger/brighter
  - Additive blending (`'lighter'`) — dim particles accumulate into glowing nebula
  - Soft radius constraint keeps particles contained; lifetime fade-in/out/respawn
  - idle = quiet blue sphere, listening = cyan, thinking = slow purple, speaking = 2 counter-rotating spheres
- [x] ElevenLabs `ShimmeringText` — last utterance shimmers while speaking
- [x] ElevenLabs dark colour theme (OKLCH CSS variables) throughout
- [x] WebSocket-connected to FastAPI backend, demo mode when offline
- [x] FastAPI serves `ui/dist/` (built bundle) at `/`
- [x] Top bar: presence dot, mode badge, connection indicator
- [x] Live transcript with user / HANUMAN turns
- [x] Text input fallback for typed commands
- [x] Demo mode cycles all four states when backend not connected
- [x] `api/server.py` — FastAPI with WebSocket (`/ws`), `/status`, `/` serves UI
- [x] `main.py` broadcasts state changes to all connected UI clients in real-time
- [x] `simplex-noise` added for 3D Perlin noise in JS
- [x] asyncio event loop bug fixed — voice thread now broadcasts status correctly
- [x] WebSocket text handler: `think`, `synthesise`, `play` run via `run_in_executor`
- [ ] `/mode` endpoint (get/set mode) — Phase 8
- [ ] `/camera/snapshot` endpoint — Phase 3
- [ ] Simple token authentication — future

**Completed:** 2026-04-27 (async fixes: 2026-05-02)

---

## Voice Pipeline Fixes ✓ (2026-05-02)
> Goal: HANUMAN actually hears you and responds intelligently.

- [x] **asyncio event loop bug** — `_broadcast()` used `asyncio.get_event_loop()` from daemon thread (Python 3.9: returns wrong loop, silent failure). Fixed: `server.py` saves its loop at startup via `@app.on_event("startup")`; `get_loop()` exposes it; `main.py` uses it directly.
- [x] **Energy gate too aggressive** — `peak_rms < 0.02` was filtering out the user's voice (actual voice RMS ~0.006). Lowered gate to `0.005` — blocks true silence, passes speech.
- [x] **Whisper hallucination guard** — `vad_filter=True` (Silero VAD) strips non-speech before Whisper; known phantom phrase blocklist (`_HALLUCINATIONS`) discards common hallucinations.
- [x] **TTS async error in WebSocket** — `synthesise()` uses `asyncio.run()` internally which fails inside uvicorn's event loop. Fixed: `synthesise` and `play` moved to `run_in_executor()` in the WebSocket handler.
- [x] **Ollama response parsing** — old code used `response["message"]["content"]` (dict access); ollama library returns `ChatResponse` object. Fixed to `response.message.content`.
- [x] **Mock LLM mode** — canned responses for UI testing, no API or model needed (`primary: mock`).
- [x] Debug logging added to `listen()` — logs actual RMS so mic sensitivity can be tuned.

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
| 2026-04-26 | LLM: Ollama primary, Claude API optional | Ollama is free, offline, and fast enough for daily use. Claude for vision + MCP. |
| 2026-04-26 | No wake word | JARVIS never had one. Camera presence = activation trigger. |
| 2026-04-26 | Modes deferred to Phase 8 | Infrastructure built in earlier phases; modes compose everything above. |
| 2026-04-26 | Adaptive volume: 3 inputs | Noise + time + distance gives genuinely context-aware output. |
| 2026-04-26 | Phase 0 complete | Voice loop working. Smoke test passed at 0.85 volume. HANUMAN spoke. |
| 2026-04-26 | HUD UI — React + ElevenLabs UI | Converted to React/Vite. ElevenLabs dark theme. Built to dist/, served by FastAPI. |
| 2026-04-27 | UI v2 — custom particle sphere replaces ElevenLabs Orb | Orb (Three.js/R3F) removed. Canvas 2D particle sphere using Particula algorithm: simplex-noise turbulence, perspective projection, additive blending. Bundle 1.24 MB → 350 KB. |
| 2026-04-27 | Mock LLM mode added | `primary: mock` in settings.yaml lets the full voice pipeline run with no API key or model. |
| 2026-04-27 | Python 3.9 compatibility fixes | `X \| None` union syntax replaced with `Optional[X]` throughout. Imports deferred so missing packages don't crash startup. |
| 2026-05-02 | Ollama as primary LLM | Installed via brew, `llama3.2:3b` pulled (~2GB). Free, offline, fast on M4. Claude remains available when API key set. |
| 2026-05-02 | asyncio event loop fix | `_broadcast()` in voice thread was silently failing — wrong loop from `get_event_loop()`. Fixed by saving the running loop at server startup and sharing via `get_loop()`. |
| 2026-05-02 | STT energy gate lowered 0.02 → 0.005 | User's mic produces ~0.006 RMS for normal speech. Old gate was 3× too high and silently swallowed every word. VAD filter handles true silence. |
| 2026-05-02 | Ollama response parsing fixed | `ollama.chat()` returns a `ChatResponse` object, not a dict. Fixed `response["message"]["content"]` → `response.message.content`. |
| 2026-05-02 | WebSocket handler async fix | `synthesise()` uses `asyncio.run()` internally, which fails inside uvicorn's event loop. Moved to `loop.run_in_executor()` in server.py. |
