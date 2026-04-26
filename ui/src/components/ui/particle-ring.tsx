/**
 * ParticleSphere — volumetric 3D particle cloud surrounding the orb.
 *
 * Algorithm adapted from Particula (github.com/Humprt/particula):
 *  • Uniform sphere-volume distribution  (spherical coords + cube-root radius)
 *  • 3D simplex-noise turbulence driving per-particle velocity
 *  • Soft radius constraint pulls escapees back in
 *  • Particle lifetime → fade-out → respawn
 *  • Canvas 2D additive blending ('lighter') for the glow
 *  • Perspective projection with Y-axis rotation for 3D feel
 *
 * States:
 *  idle     → nothing shown
 *  listening→ 1 sphere, cyan, moderate turbulence
 *  thinking → 1 sphere, smaller + slower, contemplative swirl
 *  speaking → 2 spheres counter-rotating, fast + energetic
 */

import { useEffect, useRef } from 'react'
import { createNoise3D } from 'simplex-noise'

// ── Types ──────────────────────────────────────────────────────────────────

type SphereState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface Particle {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  lt: number   // remaining lifetime (seconds)
}

interface SphereDef {
  count:      number
  radius:     number   // world units; orb surface ≈ 1.0
  turbulence: number   // noise velocity amplitude
  noiseScale: number   // noise spatial frequency
  noiseSpeed: number   // noise time speed
  damping:    number   // velocity decay per frame (0–1)
  lifetime:   number   // seconds before respawn
  pSize:      number   // base particle radius px
  alpha:      number   // base opacity
  rotSpeed:   number   // Y-axis rotation rad/frame (negative = opposite)
  colorIdx:   0 | 1   // which of the two orb colors to use
}

// ── Sphere definitions per state ───────────────────────────────────────────

const DEFS: Record<SphereState, SphereDef[]> = {
  idle: [],

  listening: [
    {
      count: 750, radius: 1.08,
      turbulence: 0.0042, noiseScale: 2.4, noiseSpeed: 0.38,
      damping: 0.97, lifetime: 4.2,
      pSize: 1.7, alpha: 0.52, rotSpeed: 0.0022, colorIdx: 0,
    },
  ],

  thinking: [
    {
      count: 520, radius: 0.88,
      turbulence: 0.0020, noiseScale: 1.7, noiseSpeed: 0.16,
      damping: 0.985, lifetime: 7.0,
      pSize: 1.4, alpha: 0.36, rotSpeed: 0.0009, colorIdx: 0,
    },
  ],

  speaking: [
    // inner sphere — faster, larger particles
    {
      count: 800, radius: 0.82,
      turbulence: 0.0072, noiseScale: 3.1, noiseSpeed: 0.72,
      damping: 0.962, lifetime: 2.2,
      pSize: 2.1, alpha: 0.58, rotSpeed: 0.0060, colorIdx: 0,
    },
    // outer sphere — counter-rotating, finer particles
    {
      count: 560, radius: 1.22,
      turbulence: 0.0050, noiseScale: 2.0, noiseSpeed: 0.48,
      damping: 0.972, lifetime: 3.6,
      pSize: 1.5, alpha: 0.40, rotSpeed: -0.0038, colorIdx: 1,
    },
  ],
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Spawn a particle uniformly inside a sphere of given radius. */
function spawn(radius: number, lifetime: number): Particle {
  const theta = Math.random() * Math.PI * 2
  const phi   = Math.acos(2 * Math.random() - 1)
  const r     = Math.cbrt(Math.random()) * radius   // cube-root → uniform volume
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
    vx: 0, vy: 0, vz: 0,
    lt: Math.random() * lifetime,   // stagger initial lifetimes
  }
}

// ── Projection constants ───────────────────────────────────────────────────

const CANVAS = 360          // canvas px (centered over 240 px orb → 60 px bleed each side)
const FOCAL  = 3.0          // perspective focal length (world units)
const SCALE  = 132          // px per world unit at z = 0

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  state:  SphereState
  colors: [string, string]
}

export function ParticleRing({ state, colors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // live refs so the animation loop always sees the latest values
  const stateRef  = useRef(state)
  const colorsRef = useRef(colors)
  stateRef.current  = state
  colorsRef.current = colors

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const noise  = createNoise3D()
    const CX = CANVAS / 2
    const CY = CANVAS / 2

    // ── Runtime sphere instances ───────────────────────────────────────
    interface SphereInst {
      def:       SphereDef
      particles: Particle[]
      rotY:      number
    }

    let spheres: SphereInst[] = []
    let activeState: SphereState | '' = ''

    function buildSpheres(s: SphereState) {
      activeState = s
      spheres = DEFS[s].map(def => ({
        def,
        particles: Array.from({ length: def.count }, () => spawn(def.radius, def.lifetime)),
        rotY: 0,
      }))
    }

    // ── Animation loop ─────────────────────────────────────────────────
    let animId: number
    let lastTs: number | null = null

    function draw(ts: number) {
      if (lastTs === null) lastTs = ts
      const dt = Math.min((ts - lastTs) / 1000, 0.05)   // seconds, capped at 50 ms
      lastTs = ts

      // Rebuild if state changed
      if (stateRef.current !== activeState) buildSpheres(stateRef.current)

      ctx.clearRect(0, 0, CANVAS, CANVAS)

      if (spheres.length === 0) {
        animId = requestAnimationFrame(draw)
        return
      }

      const t = ts / 1000   // seconds since page load (for noise offset)

      // Additive blending → overlapping particles brighten = natural glow
      ctx.globalCompositeOperation = 'lighter'

      for (const sphere of spheres) {
        const { def, particles } = sphere
        const color = colorsRef.current[def.colorIdx]

        sphere.rotY += def.rotSpeed

        const cosR = Math.cos(sphere.rotY)
        const sinR = Math.sin(sphere.rotY)

        for (const p of particles) {
          // ── Noise turbulence (3 independent noise planes) ────────────
          const nx = def.noiseScale * p.x
          const ny = def.noiseScale * p.y
          const nz = def.noiseScale * p.z
          const spd = t * def.noiseSpeed
          p.vx += noise(nx,       ny + 10, nz + 20 + spd) * def.turbulence
          p.vy += noise(nx + 30,  ny      + spd, nz + 40) * def.turbulence
          p.vz += noise(nx + 50 + spd, ny + 60, nz      ) * def.turbulence

          // ── Integrate & damp ─────────────────────────────────────────
          p.x += p.vx;  p.y += p.vy;  p.z += p.vz
          p.vx *= def.damping;  p.vy *= def.damping;  p.vz *= def.damping

          // ── Soft radius constraint ───────────────────────────────────
          const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
          if (dist > def.radius) {
            const pull = (dist - def.radius) * 0.11 / dist
            p.x -= p.x * pull;  p.y -= p.y * pull;  p.z -= p.z * pull
            p.vx *= 0.88;  p.vy *= 0.88;  p.vz *= 0.88
          }

          // ── Lifetime → fade → respawn ────────────────────────────────
          p.lt -= dt
          const fadeIn  = Math.min(1, (def.lifetime - p.lt) / 0.6)   // 0.6 s fade-in
          const fadeOut = Math.min(1, p.lt / 0.8)                    // 0.8 s fade-out
          const fade    = Math.min(fadeIn, fadeOut)

          if (p.lt <= 0) {
            const fresh = spawn(def.radius, def.lifetime)
            p.x = fresh.x;  p.y = fresh.y;  p.z = fresh.z
            p.vx = 0;       p.vy = 0;       p.vz = 0
            p.lt = def.lifetime
            continue
          }

          // ── Y-axis rotation ──────────────────────────────────────────
          const rx =  p.x * cosR + p.z * sinR
          const rz = -p.x * sinR + p.z * cosR

          // ── Perspective projection ───────────────────────────────────
          const depth = FOCAL + rz
          if (depth < 0.2) continue

          const proj = FOCAL / depth
          const sx = CX + rx  * proj * SCALE
          const sy = CY + p.y * proj * SCALE

          // Clamp to canvas + small bleed
          if (sx < -20 || sx > CANVAS + 20 || sy < -20 || sy > CANVAS + 20) continue

          const pr = Math.max(0.4, def.pSize * proj)
          // Front particles slightly brighter; back slightly dimmer
          const depthAlpha = 0.55 + proj * 0.30    // proj ≈ 0.75–1.5 → 0.78–1.0
          const a = def.alpha * fade * Math.min(depthAlpha, 1.0)

          // ── Draw: glow halo + solid core ─────────────────────────────
          ctx.beginPath()
          ctx.arc(sx, sy, pr * 2.8, 0, Math.PI * 2)
          ctx.globalAlpha = a * 0.14
          ctx.fillStyle   = color
          ctx.fill()

          ctx.beginPath()
          ctx.arc(sx, sy, pr, 0, Math.PI * 2)
          ctx.globalAlpha = a * 0.62
          ctx.fillStyle   = color
          ctx.fill()
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [])   // stable loop — state/colors read via refs

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS}
      height={CANVAS}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
