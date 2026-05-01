# HANUMAN — UI

React + Vite + TypeScript browser interface for the H.A.N.U.M.A.N. assistant.

---

## Overview

The UI is a single-page HUD that connects to the HANUMAN FastAPI backend via WebSocket. It visualises the assistant's state in real time using a volumetric 3D particle sphere and shows a live transcript of the conversation.

---

## Visual — Particle Sphere

The central visual is a Canvas 2D volumetric particle sphere built using the **Particula algorithm**:

- **Uniform volume distribution** — particles spawn via `r = Math.cbrt(Math.random()) * radius` (cube-root sampling fills the sphere evenly, not just the surface)
- **3D simplex-noise turbulence** — each particle's velocity is driven by 3D Perlin noise sampled on three independent planes (X/Y, Y/Z, X/Z), creating organic, non-repeating motion
- **Perspective projection** — `depth = FOCAL - rz`: positive Z = toward viewer. Front particles are larger and brighter; back particles smaller and dimmer
- **Additive blending** — `ctx.globalCompositeOperation = 'lighter'`: many dim particles accumulate into a glowing, nebula-like mass
- **Soft radius constraint** — particles that drift too far are pulled back gently rather than hard-reset
- **Lifetime fade** — each particle fades in, lives, fades out, then respawns at a random position inside the sphere

### States

| State | Appearance |
|---|---|
| `idle` | Quiet, slow-breathing blue sphere |
| `listening` | Bright cyan, more energetic turbulence |
| `thinking` | Deep purple, slow deliberate rotation |
| `speaking` | Two counter-rotating spheres, hue-cycling complementary colours |

---

## Architecture

```
ui/
├── src/
│   ├── App.tsx                          # Root — WebSocket, state machine, layout
│   └── components/
│       └── ui/
│           ├── particle-ring.tsx        # Canvas 2D particle sphere
│           └── shimmer-text.tsx         # ElevenLabs ShimmeringText — last utterance
├── dist/                                # Built bundle — served by FastAPI at /
├── index.html
├── vite.config.ts
└── package.json
```

---

## WebSocket Protocol

Connects to `ws://localhost:8000/ws`.

**Messages received from server:**

```json
{ "type": "state", "status": "listening" }
{ "type": "state", "status": "thinking" }
{ "type": "state", "status": "speaking" }
{ "type": "state", "status": "idle" }
{ "type": "message", "role": "user",      "text": "What time is it?" }
{ "type": "message", "role": "assistant", "text": "It is 22:15, sir." }
```

**Messages sent to server:**

```json
{ "type": "text", "text": "Your typed message" }
```

---

## Development

```bash
cd ui
npm install
npm run dev       # http://localhost:5173 — hot reload, proxies /ws to FastAPI
```

> FastAPI backend must be running for WebSocket to connect. Without it, the UI enters **demo mode** — cycling through all four particle states automatically.

## Build

```bash
cd ui
npm run build     # outputs to ui/dist/ — served by FastAPI at http://localhost:8000
```

---

## Demo Mode

When the WebSocket is disconnected, the UI automatically enters demo mode:
- Cycles through idle → listening → thinking → speaking every few seconds
- Useful for UI development without running the full backend
- Reconnects automatically when the backend comes online

---

## Bundle Size

| Version | Size | Notes |
|---|---|---|
| v1 (Three.js / R3F Orb) | 1.24 MB | ElevenLabs Orb component |
| v2 (Canvas 2D sphere) | 350 KB | Custom Particula implementation — no Three.js |
