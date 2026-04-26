/**
 * ParticleSphere — volumetric 3D particle cloud.
 *
 * Adapted from Particula (github.com/Humprt/particula):
 *  • Uniform sphere-volume distribution  (spherical coords + cube-root radius)
 *  • 3D simplex-noise turbulence on three independent planes
 *  • Soft radius constraint keeps particles contained
 *  • Lifetime fade-in / fade-out / respawn
 *  • Perspective projection: depth = FOCAL - rz  (positive z → toward viewer)
 *  • Canvas 2D 'lighter' (additive) blending → dim particles accumulate into glow
 *
 * Visual key: use MANY tiny dim particles. The additive blend makes the dense
 * centre blaze white/coloured while thin regions stay faint — that's what creates
 * the 3-D sphere illusion.
 */

import { useEffect, useRef } from 'react'
import { createNoise3D } from 'simplex-noise'

// ── Types ──────────────────────────────────────────────────────────────────

type SphereState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface Particle {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  lt: number   // remaining lifetime (s)
}

interface SphereDef {
  count:      number
  radius:     number   // world units
  turbulence: number   // noise velocity amplitude per frame
  noiseScale: number   // spatial noise frequency
  noiseSpeed: number   // temporal noise speed
  damping:    number   // velocity decay (0–1)
  lifetime:   number   // seconds before respawn
  pSize:      number   // base particle radius in px (at centre depth)
  alpha:      number   // base opacity per particle — keep LOW, let additive accumulate
  rotSpeed:   number   // Y-axis rotation rad/frame
  colorIdx:   0 | 1
}

// ── State definitions ──────────────────────────────────────────────────────

const DEFS: Record<SphereState, SphereDef[]> = {
  idle: [
    {
      count: 900, radius: 0.80,
      turbulence: 0.0006, noiseScale: 1.0, noiseSpeed: 0.06,
      damping: 0.994, lifetime: 14,
      pSize: 0.7, alpha: 0.055, rotSpeed: 0.0003, colorIdx: 0,
    },
  ],

  listening: [
    {
      count: 2400, radius: 1.0,
      turbulence: 0.0025, noiseScale: 1.8, noiseSpeed: 0.28,
      damping: 0.978, lifetime: 5.5,
      pSize: 0.9, alpha: 0.13, rotSpeed: 0.0018, colorIdx: 0,
    },
  ],

  thinking: [
    {
      count: 1600, radius: 0.88,
      turbulence: 0.0012, noiseScale: 1.4, noiseSpeed: 0.13,
      damping: 0.987, lifetime: 9.0,
      pSize: 0.8, alpha: 0.10, rotSpeed: 0.0007, colorIdx: 0,
    },
  ],

  speaking: [
    // inner — fast, dense core
    {
      count: 2600, radius: 0.78,
      turbulence: 0.0060, noiseScale: 2.6, noiseSpeed: 0.62,
      damping: 0.968, lifetime: 2.2,
      pSize: 1.0, alpha: 0.15, rotSpeed:  0.0050, colorIdx: 0,
    },
    // outer — counter-rotating halo
    {
      count: 1800, radius: 1.18,
      turbulence: 0.0035, noiseScale: 1.6, noiseSpeed: 0.40,
      damping: 0.978, lifetime: 3.8,
      pSize: 0.8, alpha: 0.11, rotSpeed: -0.0030, colorIdx: 1,
    },
  ],
}

// ── Projection constants ───────────────────────────────────────────────────
//
// FOCAL=2.0 gives dramatic perspective: front particles (rz→+1) appear 2× bigger
// than centre, back particles (rz→-1) appear 0.67×.
//
// SCALE=78: at depth=FOCAL (centre), a unit sphere maps to ±78 px from canvas centre.
// Canvas=360 → half=180. Max projected x: radius * (FOCAL/(FOCAL-radius)) * SCALE
// For outer sphere r=1.18, worst case front: 1.18*(2/0.82)*78 ≈ 224 > 180 → mild clip, fine.

const CANVAS = 360
const FOCAL  = 2.0
const SCALE  = 78

// ── Helpers ────────────────────────────────────────────────────────────────

function spawn(radius: number, lifetime: number): Particle {
  const theta = Math.random() * Math.PI * 2
  const phi   = Math.acos(2 * Math.random() - 1)
  const r     = Math.cbrt(Math.random()) * radius
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
    vx: 0, vy: 0, vz: 0,
    lt: Math.random() * lifetime,
  }
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  state:  SphereState
  colors: [string, string]
}

export function ParticleRing({ state, colors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

    interface SphereInst { def: SphereDef; particles: Particle[]; rotY: number }

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

    let animId: number
    let lastTs: number | null = null

    function draw(ts: number) {
      if (lastTs === null) lastTs = ts
      const dt  = Math.min((ts - lastTs) / 1000, 0.05)
      lastTs = ts

      if (stateRef.current !== activeState) buildSpheres(stateRef.current)

      ctx.clearRect(0, 0, CANVAS, CANVAS)

      if (spheres.length === 0) { animId = requestAnimationFrame(draw); return }

      const t = ts / 1000

      ctx.globalCompositeOperation = 'lighter'

      for (const sphere of spheres) {
        const { def, particles } = sphere
        const color = colorsRef.current[def.colorIdx]

        sphere.rotY += def.rotSpeed
        const cosR = Math.cos(sphere.rotY)
        const sinR = Math.sin(sphere.rotY)

        for (const p of particles) {
          // ── Noise turbulence (3 independent planes) ──────────────────
          const nx  = def.noiseScale * p.x
          const ny  = def.noiseScale * p.y
          const nz  = def.noiseScale * p.z
          const spd = t * def.noiseSpeed
          p.vx += noise(nx,        ny + 11,  nz + 23 + spd) * def.turbulence
          p.vy += noise(nx + 31 + spd, ny,   nz + 47       ) * def.turbulence
          p.vz += noise(nx + 53,  ny + 67 + spd, nz        ) * def.turbulence

          // ── Integrate & damp ─────────────────────────────────────────
          p.x += p.vx;  p.y += p.vy;  p.z += p.vz
          p.vx *= def.damping;  p.vy *= def.damping;  p.vz *= def.damping

          // ── Soft radius constraint ───────────────────────────────────
          const dist = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z)
          if (dist > def.radius) {
            const pull = (dist - def.radius) * 0.15 / dist
            p.x -= p.x * pull;  p.y -= p.y * pull;  p.z -= p.z * pull
            p.vx *= 0.85;  p.vy *= 0.85;  p.vz *= 0.85
          }

          // ── Lifetime / fade / respawn ────────────────────────────────
          p.lt -= dt
          if (p.lt <= 0) {
            const f = spawn(def.radius, def.lifetime)
            p.x = f.x;  p.y = f.y;  p.z = f.z
            p.vx = 0;   p.vy = 0;   p.vz = 0
            p.lt = def.lifetime
            continue
          }
          const fadeIn  = Math.min(1, (def.lifetime - p.lt) / 0.5)
          const fadeOut = Math.min(1, p.lt / 0.6)
          const fade    = Math.min(fadeIn, fadeOut)

          // ── Y-axis rotation ──────────────────────────────────────────
          const rx =  p.x * cosR + p.z * sinR
          const rz = -p.x * sinR + p.z * cosR
          // NOTE: positive rz = toward viewer (standard camera convention)
          // depth = FOCAL - rz  →  closer particle = smaller depth = larger projected

          // ── Perspective projection ───────────────────────────────────
          const depth = FOCAL - rz
          if (depth < 0.3) continue                   // behind camera

          const proj = FOCAL / depth                  // >1 when close, <1 when far
          const sx   = CX + rx   * proj * SCALE
          const sy   = CY + p.y  * proj * SCALE

          if (sx < -30 || sx > CANVAS + 30 || sy < -30 || sy > CANVAS + 30) continue

          // Size + alpha both scale with proximity → clear 3-D depth cue
          const pr = Math.max(0.3, def.pSize * proj)
          const a  = def.alpha * fade * proj          // front bright, back dim

          // Soft diffuse halo
          ctx.beginPath()
          ctx.arc(sx, sy, pr * 2.2, 0, Math.PI * 2)
          ctx.globalAlpha = a * 0.18
          ctx.fillStyle   = color
          ctx.fill()

          // Core dot
          ctx.beginPath()
          ctx.arc(sx, sy, pr, 0, Math.PI * 2)
          ctx.globalAlpha = Math.min(a * 0.72, 0.85)
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
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS}
      height={CANVAS}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
