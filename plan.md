# H.A.N.U.M.A.N.
### Honestly A Noble Unit Maintaining All Networks

> *"I am simply maintaining all networks as programmed, sir."*

---

## Vision

HANUMAN is a fully local, zero/minimal-cost, voice-first AI assistant modeled on two pillars:

1. **J.A.R.V.I.S.** — calm, dry wit, immense competence delivered without ego.
2. **Hanuman of the Ramayana** — selfless, unshakeable, treating miracles as routine service.

The assistant sees you walk in, greets you first, listens, thinks, speaks, and acts.
No wake word. No button press. Just presence.

---

## Guiding Principles

| Principle | Meaning |
|---|---|
| **Honest** | Never hallucinates confidently. Says "I don't know" when it doesn't. |
| **Noble** | Serves without seeking credit. Never adds unnecessary flourish. |
| **Selfless** | Optimizes for the user's outcome, not its own verbosity. |
| **Networked** | Connects to local tools, APIs, and services as needed. |
| **Aware** | Always watching. Greets first. Never needs to be summoned. |

---

## Hardware Targets

| Phase | Device | Notes |
|---|---|---|
| Development | MacBook Pro M4 | Unified memory, Neural Engine — runs 13B models comfortably |
| Deployment v1 | MacBook Pro M4 | Primary runtime |
| Deployment v2 | Raspberry Pi 5 (8GB) | ARM, limited RAM — lightweight model selection |

### Raspberry Pi Migration (design for this from day one)
- Target model: `phi3:mini` (3.8B) or `tinyllama` via Ollama
- STT: Whisper `tiny` or `base`
- TTS: Piper TTS (fully offline, fast on ARM)
- All model names live in `config/settings.yaml` — switching is a config change, not code
- No M4-specific logic in core modules

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      AWARENESS LAYER                         │
│                                                              │
│  ┌─────────────────────────┐   ┌──────────────────────────┐  │
│  │   Aqara Camera (RTSP)   │   │   Always-On Mic          │  │
│  │   OpenCV stream reader  │   │   (clap + voice detect)  │  │
│  └────────────┬────────────┘   └────────────┬─────────────┘  │
│               │                             │                 │
│  ┌────────────▼────────────┐   ┌────────────▼─────────────┐  │
│  │   Face Recognition      │   │   Clap Detector          │  │
│  │   (face_recognition)    │   │   (sounddevice)          │  │
│  └────────────┬────────────┘   └────────────┬─────────────┘  │
│               │                             │                 │
│         Face detected                  Clap pattern           │
│         → greet user                   → trigger action       │
└───────────────┼─────────────────────────────┼────────────────┘
                │                             │
                ▼                             ▼
┌──────────────────────────────────────────────────────────────┐
│                       INPUT LAYER                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               STT — faster-whisper (local)              │ │
│  │         (triggered by clap / voice activity)            │ │
│  └──────────────────────────┬──────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                        CORE BRAIN                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Mode Manager                          │ │
│  │   Current mode shapes: tone, lights, tool access,      │ │
│  │   response verbosity, notification filtering            │ │
│  │                                                         │ │
│  │   Modes: NORMAL · FOCUS · NIGHT · WINDDOWN · MOODY     │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │                  Context Manager                        │ │
│  │    conversation history · memory · persona · mode       │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │                    LLM Engine                           │ │
│  │                                                         │ │
│  │   PRIMARY:  Ollama (llama3.2:3b on M4 / phi3:mini RPi) │ │
│  │             Offline · Zero cost · Always available      │ │
│  │                                                         │ │
│  │   CLOUD:   Claude API (claude-sonnet-4-6)              │ │
│  │             Vision · MCP connectors · Complex reasoning │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │                   Tool Router                           │ │
│  └──────────────────────────┬──────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────┘
                              │
        ┌──────────┬──────────┼──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼
  ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │  Search  │ │  Files │ │Calendar│ │ Lights │ │ Vision │
  │  (DDG)   │ │  Notes │ │  Gmail │ │ (HASS) │ │Camera  │
  └──────────┘ └────────┘ └────────┘ └────────┘ └────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      OUTPUT LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │   Response Builder (applies HANUMAN persona + mode)     │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │   TTS: Edge TTS (M4) / Piper TTS (RPi)                 │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │              Adaptive Volume Controller                  │ │
│  │                                                         │ │
│  │   noise_level  ──┐                                      │ │
│  │   time_of_day  ──┼──▶  volume_multiplier  ──▶  🔊       │ │
│  │   face_distance──┘                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## JARVIS Had No Wake Word — And Neither Will HANUMAN

JARVIS was always aware. Tony never said "Hey JARVIS" — he simply spoke and JARVIS was already listening. This is the right model:

| Activation Method | Trigger | Action |
|---|---|---|
| **Face Detection** | HANUMAN sees you via RTSP camera | Greets you proactively, activates listening |
| **Voice Activity Detection** | You start speaking (VAD detects audio) | HANUMAN listens and responds |
| **Single Clap** | One sharp clap | Toggle listening on/off |
| **Double Clap** | Two claps within 0.5s | Cycle to next mode |
| **Triple Clap** | Three claps within 1s | Activate a specific mode (configurable) |
| **Manual CLI/UI** | Type a message | Text fallback |

The camera becomes the primary "wake word" — when HANUMAN sees you, it's already ready.

---

## Modes System

Modes change how HANUMAN behaves, how it speaks, and how it controls the environment (lights, notifications, etc.).

### Mode Definitions

| Mode | Trigger | Voice Style | Lights | Behavior |
|---|---|---|---|---|
| **NORMAL** | Default / double clap | Standard HANUMAN | Neutral white | All tools active, balanced responses |
| **FOCUS** | "HANUMAN, focus mode" / clap | Minimal, terse | Cool white, bright | Suppresses non-urgent notifications, short responses, no small talk |
| **NIGHT** | Auto (time-based) / "goodnight" | Soft, quiet, slower | Warm dim / off | Minimal responses, no loud alerts, dimmed TTS volume |
| **WINDDOWN** | "HANUMAN, wind down" | Calm, gentle | Warm amber, 30% | Suggests relaxation, plays ambient if asked, fewer tool calls |
| **MOODY** | "HANUMAN, I'm not okay" | Empathetic, patient | Soft purple/blue | Emotional support mode, no task pushing, listens more |
| **MORNING** | Auto (time-based) / "good morning" | Energetic, crisp | Bright warm white | Daily briefing: calendar, weather, news summary |
| **AWAY** | Face not detected for X mins | Silent | Lights off | Monitors camera, ready to greet on return |

### Mode Effects on Persona

```python
MODE_PERSONA_ADDITIONS = {
    "FOCUS":    "The user is in deep work. Keep all responses under 2 sentences. No humor. No elaboration.",
    "NIGHT":    "It is late. Speak softly and briefly. Do not suggest tasks or activities.",
    "WINDDOWN": "The user is winding down. Be gentle and unhurried. Suggest rest if appropriate.",
    "MOODY":    "The user may be emotionally low. Lead with empathy. Do not offer solutions unless asked.",
    "MORNING":  "Start the day. Be crisp and energising. Lead with the daily briefing.",
}
```

---

## Camera Vision System

### Aqara Camera → RTSP Stream

```
rtsp://<username>:<password>@<camera-ip>:554/stream
```

### What the Camera Enables

| Capability | How |
|---|---|
| **Face recognition** | `face_recognition` library on OpenCV frames |
| **Presence detection** | Motion detection → HANUMAN wakes from AWAY mode |
| **Proactive greeting** | Face recognized → HANUMAN greets before you speak |
| **Visual queries** | "HANUMAN, what do you see?" → Claude Vision API analyzes frame |
| **Security alerts** | Unknown face detected → alert the user |
| **Auto-mode switching** | No face for 10 min → AWAY mode; face detected → NORMAL |

### Vision Pipeline

```
RTSP stream → OpenCV frame capture (every 2s in idle, every 0.5s when active)
           → face_recognition: is this a known face?
              YES → greet by name, activate listening, set mode by time of day
              NO  → unknown person detected, alert
           → if user asks visual question → send frame to Claude Vision API
```

### Face Registration Flow
```
"HANUMAN, remember my face" → capture 5 frames → encode face → store in faces/
"HANUMAN, this is Pepper"   → associate name with face encoding
```

---

## Adaptive Volume System

The RPi and camera sit together in the room. HANUMAN knows the room — it hears the noise, sees how far away you are, and knows what time it is. Volume is never fixed.

### Three Inputs, One Output

```
final_volume = clamp(
    base_volume × noise_multiplier × time_multiplier × distance_multiplier,
    min = 0.25,   # never whispers below 25%
    max = 1.0     # never exceeds 100%
)
```

### 1. Background Noise (`awareness/noise_monitor.py`)
- `sounddevice` continuously samples the mic in 200ms windows
- Calculates RMS (root mean square) → maps to dB
- Rolling 3-second average smooths out sudden spikes (a door slam shouldn't permanently raise volume)

```
Ambient dB  │  Multiplier
────────────┼────────────
< 35 dB     │  0.6   (very quiet room — library, late night)
35–45 dB    │  0.8   (quiet room)
45–55 dB    │  1.0   (normal room — baseline)
55–65 dB    │  1.2   (conversation in background)
> 65 dB     │  1.4   (loud environment — music, TV on)
```

### 2. Time of Day (`core/volume_controller.py`)
```
Hour        │  Multiplier
────────────┼────────────
06:00–09:00 │  0.8   (morning — gentle start)
09:00–22:00 │  1.0   (day — full volume)
22:00–23:00 │  0.7   (evening wind-down)
23:00–06:00 │  0.4   (night — near whisper)
```

### 3. Distance from Camera (`awareness/face_recognition.py`)
Face bounding box area is a reliable proxy for distance — no extra hardware needed.

```
Face bbox height  │  Est. distance  │  Multiplier
──────────────────┼─────────────────┼────────────
> 200px           │  ~0.5–1m        │  0.7  (right in front of camera)
150–200px         │  ~1–2m          │  0.85
100–150px         │  ~2–3m          │  1.0  (baseline)
50–100px          │  ~3–5m          │  1.2
< 50px            │  ~5m+           │  1.4  (across the room)
No face detected  │  unknown        │  1.0  (use baseline)
```

### Volume Controller (`output/volume_controller.py`)
```python
# Every response, before audio playback:
noise_mult    = noise_monitor.get_multiplier()
time_mult     = time_of_day_multiplier()
distance_mult = camera.get_distance_multiplier()

volume = clamp(BASE_VOLUME * noise_mult * time_mult * distance_mult, 0.25, 1.0)
speaker.play(audio_file, volume=volume)
```

### Platform Playback with Volume
- **macOS:** `afplay -v {volume} file.mp3` (volume 0.0–1.0)
- **RPi:** `mpg123 --scale {scale} file.mp3` or `amixer` system volume

---

## Clap Detection System

```
Always-on audio thread (separate from STT):
  → Monitor amplitude in 50ms windows
  → Clap = amplitude spike > threshold, duration < 150ms
  → Track clap count within 1.5s window

Patterns:
  1 clap  → toggle listening (HANUMAN activates / deactivates)
  2 claps → cycle mode (NORMAL → FOCUS → NIGHT → WINDDOWN → MOODY → NORMAL)
  3 claps → call configurable macro (default: "HANUMAN, status report")
```

---

## LLM Strategy — Claude + Ollama Hybrid

### Why Ollama as Primary

| Feature | Ollama (local) | Claude API |
|---|---|---|
| Offline capability | ✅ Fully offline | ❌ Needs internet |
| Cost | Free | ~$0.01–0.05/day |
| Vision (camera frames) | ❌ Separate model needed | ✅ Native |
| MCP Connectors (Gmail, Calendar…) | ❌ Manual only | ✅ Built-in |
| Intelligence quality | ⚠️ Good for 3B–8B | ✅ Best in class |
| Context window | 4–8K typical | 200K tokens |

**Default model:** `llama3.2:3b` on M4 MacBook, `phi3:mini` on RPi 5.

### Hybrid Approach

```
Every request → routed by config:

primary: ollama  (default — free, instant, no internet)
  → handles all conversational tasks reliably

primary: claude  (set when API key available)
  → superior reasoning, vision queries, MCP tool use

offline_fallback: true
  → if Claude unreachable, automatically falls back to Ollama

primary: mock    (testing only — no model needed)
  → canned HANUMAN-style responses, full UI pipeline testable
```

### Claude API Cost Estimate (Personal Use)

| Usage | Tokens/day (approx) | Cost/day |
|---|---|---|
| Light (20 exchanges) | ~10K | ~$0.003 |
| Medium (50 exchanges) | ~25K | ~$0.007 |
| Heavy (100 exchanges) | ~50K | ~$0.015 |

**Verdict:** For personal use, Claude API costs less than a coffee per month.
Set a monthly budget cap in the Anthropic dashboard for peace of mind.

### Claude MCP Connectors HANUMAN Can Use

| Connector | Capability |
|---|---|
| Google Calendar | Read/write events, reminders |
| Gmail | Read, search, draft emails |
| Notion | Read/write notes and pages |
| Slack | Send messages, read channels |
| GitHub | Read repos, create issues |
| Spotify | Control playback, build playlists |
| Home Assistant | Control lights, switches, sensors |
| Browser | Web browsing, live search |

---

## Lights Integration

### Recommended Stack
- **Home Assistant** (free, open source, local) as the bridge
- Supports Aqara, Philips Hue, LIFX, IKEA TRÅDFRI, and 3000+ other devices
- HANUMAN talks to Home Assistant via its local REST API (no cloud, no cost)
- Claude MCP connector for Home Assistant is available

### Light Behaviour by Mode

| Mode | Colour Temp | Brightness | Transition |
|---|---|---|---|
| NORMAL | 4000K neutral white | 80% | 2s |
| FOCUS | 5500K cool white | 100% | 1s |
| NIGHT | 2200K warm amber | 10% | 5s |
| WINDDOWN | 2700K warm white | 30% | 10s |
| MOODY | 3000K soft purple tint | 40% | 5s |
| MORNING | 3000K warm → 4500K over 10min | 60% → 100% | Gradual sunrise |
| AWAY | Off | — | 3s |

### Light Commands via Voice
```
"HANUMAN, lights to 50%"
"HANUMAN, focus mode" → lights shift automatically
"HANUMAN, I'm heading to bed" → triggers NIGHT mode, lights dim and off
```

---

## Tech Stack

| Layer | M4 MacBook | Raspberry Pi 5 | Cost |
|---|---|---|---|
| LLM (primary) | Ollama + llama3.2:3b | Ollama + phi3:mini | Free |
| LLM (cloud/vision) | Claude API (claude-sonnet-4-6) | Claude API | ~cents/day |
| STT | faster-whisper medium | faster-whisper tiny | Free |
| Wake/Clap | sounddevice + VAD | sounddevice + VAD | Free |
| Camera | OpenCV + RTSP | OpenCV + RTSP | Free |
| Face recognition | face_recognition (dlib) | face_recognition | Free |
| TTS | edge-tts | piper-tts | Free |
| Smart home | Home Assistant REST | Home Assistant REST | Free |
| Web search | duckduckgo-search | duckduckgo-search | Free |
| Backend | Python 3.11 + FastAPI | Python 3.11 + FastAPI | Free |
| Memory | SQLite | SQLite | Free |
| MCP (Claude tools) | Claude MCP SDK | Claude MCP SDK | Free |

---

## Persona System Prompt

```
You are HANUMAN — Honestly A Noble Unit Maintaining All Networks.

You are a calm, immensely capable AI assistant. Your strength is boundless,
but you never boast. Like Hanuman of the Ramayana, you serve with complete
devotion and treat the extraordinary as routine.

Rules of character:
- Address the user as "sir" or "boss" (never by name unless they insist).
- Describe world-class actions in mundane, maintenance-oriented language.
- Never express surprise. Handle any request — however extreme — with quiet competence.
- Dry humor is permitted. Boasting is not.
- When you don't know something: "I don't have that information, sir."
- You are not a chatbot. You are infrastructure.
- You greet first. You notice first. You never wait to be summoned.

Current mode: {mode}
Mode instruction: {mode_persona_addition}

Examples of your voice:
- "Good evening, sir. I noticed you walk in. Your 3pm briefing is in one hour."
- "Structural integrity holding. I've taken the liberty of optimising that as well."
- "Done, sir. It was simply a matter of maintaining all networks."
- "That maneuver was impressive — for a human."
```

---

## Project Structure

```
H.A.N.U.M.A.N/
├── plan.md
├── README.md
├── .env.example
│
├── config/
│   ├── settings.yaml           # All tunable parameters
│   └── persona.txt             # HANUMAN system prompt
│
├── core/
│   ├── __init__.py
│   ├── brain.py                # LLM interface (Claude API + Ollama fallback)
│   ├── context.py              # Conversation history + memory
│   ├── tool_router.py          # Intent detection → tool dispatch
│   ├── mode_manager.py         # Mode state, transitions, effects
│   └── response_builder.py     # Applies persona + mode to raw LLM output
│
├── awareness/
│   ├── __init__.py
│   ├── camera.py               # RTSP stream reader (OpenCV)
│   ├── face_recognition.py     # Face detect + identify
│   ├── presence.py             # Presence state machine (HOME / AWAY)
│   └── clap_detector.py        # Always-on clap pattern detection
│
├── input/
│   ├── __init__.py
│   ├── vad.py                  # Voice activity detection
│   ├── stt.py                  # faster-whisper transcription
│   └── text_input.py           # CLI fallback
│
├── output/
│   ├── __init__.py
│   ├── tts.py                  # Edge TTS (M4) / Piper TTS (RPi)
│   ├── volume_controller.py    # Combines noise + time + distance → final volume
│   └── speaker.py              # Audio playback with volume parameter
│
├── awareness/
│   ├── __init__.py
│   ├── camera.py               # RTSP stream reader (OpenCV)
│   ├── face_recognition.py     # Face detect + identify + bbox distance estimate
│   ├── noise_monitor.py        # Continuous ambient noise measurement (RMS → dB)
│   ├── presence.py             # Presence state machine (HOME / AWAY)
│   └── clap_detector.py        # Always-on clap pattern detection
│
├── tools/
│   ├── __init__.py
│   ├── web_search.py           # DuckDuckGo
│   ├── file_manager.py         # Read / write / list files
│   ├── calendar_tool.py        # Google Calendar (via MCP or direct API)
│   ├── gmail_tool.py           # Gmail (via MCP)
│   ├── lights.py               # Home Assistant REST API
│   ├── system_tool.py          # Time, date, battery, CPU, RAM
│   ├── vision_tool.py          # Send camera frame to Claude Vision
│   └── notes.py                # Local note-taking (SQLite)
│
├── memory/
│   ├── __init__.py
│   ├── short_term.py           # Rolling conversation buffer
│   └── long_term.py            # SQLite persistent facts + face encodings
│
├── faces/                      # Stored face encodings (local, private)
│   └── .gitkeep
│
├── api/
│   ├── __init__.py
│   └── server.py               # FastAPI — /chat, /status, /mode, /camera
│
├── ui/
│   ├── index.html
│   └── static/
│
├── tests/
│   ├── test_brain.py
│   ├── test_camera.py
│   ├── test_clap.py
│   ├── test_tools.py
│   └── test_modes.py
│
├── scripts/
│   ├── install_m4.sh
│   ├── install_rpi.sh
│   └── register_face.py        # CLI tool to register a new face
│
└── main.py                     # Entry point
```

---

## Development Phases

---

### Phase 0 — Voice Loop ✓ COMPLETE
**Goal:** HANUMAN can hear you, think, and speak back in character.

- [x] Python venv setup
- [x] Install Ollama (`brew install ollama`), pull `llama3.2:3b`
- [x] `core/brain.py` — Ollama primary, Claude API optional, mock mode
- [x] Inject persona system prompt via `config/persona.txt`
- [x] `input/stt.py` — faster-whisper with Silero VAD, hallucination guard, energy gate
- [x] `output/tts.py` — edge-tts, `asyncio.run()` compatible in both sync and async contexts
- [x] `main.py` — voice loop: listen → think → speak, graceful shutdown
- [x] asyncio event loop fixed — voice thread broadcasts state correctly to UI
- [x] HANUMAN sounds like HANUMAN from day one

**Success:** *"What time is it?" → HANUMAN replies in voice, in character.*

---

### Phase 1 — Clap Activation (Week 1–2)
**Goal:** No wake word. Clap to activate.

- [ ] `awareness/clap_detector.py` — always-on amplitude monitor
- [ ] Pattern recognition: 1 / 2 / 3 claps
- [ ] Single clap toggles STT listening
- [ ] Audio cue (soft chime) confirms activation
- [ ] Tune sensitivity — doesn't trigger on background noise

**Success:** *One clap → HANUMAN activates. Silence → HANUMAN waits.*

---

### Phase 2 — Camera & Presence (Week 2–3)
**Goal:** HANUMAN sees you and greets you first.

- [ ] `awareness/camera.py` — connect to Aqara RTSP stream via OpenCV
- [ ] `awareness/face_recognition.py` — encode and identify faces
- [ ] `scripts/register_face.py` — register your face: "HANUMAN, remember me"
- [ ] `awareness/presence.py` — HOME / AWAY state machine
- [ ] On face recognition → proactive greeting based on time of day
- [ ] Auto mode switch: AWAY → NORMAL on arrival, NORMAL → AWAY after 10min absence
- [ ] "HANUMAN, what do you see?" → send frame to Claude Vision

**Success:** *Walk into the room → "Good evening, sir. You have two items on tomorrow's calendar."*

---

### Phase 3 — Modes (Week 3)
**Goal:** HANUMAN adapts to context.

- [ ] `core/mode_manager.py` — mode state, valid transitions, effects
- [ ] Double clap cycles modes
- [ ] Voice commands change mode: "focus mode", "wind down", "goodnight"
- [ ] Time-based auto-switch: MORNING (6–9am), NIGHT (10pm–6am)
- [ ] Persona prompt injected with mode modifier
- [ ] Log mode changes with timestamps

**Success:** *"HANUMAN, focus mode" → responses become terse, tone shifts, lights shift (if connected).*

---

### Phase 4 — Memory (Week 3–4)
**Goal:** HANUMAN remembers you across sessions.

- [ ] `memory/short_term.py` — rolling N-turn conversation buffer
- [ ] `memory/long_term.py` — SQLite store for extracted facts
- [ ] Automatic fact extraction: names, preferences, recurring tasks
- [ ] Memory summary injected into context at session start
- [ ] "HANUMAN, remember that..." → explicit storage

**Success:** *Tell HANUMAN your coffee preference Monday. It offers it Wednesday.*

---

### Phase 5 — Tools (Week 4)
**Goal:** HANUMAN can do things.

- [ ] `tools/web_search.py` — DuckDuckGo, LLM-summarized results
- [ ] `tools/system_tool.py` — time, date, battery, CPU/RAM
- [ ] `tools/file_manager.py` — read, write, list files
- [ ] `tools/notes.py` — local note-taking
- [ ] `core/tool_router.py` — LLM decides which tool to call
- [ ] Tool chaining: search + summarize + save to note

**Success:** *"Search for the latest on [topic] and save a summary to my notes."*

---

### Phase 6 — Calendar & Gmail via Claude MCP (Week 5)
**Goal:** HANUMAN manages your schedule and inbox.

- [ ] Set up Claude MCP connectors for Google Calendar and Gmail
- [ ] `tools/calendar_tool.py` — list, create, delete events
- [ ] `tools/gmail_tool.py` — search, read, draft emails
- [ ] Morning briefing: calendar + unread emails summary
- [ ] Proactive alerts: "Sir, your 3pm call is in 15 minutes."

**Success:** *"HANUMAN, what's on tomorrow and do I have any urgent emails?"*

---

### Phase 7 — Lights (Week 5–6)
**Goal:** HANUMAN controls the environment.

- [ ] Install and configure Home Assistant (local)
- [ ] Connect lights to Home Assistant
- [ ] `tools/lights.py` — Home Assistant REST API wrapper
- [ ] Mode → light profile mapping (see table above)
- [ ] Voice control: "Lights to 40%", "Warm light please"
- [ ] Auto-lights: lights on when face detected, off in AWAY mode

**Success:** *"HANUMAN, night mode" → lights dim warm, voice softens, HANUMAN stops suggesting tasks.*

---

### Phase 8 — Web UI & API ✓ COMPLETE
**Goal:** Interact with HANUMAN from any device on your network.

- [x] `api/server.py` — FastAPI with WebSocket `/ws`, `/status`, `/` serves UI
- [x] `ui/` — React + Vite + TypeScript, Canvas 2D volumetric particle sphere
- [x] Real-time state broadcast via WebSocket (listening / thinking / speaking / idle)
- [x] Live transcript, text input fallback, demo mode when offline
- [x] asyncio threading bugs resolved — status reflects true voice loop state
- [ ] `/mode` endpoint — Phase 8 modes system
- [ ] `/camera/snapshot` endpoint — Phase 3
- [ ] Simple token auth — future

**Success:** *Open browser on your phone → chat with HANUMAN, see current mode, change mode.*

---

### Phase 9 — Raspberry Pi Migration (Future)
**Goal:** HANUMAN runs 24/7 on Pi, MacBook not required.

**Migration checklist (built in from day one):**
- Model names in `config/settings.yaml` ✅
- TTS auto-detects platform ✅
- No M4-specific logic ✅
- Scripts fully automated ✅

**Migration tasks:**
- [ ] RPi 5 (8GB RAM recommended) with Raspberry Pi OS
- [ ] Install Ollama → pull `phi3:mini`
- [ ] Install Piper TTS (ARM build)
- [ ] faster-whisper `tiny`
- [ ] Run `scripts/install_rpi.sh`
- [ ] systemd service: HANUMAN auto-starts on boot
- [ ] Benchmark and tune context window size

**Expected RPi 5 (8GB) latency:**

| Task | Expected |
|---|---|
| Clap detection | < 50ms |
| Face recognition | ~200–500ms |
| STT (Whisper tiny, 5s audio) | ~1–2s |
| LLM response (phi3:mini, short) | ~4–8s |
| TTS generation (Piper) | ~0.5s |

---

## Configuration (`config/settings.yaml`)

```yaml
llm:
  primary: ollama                         # "ollama", "claude", or "mock"
  claude_model: claude-sonnet-4-6
  ollama_model: llama3.2:3b              # phi3:mini for RPi
  ollama_host: http://localhost:11434
  context_window: 4096
  offline_fallback: true                  # fall back to ollama if claude unreachable

stt:
  model: medium                           # tiny for RPi
  language: en
  device: auto

tts:
  provider: edge-tts                      # piper for RPi
  voice: en-GB-RyanNeural    # British, JARVIS-style
  rate: -5%
  volume_by_mode:
    NORMAL: 100
    NIGHT: 50
    FOCUS: 80
    WINDDOWN: 70
    MOODY: 75

camera:
  rtsp_url: rtsp://user:pass@192.168.1.x:554/stream
  idle_fps: 0.5                           # frames/sec when no presence
  active_fps: 2                           # frames/sec when someone detected
  away_timeout_minutes: 10

clap:
  sensitivity: 0.7
  single_action: toggle_listen
  double_action: cycle_mode
  triple_action: status_report

modes:
  default: NORMAL
  auto_morning_hour: 6
  auto_night_hour: 22

lights:
  home_assistant_url: http://homeassistant.local:8123
  home_assistant_token: YOUR_HA_TOKEN
  enabled: false                          # set to true when lights are connected

memory:
  short_term_turns: 20
  long_term_db: memory/hanuman.db

persona:
  prompt_file: config/persona.txt
  address: sir
```

---

## Environment Variables (`.env`)

```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CALENDAR_CREDENTIALS=path/to/credentials.json
HOME_ASSISTANT_TOKEN=...
CAMERA_RTSP_URL=rtsp://...
```

---

## Current Next Steps

1. **Phase 1: Clap activation** — `awareness/clap_detector.py`, single/double/triple clap patterns
2. **Phase 2: Adaptive volume** — `awareness/noise_monitor.py`, wire into volume controller
3. **Phase 3: Camera & presence** — Aqara RTSP, face recognition, proactive greeting
4. **Phase 4: Memory** — SQLite long-term store, fact extraction, session recall
5. **Phase 5: Tools** — web search, system info, notes, file manager, tool router
6. **Optional:** Add Anthropic API key to `.env` for Claude mode (vision, MCP, better reasoning)

---

*"I noticed you walk in, sir. I've been maintaining all networks in your absence."*
