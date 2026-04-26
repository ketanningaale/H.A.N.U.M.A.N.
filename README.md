# H.A.N.U.M.A.N.
### Honestly A Noble Unit Maintaining All Networks

> *"Done, sir. It was simply a matter of maintaining all networks."*

A fully local, voice-first AI assistant inspired by J.A.R.V.I.S. from Iron Man and Hanuman from the Ramayana. Calm, immensely capable, and completely selfless — HANUMAN treats the extraordinary as routine maintenance.

---

## Features

- **Always aware** — no wake word. HANUMAN sees you walk in via an RTSP camera and greets you first.
- **Voice-first** — speaks and listens using a British JARVIS-style voice (`en-GB-RyanNeural`).
- **Clap activation** — single clap toggles listening, double clap cycles modes, triple clap triggers a status report.
- **Adaptive volume** — output volume adjusts automatically based on background noise, time of day, and your distance from the camera.
- **Face recognition** — identifies you and greets by context. Alerts on unknown faces.
- **Persistent memory** — remembers facts, preferences, and context across sessions.
- **Tool use** — web search, calendar, Gmail, file management, notes, system status.
- **Smart lights** — controls lights via Home Assistant, shifting profiles with modes.
- **Claude-powered** — uses Claude API for reasoning and vision, Ollama as a free offline fallback.
- **Modes** — NORMAL, FOCUS, NIGHT, WINDDOWN, MOODY, MORNING, AWAY.
- **RPi-ready** — designed from day one to migrate to Raspberry Pi 5.

---

## Hardware

| Component | Details |
|---|---|
| Primary dev machine | MacBook Pro M4 |
| Target deployment | Raspberry Pi 5 (8GB) |
| Camera | Aqara camera via RTSP |
| Lights | Any Home Assistant-compatible bulbs |

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM (primary) | Claude API — `claude-sonnet-4-6` |
| LLM (fallback) | Ollama — `llama3:8b` (M4) / `phi3:mini` (RPi) |
| LLM (testing) | Mock engine — canned responses, no API needed |
| Speech-to-Text | `faster-whisper` |
| Text-to-Speech | `edge-tts` (M4) / `piper-tts` (RPi) |
| Voice | `en-GB-RyanNeural` |
| Camera | OpenCV + RTSP |
| Face recognition | `face_recognition` (dlib) |
| Noise monitoring | `sounddevice` |
| Smart home | Home Assistant REST API |
| Web search | `duckduckgo-search` |
| Memory | SQLite |
| API server | FastAPI |
| UI visual | Canvas 2D particle sphere (`simplex-noise`, additive blending) |

---

## Project Structure

```
H.A.N.U.M.A.N/
├── config/          # Settings and persona prompt
├── core/            # Brain, context, tool router, mode manager
├── awareness/       # Camera, face recognition, noise monitor, clap detector
├── input/           # STT, VAD, text fallback
├── output/          # TTS, adaptive volume controller, speaker
├── tools/           # Web search, calendar, Gmail, files, lights, notes
├── memory/          # Short-term buffer + long-term SQLite store
├── faces/           # Stored face encodings (private, gitignored)
├── api/             # FastAPI server
├── ui/              # Browser interface
├── scripts/         # Install scripts for M4 and RPi
└── tests/           # Test suite
```

---

## Quick Start

### 1. Clone and set up environment
```bash
git clone https://github.com/yourname/H.A.N.U.M.A.N.
cd H.A.N.U.M.A.N.
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure
```bash
cp .env.example .env
# Add your Anthropic API key and camera RTSP URL
```

> **No API key yet?** Set `primary: mock` in `config/settings.yaml` to run the full
> voice pipeline with canned responses — no Claude or Ollama needed.

### 3. Install Ollama (offline fallback — optional)
```bash
# Install from https://ollama.com
ollama pull llama3:8b
```

### 4. Register your face
```bash
python scripts/register_face.py
```

### 5. Run HANUMAN
```bash
python main.py
```

Then open **http://localhost:8000** in your browser to see the HUD.

> **UI development mode** (hot reload):
> ```bash
> cd ui && npm run dev   # http://localhost:5173 — proxies /ws to FastAPI
> ```
> **Rebuild UI after changes:**
> ```bash
> cd ui && npm run build
> ```

---
> **UI development mode** (hot reload):
> ```bash
> cd ui && npm run dev   # http://localhost:5173 — proxies /ws to FastAPI
> ```
> **Rebuild UI after changes:**
> ```bash
> cd ui && npm run build
> ```

---

## Configuration

All tunable parameters live in `config/settings.yaml`. Switching from M4 to RPi is a config change — not a code change.

Key settings:
```yaml
llm:
  primary: claude          # "claude" or "ollama"
  claude_model: claude-sonnet-4-6
  ollama_model: llama3:8b  # phi3:mini for RPi

tts:
  voice: en-GB-RyanNeural

camera:
  rtsp_url: rtsp://user:pass@192.168.1.x:554/stream
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
CAMERA_RTSP_URL=rtsp://...
HOME_ASSISTANT_TOKEN=...
GOOGLE_CALENDAR_CREDENTIALS=path/to/credentials.json
```

---

## Roadmap

See [progress.md](progress.md) for live build status.
See [plan.md](plan.md) for the full architecture and design decisions.

---

## Philosophy

Like Hanuman of the Ramayana, this assistant serves with complete devotion and treats the extraordinary as routine. It greets first. It notices first. It never waits to be summoned.

It is not a chatbot. It is infrastructure.
