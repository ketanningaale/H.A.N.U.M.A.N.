import { useEffect, useRef } from 'react'

type RingState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface ParticleRingProps {
  state: RingState
  colors: [string, string]
  /** Canvas size in px — should be larger than the orb to ring outside it */
  size?: number
}

interface StateCfg {
  orbitSpeed:  number   // radians/sec
  waveAmp:     number   // px radial oscillation
  waveSpeed:   number   // wave travel speed
  baseAlpha:   number   // 0 = hidden
  particleBase: number  // base particle radius px
}

const CFG: Record<RingState, StateCfg> = {
  idle:      { orbitSpeed: 0.00, waveAmp: 0,  waveSpeed: 0,   baseAlpha: 0.00, particleBase: 0   },
  listening: { orbitSpeed: 0.28, waveAmp: 12, waveSpeed: 3.5, baseAlpha: 0.55, particleBase: 2.4 },
  thinking:  { orbitSpeed: 0.12, waveAmp: 7,  waveSpeed: 1.8, baseAlpha: 0.32, particleBase: 1.8 },
  speaking:  { orbitSpeed: 0.52, waveAmp: 16, waveSpeed: 5.0, baseAlpha: 0.65, particleBase: 3.0 },
}

const PARTICLE_COUNT = 36

export function ParticleRing({ state, colors, size = 320 }: ParticleRingProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const stateRef   = useRef(state)
  const colorsRef  = useRef(colors)

  // keep refs in sync without restarting the loop
  stateRef.current  = state
  colorsRef.current = colors

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const center     = size / 2
    // ring sits just outside the orb (orb visual radius ≈ size * 0.375)
    const ringRadius = size * 0.435

    let animId: number
    let t0: number | null = null

    function draw(ts: number) {
      if (t0 === null) t0 = ts
      const t = (ts - t0) / 1000

      ctx.clearRect(0, 0, size, size)

      const cfg = CFG[stateRef.current]
      if (cfg.baseAlpha === 0) {
        animId = requestAnimationFrame(draw)
        return
      }

      const [c1, c2] = colorsRef.current

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const frac  = i / PARTICLE_COUNT
        const angle = frac * Math.PI * 2

        // travelling sine wave along the ring
        const phase = frac * Math.PI * 2 * 3 - t * cfg.waveSpeed
        const wave  = Math.sin(phase) * 0.5 + 0.5          // 0..1

        const r  = ringRadius + wave * cfg.waveAmp          // radial pos
        const x  = center + r * Math.cos(angle + t * cfg.orbitSpeed)
        const y  = center + r * Math.sin(angle + t * cfg.orbitSpeed)
        const pr = cfg.particleBase * (0.45 + wave * 0.8)  // particle size
        const a  = cfg.baseAlpha * (0.35 + wave * 0.65)    // alpha

        // alternate color1 / color2 across the ring
        const color = frac < 0.5 ? c1 : c2

        // soft glow: larger, transparent halo behind each dot
        ctx.beginPath()
        ctx.arc(x, y, pr * 2.2, 0, Math.PI * 2)
        ctx.globalAlpha = a * 0.22
        ctx.fillStyle   = color
        ctx.fill()

        // core dot
        ctx.beginPath()
        ctx.arc(x, y, pr, 0, Math.PI * 2)
        ctx.globalAlpha = a
        ctx.fillStyle   = color
        ctx.fill()
      }

      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [size]) // only re-mount if size changes; state/colors read via refs

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="absolute pointer-events-none"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    />
  )
}
