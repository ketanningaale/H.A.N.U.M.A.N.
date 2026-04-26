import { useEffect, useRef, useState, useCallback } from 'react'
import { Orb, type AgentState } from '@/components/ui/orb'
import { MicrophoneWaveform } from '@/components/ui/waveform'
import { ShimmeringText } from '@/components/ui/shimmering-text'
import './index.css'

// ── Types ─────────────────────────────────────────────────────────────────
type HanumanStatus = 'idle' | 'listening' | 'thinking' | 'speaking'
type HanumanMode   = 'NORMAL' | 'FOCUS' | 'NIGHT' | 'WINDDOWN' | 'MOODY' | 'MORNING' | 'AWAY'
type Presence      = 'home' | 'away'

interface Turn { role: 'user' | 'assistant'; text: string }

interface HUDState {
  status:    HanumanStatus
  mode:      HanumanMode
  presence:  Presence
  volume:    number
  connected: boolean
}

const toAgentState = (s: HanumanStatus): AgentState => {
  if (s === 'listening') return 'listening'
  if (s === 'thinking')  return 'thinking'
  if (s === 'speaking')  return 'talking'
  return null
}

const ORB_COLORS: Record<HanumanStatus, [string, string]> = {
  idle:      ['#0d1b2e', '#071020'],
  listening: ['#00d4ff', '#0077aa'],
  thinking:  ['#7c3aed', '#3b82f6'],
  speaking:  ['#d946ef', '#f97316'],
}

const MODE_STYLE: Record<HanumanMode, string> = {
  NORMAL:   'text-[#00d4ff]/50   border-[#00d4ff]/15',
  FOCUS:    'text-blue-400/60    border-blue-400/20',
  NIGHT:    'text-purple-400/50  border-purple-400/20',
  WINDDOWN: 'text-amber-400/50   border-amber-400/20',
  MOODY:    'text-fuchsia-400/50 border-fuchsia-400/20',
  MORNING:  'text-amber-400/60   border-amber-400/20',
  AWAY:     'text-zinc-600       border-zinc-700',
}

// ── WebSocket ─────────────────────────────────────────────────────────────
function useHanumanWS(
  onTurn:  (t: Turn) => void,
  onState: (s: Partial<HUDState>) => void,
) {
  const wsRef = useRef<WebSocket | null>(null)

  const send = useCallback((text: string) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: 'text', text }))
  }, [])

  useEffect(() => {
    function connect() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${location.host}/ws`)
      wsRef.current = ws
      ws.onopen    = () => onState({ connected: true })
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data as string)
        if (m.type === 'state')   onState(m as Partial<HUDState>)
        if (m.type === 'message') onTurn({ role: m.role as Turn['role'], text: m.text as string })
      }
      ws.onclose = () => { onState({ connected: false }); setTimeout(connect, 3000) }
      ws.onerror = () => ws.close()
    }
    connect()
    return () => wsRef.current?.close()
  }, [onTurn, onState])

  return send
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [hud, setHud] = useState<HUDState>({
    status: 'idle', mode: 'NORMAL', presence: 'away', volume: 0.85, connected: false,
  })
  const [turns,     setTurns]     = useState<Turn[]>([])
  const [inputText, setInputText] = useState('')
  const [orbColors, setOrbColors] = useState<[string, string]>(ORB_COLORS.idle)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const speakHueRef   = useRef(0)

  // Hue-cycle orb when speaking
  useEffect(() => {
    setOrbColors(ORB_COLORS[hud.status])
    if (hud.status !== 'speaking') return
    const id = setInterval(() => {
      speakHueRef.current = (speakHueRef.current + 1.8) % 360
      const h1 = speakHueRef.current
      setOrbColors([`hsl(${h1},90%,55%)`, `hsl(${(h1 + 120) % 360},90%,45%)`])
    }, 30)
    return () => clearInterval(id)
  }, [hud.status])

  const onState = useCallback((p: Partial<HUDState>) => setHud(h => ({ ...h, ...p })), [])
  const onTurn  = useCallback((t: Turn) => {
    setTurns(ts => [...ts, t])
    setTimeout(() => { transcriptRef.current && (transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight) }, 50)
  }, [])

  const sendText = useHanumanWS(onTurn, onState)

  function submit() {
    const t = inputText.trim(); if (!t) return
    setInputText(''); sendText(t)
  }

  // Demo cycle when offline
  useEffect(() => {
    if (hud.connected) return
    const seq: HanumanStatus[] = ['idle', 'listening', 'thinking', 'speaking']
    const dur = [2000, 2500, 2000, 5000]
    let i = 0; let timer: ReturnType<typeof setTimeout>
    function next() {
      setHud(h => ({ ...h, status: seq[i % seq.length] }))
      timer = setTimeout(() => { i++; next() }, dur[i % dur.length])
    }
    const boot = setTimeout(next, 900)
    return () => { clearTimeout(boot); clearTimeout(timer) }
  }, [hud.connected])

  const lastAssistant = [...turns].reverse().find(t => t.role === 'assistant')

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto px-7 pb-6 select-none">

      {/* Top bar */}
      <div className="flex items-center justify-between h-11 border-b border-white/[0.06] shrink-0">
        <span className="text-[11px] tracking-[0.3em] text-[#00d4ff]/35 uppercase font-mono">
          H · A · N · U · M · A · N
        </span>
        <div className="flex items-center gap-5 text-[9px] tracking-[0.14em] uppercase text-zinc-600">
          <div className="flex items-center gap-1.5">
            <span className={`w-[5px] h-[5px] rounded-full transition-all duration-500 ${hud.presence === 'home' ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-amber-500 shadow-[0_0_4px_#f59e0b]'}`} />
            {hud.presence}
          </div>
          <span className={`px-1.5 py-[3px] border rounded-[2px] tracking-[0.16em] transition-all duration-500 ${MODE_STYLE[hud.mode]}`}>
            {hud.mode.toLowerCase()}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`w-[5px] h-[5px] rounded-full transition-all duration-500 ${hud.connected ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-red-500'}`} />
            {hud.connected ? 'online' : 'offline'}
          </div>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 min-h-0">

        {/* Orb + mic waveform overlay */}
        <div className="relative w-60 h-60">
          <Orb agentState={toAgentState(hud.status)} colors={orbColors} className="w-full h-full" />
          {hud.status === 'listening' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-28 opacity-50">
              <MicrophoneWaveform active processing={false} barWidth={2} className="h-5" />
            </div>
          )}
        </div>

        {/* Status label */}
        <span className={`text-[10px] tracking-[0.22em] uppercase transition-colors duration-500 ${
          hud.status === 'listening' ? 'text-[#00d4ff]/60'
          : hud.status === 'thinking'  ? 'text-blue-400/60'
          : hud.status === 'speaking'  ? 'text-fuchsia-400/60'
          : 'text-zinc-700'
        }`}>{hud.status}</span>

        {/* Last utterance — shimmer when speaking, plain otherwise */}
        <div className="text-[13px] text-center max-w-[480px] leading-relaxed min-h-5 px-4">
          {lastAssistant && hud.status === 'speaking'
            ? <ShimmeringText text={lastAssistant.text} className="text-zinc-300/80" />
            : <span className="text-zinc-500/70">{lastAssistant?.text}</span>
          }
        </div>
      </div>

      {/* Transcript + input */}
      <div className="flex flex-col border-t border-white/[0.06] pt-4 h-[200px] gap-0">
        <div ref={transcriptRef} className="flex-1 overflow-y-auto flex flex-col gap-1.5 min-h-0 pb-2">
          {turns.map((t, i) => (
            <div key={i} className="flex gap-3 text-[11px] leading-[1.55]">
              <span className={`w-14 shrink-0 text-right text-[9px] tracking-[0.1em] uppercase pt-0.5 ${t.role === 'assistant' ? 'text-[#00d4ff]/45' : 'text-blue-400/45'}`}>
                {t.role === 'assistant' ? 'hanuman' : 'you'}
              </span>
              <span className="text-zinc-500/80">{t.text}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3 shrink-0">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="type a command, sir..."
            className="flex-1 bg-transparent text-zinc-300 font-mono text-[11px] tracking-[0.05em] pb-1 outline-none border-0 border-b border-white/[0.06] placeholder:text-zinc-700 focus:border-[#00d4ff]/25 transition-colors"
          />
          <button
            onClick={submit}
            className="text-[9px] tracking-[0.14em] uppercase border border-white/[0.08] text-zinc-700 px-3 py-1.5 hover:border-[#00d4ff]/25 hover:text-[#00d4ff]/55 transition-all cursor-pointer"
          >
            send
          </button>
        </div>
      </div>

    </div>
  )
}
