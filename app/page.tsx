'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FACULTIES, DEFAULT_SETTINGS } from '@/types'
import { loadSettings, saveSettings, loadHistory, saveHistory, clearHistory, generateId, routeToFaculty, formatTime } from '@/lib/utils'
import { PARTICLE_BURST_DURATION, PARTICLE_COUNT, SVAYAM_SELECTION_DELAY } from '@/lib/constants'
import type { EntityState, FacultyId, Message, MedhaSettings, Attachment, VoiceState } from '@/types'

// ── Speech recognition (not in lib.dom.d.ts) ───────────────────────────────────
interface SpeechRecognitionResultLike {
  isFinal: boolean
  [index: number]: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultLike[] & { length: number }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionWindow = typeof window & {
  SpeechRecognition?: new () => SpeechRecognitionInstance
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance
}

// ── State visual config ────────────────────────────────────────────────────────
const STATE_CONFIG: Record<EntityState, { scale: number; brightness: number; rotateRange: number; driftY: number; driftDuration: number; auraOpacity: number; pulseSpeed: number }> = {
  dormant:           { scale: 1.000, brightness: 1.00, rotateRange: 0,   driftY: 10, driftDuration: 7,   auraOpacity: 0.04, pulseSpeed: 6 },
  listening:         { scale: 1.020, brightness: 1.02, rotateRange: 0,   driftY: 8,  driftDuration: 5,   auraOpacity: 0.07, pulseSpeed: 4 },
  thinking:          { scale: 1.015, brightness: 1.02, rotateRange: 1,   driftY: 12, driftDuration: 3.5, auraOpacity: 0.08, pulseSpeed: 3 },
  reasoning:         { scale: 1.018, brightness: 1.03, rotateRange: 0.8, driftY: 10, driftDuration: 3,   auraOpacity: 0.09, pulseSpeed: 3 },
  researching:       { scale: 1.025, brightness: 1.03, rotateRange: 0.5, driftY: 14, driftDuration: 2.5, auraOpacity: 0.10, pulseSpeed: 2.5 },
  'deep-research':   { scale: 1.030, brightness: 1.06, rotateRange: 1.2, driftY: 16, driftDuration: 2,   auraOpacity: 0.12, pulseSpeed: 2 },
  responding:        { scale: 1.022, brightness: 1.04, rotateRange: 0,   driftY: 10, driftDuration: 2.8, auraOpacity: 0.10, pulseSpeed: 1.8 },
  'voice-listening': { scale: 0.995, brightness: 1.01, rotateRange: 0,   driftY: 6,  driftDuration: 6,   auraOpacity: 0.06, pulseSpeed: 5 },
  'voice-active':    { scale: 1.025, brightness: 1.04, rotateRange: 0,   driftY: 8,  driftDuration: 1.5, auraOpacity: 0.12, pulseSpeed: 1.2 },
  celebration:       { scale: 1.060, brightness: 1.08, rotateRange: 2,   driftY: 18, driftDuration: 1.2, auraOpacity: 0.18, pulseSpeed: 0.8 },
  sleep:             { scale: 0.980, brightness: 0.85, rotateRange: 0,   driftY: 4,  driftDuration: 10,  auraOpacity: 0.02, pulseSpeed: 10 },
  wake:              { scale: 1.000, brightness: 1.00, rotateRange: 0,   driftY: 8,  driftDuration: 6,   auraOpacity: 0.05, pulseSpeed: 6 },
  switching:         { scale: 1.040, brightness: 1.06, rotateRange: 1.5, driftY: 14, driftDuration: 1,   auraOpacity: 0.15, pulseSpeed: 1 },
}

const STATE_LABELS: Partial<Record<EntityState, string>> = {
  dormant: 'DORMANT', listening: 'LISTENING', thinking: 'THINKING',
  reasoning: 'REASONING', researching: 'RESEARCHING', responding: 'RESPONDING',
  'deep-research': 'DEEP RESEARCH', 'voice-listening': 'VOICE LISTENING',
  'voice-active': 'VOICE ACTIVE', celebration: 'CELEBRATION', switching: 'SWITCHING',
}

// ── Particle Burst ─────────────────────────────────────────────────────────────
type Particle = { id: number; x: number; y: number; vx: number; vy: number; life: number; size: number; color: string }

function ParticleBurst({ color, active }: { color: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cx = canvas.width / 2
    const cy = canvas.height / 2

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.4
      const speed = 1.5 + Math.random() * 3
      return {
        id: i,
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1,
        size: Math.random() * 2.5 + 0.5,
        color,
      }
    })

    let start = performance.now()
    const duration = PARTICLE_BURST_DURATION

    const draw = (now: number) => {
      const elapsed = now - start
      if (elapsed > duration) { ctx.clearRect(0, 0, canvas.width, canvas.height); return }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const progress = elapsed / duration

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.02
        p.life = 1 - progress

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${Math.floor(p.life * 200).toString(16).padStart(2, '0')}`
        ctx.fill()

        // Filament trail
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3)
        ctx.strokeStyle = `${p.color}${Math.floor(p.life * 80).toString(16).padStart(2, '0')}`
        ctx.lineWidth = p.size * 0.4
        ctx.stroke()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [active, color])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 60, pointerEvents: 'none' }}
    />
  )
}

// ── Void Canvas ────────────────────────────────────────────────────────────────
function VoidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let t = 0

    type Star = { x: number; y: number; r: number; o: number; s: number; p: number; layer: number }
    type Wisp = { x: number; y: number; w: number; h: number; o: number; c: string; dx: number; dy: number }

    let stars: Star[] = []
    let wisps: Wisp[] = []

    const init = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const a = canvas.width * canvas.height
      stars = []
      for (let i = 0; i < a / 7000; i++)
        stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 0.4 + 0.1, o: Math.random() * 0.08 + 0.02, s: Math.random() * 0.0003 + 0.0001, p: Math.random() * 6.28, layer: 0 })
      for (let i = 0; i < a / 16000; i++)
        stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 0.7 + 0.3, o: Math.random() * 0.12 + 0.04, s: Math.random() * 0.0005 + 0.0002, p: Math.random() * 6.28, layer: 1 })
      for (let i = 0; i < a / 35000; i++)
        stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.0 + 0.6, o: Math.random() * 0.16 + 0.07, s: Math.random() * 0.0007 + 0.0003, p: Math.random() * 6.28, layer: 2 })
      const cols = ['rgba(26,26,255,', 'rgba(123,47,255,', 'rgba(192,38,211,', 'rgba(20,10,50,']
      wisps = []
      for (let i = 0; i < 5; i++)
        wisps.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, w: canvas.width * (0.18 + Math.random() * 0.22), h: canvas.height * (0.10 + Math.random() * 0.10), o: Math.random() * 0.020 + 0.005, c: cols[Math.floor(Math.random() * cols.length)], dx: (Math.random() - 0.5) * 0.012, dy: (Math.random() - 0.5) * 0.007 })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t++
      for (const w of wisps) {
        w.x += w.dx; w.y += w.dy
        if (w.x < -w.w) w.x = canvas.width; if (w.x > canvas.width + w.w) w.x = -w.w
        if (w.y < -w.h) w.y = canvas.height; if (w.y > canvas.height + w.h) w.y = -w.h
        const b = 0.7 + 0.3 * Math.sin(t * 0.003 + w.x * 0.001)
        const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.w * 0.5)
        g.addColorStop(0, `${w.c}${w.o * b})`); g.addColorStop(0.5, `${w.c}${w.o * b * 0.3})`); g.addColorStop(1, `${w.c}0)`)
        ctx.save(); ctx.translate(w.x, w.y); ctx.scale(1, w.h / w.w); ctx.translate(-w.x, -w.y)
        ctx.beginPath(); ctx.arc(w.x, w.y, w.w * 0.5, 0, 6.28); ctx.fillStyle = g; ctx.fill(); ctx.restore()
      }
      for (const s of stars) {
        const op = s.o * (0.6 + 0.4 * Math.sin(t * s.s * 60 + s.p))
        if (s.layer === 2) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3)
          g.addColorStop(0, `rgba(255,255,255,${op * 0.5})`); g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, 6.28); ctx.fillStyle = g; ctx.fill()
        }
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fillStyle = `rgba(255,255,255,${op})`; ctx.fill()
      }
      animId = requestAnimationFrame(draw)
    }

    init(); draw()
    window.addEventListener('resize', init)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', init) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#000', zIndex: 0, pointerEvents: 'none' }} />
}

// ── MEDHĀ Entity ───────────────────────────────────────────────────────────────
function MedhaEntity({ state, facultyColor }: { state: EntityState; facultyColor: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cfg = STATE_CONFIG[state]

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const play = () => v.play().catch(() => {})
    v.addEventListener('canplay', play)
    if (v.readyState >= 3) play()
    return () => v.removeEventListener('canplay', play)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      {/* Base aura */}
      <motion.div
        animate={{ opacity: [cfg.auraOpacity * 0.5, cfg.auraOpacity, cfg.auraOpacity * 0.5] }}
        transition={{ duration: cfg.pulseSpeed, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', width: '40vmin', height: '12vmin', borderRadius: '50%', background: `radial-gradient(ellipse at center, ${facultyColor} 0%, transparent 70%)`, filter: 'blur(28px)', top: '58%', zIndex: 9 }}
      />

      {/* Entity */}
      <motion.div
        animate={{
          scale: cfg.scale,
          rotate: cfg.rotateRange > 0 ? [0, cfg.rotateRange, 0, -cfg.rotateRange, 0] : 0,
          y: [-cfg.driftY / 2, cfg.driftY / 2, -cfg.driftY / 2],
          filter: `brightness(${cfg.brightness})`,
        }}
        transition={{
          scale: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
          rotate: { duration: cfg.driftDuration * 2, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: cfg.driftDuration, repeat: Infinity, ease: 'easeInOut' },
          filter: { duration: 1.0 },
        }}
        style={{ width: '60vmin', height: '60vmin', position: 'relative', zIndex: 10 }}
      >
        <video
          ref={videoRef}
          src="/assets/medha-dormant.mp4"
          autoPlay loop muted playsInline preload="auto"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </motion.div>

      {/* Pulse rings */}
      <AnimatePresence>
        {(state === 'responding' || state === 'voice-active') && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: [1, 1.08, 1], opacity: [0.06, 0.12, 0.06] }} exit={{ opacity: 0 }}
            transition={{ duration: cfg.pulseSpeed, repeat: Infinity }}
            style={{ position: 'absolute', width: '64vmin', height: '64vmin', borderRadius: '50%', border: `1px solid ${facultyColor}`, zIndex: 8 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(state === 'deep-research' || state === 'celebration' || state === 'switching') && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: [1, 1.14, 1], opacity: [0.04, 0.09, 0.04] }} exit={{ opacity: 0 }}
            transition={{ duration: cfg.pulseSpeed * 1.4, repeat: Infinity }}
            style={{ position: 'absolute', width: '78vmin', height: '78vmin', borderRadius: '50%', border: `1px solid ${facultyColor}`, zIndex: 7 }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Settings Panel ─────────────────────────────────────────────────────────────
function SettingsPanel({ settings, onUpdate, onClose }: { settings: MedhaSettings; onUpdate: (s: MedhaSettings) => void; onClose: () => void }) {
  const [local, setLocal] = useState(settings)

  const update = (patch: Partial<MedhaSettings>) => {
    const next = { ...local, ...patch }
    setLocal(next)
    onUpdate(next)
  }

  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontFamily: 'system-ui', padding: '8px 12px', width: '100%', outline: 'none' }
  const labelStyle = { fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, fontFamily: 'system-ui', marginBottom: '6px', display: 'block' }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px, 100vw)', zIndex: 200, background: 'rgba(0,0,0,0.95)', borderLeft: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', overflowY: 'auto', padding: '24px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>Settings</div>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui', marginTop: '3px' }}>MEDHĀ CONFIGURATION</div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', padding: '6px 10px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Faculty */}
        <section>
          <div style={{ fontSize: '11px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Faculty</div>
          <label style={labelStyle}>Default Faculty</label>
          <select value={local.defaultFaculty} onChange={e => update({ defaultFaculty: e.target.value as FacultyId })} style={selectStyle}>
            {Object.values(FACULTIES).map(f => (
              <option key={f.id} value={f.id} style={{ background: '#000' }}>{f.name} — {f.meaning}</option>
            ))}
          </select>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui', marginTop: '6px' }}>
            {FACULTIES[local.defaultFaculty].description}
          </div>
        </section>

        {/* Behaviour */}
        <section>
          <div style={{ fontSize: '11px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Behaviour</div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Response Tone</label>
            <select value={local.responseTone} onChange={e => update({ responseTone: e.target.value as MedhaSettings['responseTone'] })} style={selectStyle}>
              <option value="cosmic" style={{ background: '#000' }}>Cosmic — poetic precision</option>
              <option value="precise" style={{ background: '#000' }}>Precise — facts over poetry</option>
              <option value="balanced" style={{ background: '#000' }}>Balanced — clarity with depth</option>
              <option value="concise" style={{ background: '#000' }}>Concise — brevity above all</option>
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Response Type</label>
            <select value={local.responseType} onChange={e => update({ responseType: e.target.value as MedhaSettings['responseType'] })} style={selectStyle}>
              <option value="conversational" style={{ background: '#000' }}>Conversational</option>
              <option value="analytical" style={{ background: '#000' }}>Analytical</option>
              <option value="creative" style={{ background: '#000' }}>Creative</option>
              <option value="instructional" style={{ background: '#000' }}>Instructional</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>System Instructions</label>
            <textarea
              value={local.systemInstructions}
              onChange={e => update({ systemInstructions: e.target.value })}
              placeholder="Additional instructions for MEDHĀ…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
            />
          </div>
        </section>

        {/* Voice */}
        <section>
          <div style={{ fontSize: '11px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Voice</div>
          {[
            { key: 'voiceEnabled', label: 'Voice Input (STT)' },
            { key: 'ttsEnabled', label: 'Voice Output (TTS)' },
          ].map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui' }}>{label}</span>
              <button
                onClick={() => update({ [key]: !local[key as keyof MedhaSettings] } as Partial<MedhaSettings>)}
                style={{ width: '40px', height: '22px', borderRadius: '11px', background: local[key as keyof MedhaSettings] ? 'rgba(123,47,255,0.6)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}
              >
                <div style={{ position: 'absolute', top: '3px', left: local[key as keyof MedhaSettings] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
          ))}
          <div>
            <label style={labelStyle}>TTS Speed — {local.ttsSpeed.toFixed(1)}x</label>
            <input type="range" min="0.5" max="2" step="0.1" value={local.ttsSpeed} onChange={e => update({ ttsSpeed: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#7b2fff' }} />
          </div>
        </section>

        {/* History */}
        <section>
          <div style={{ fontSize: '11px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>History</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui' }}>Save Chat History</span>
            <button
              onClick={() => update({ saveHistory: !local.saveHistory })}
              style={{ width: '40px', height: '22px', borderRadius: '11px', background: local.saveHistory ? 'rgba(123,47,255,0.6)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}
            >
              <div style={{ position: 'absolute', top: '3px', left: local.saveHistory ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
          <button
            onClick={() => { clearHistory(); }}
            style={{ width: '100%', padding: '10px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', color: 'rgba(220,100,100,0.7)', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'system-ui', cursor: 'pointer' }}
          >
            Clear All History
          </button>
        </section>

        {/* Display */}
        <section>
          <div style={{ fontSize: '11px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Display</div>
          {[
            { key: 'showFacultyIndicator', label: 'Show Faculty Indicator' },
            { key: 'showTimestamps', label: 'Show Timestamps' },
            { key: 'particleBurstOnSwitch', label: 'Particle Burst on Switch' },
          ].map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui' }}>{label}</span>
              <button
                onClick={() => update({ [key]: !local[key as keyof MedhaSettings] } as Partial<MedhaSettings>)}
                style={{ width: '40px', height: '22px', borderRadius: '11px', background: local[key as keyof MedhaSettings] ? 'rgba(123,47,255,0.6)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}
              >
                <div style={{ position: 'absolute', top: '3px', left: local[key as keyof MedhaSettings] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
          ))}
        </section>
      </div>
    </motion.div>
  )
}

// ── Faculty Selector ───────────────────────────────────────────────────────────
function FacultySelector({ current, onSelect }: { current: FacultyId; onSelect: (id: FacultyId) => void }) {
  const [open, setOpen] = useState(false)
  const faculty = FACULTIES[current]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '6px 12px', cursor: 'pointer' }}
      >
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: faculty.color, boxShadow: `0 0 6px ${faculty.color}` }} />
        <span style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui', textTransform: 'uppercase' }}>{faculty.name}</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui' }}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px', background: 'rgba(0,0,0,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '8px', minWidth: '240px', zIndex: 100, backdropFilter: 'blur(20px)' }}
          >
            {Object.values(FACULTIES).map(f => (
              <button
                key={f.id}
                onClick={() => { onSelect(f.id); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: current === f.id ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.color, boxShadow: `0 0 8px ${f.color}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontFamily: 'system-ui', letterSpacing: '0.05em' }}>{f.name}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui', marginTop: '1px' }}>{f.meaning}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MedhaPage() {
  // Settings
  const [settings, setSettings] = useState<MedhaSettings>(() => ({ ...DEFAULT_SETTINGS, ...loadSettings() }))
  const [showSettings, setShowSettings] = useState(false)

  // Faculty
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyId>(() => loadSettings().defaultFaculty ?? 'svayam')
  const [activeFaculty, setActiveFaculty] = useState<FacultyId>('svayam')
  const [burstActive, setBurstActive] = useState(false)
  const [burstColor, setBurstColor] = useState('#e8e4ff')

  // Entity
  const [entityState, setEntityState] = useState<EntityState>('dormant')

  // Messages
  const [messages, setMessages] = useState<Message[]>(() => loadSettings().saveHistory !== false ? loadHistory() : [])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Input
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastUserMsg = useRef('')

  // Voice
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // TTS
  useEffect(() => {
    if (typeof window !== 'undefined') synthRef.current = window.speechSynthesis
  }, [])

  // Persist settings
  useEffect(() => { saveSettings(settings) }, [settings])

  // Persist history
  useEffect(() => {
    if (settings.saveHistory) saveHistory(messages)
  }, [messages, settings.saveHistory])

  // Scroll to bottom
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [input])

  // Faculty switch with particle burst
  const switchFaculty = useCallback((id: FacultyId) => {
    if (id === selectedFaculty) return
    setSelectedFaculty(id)
    if (settings.particleBurstOnSwitch) {
      const color = id === 'svayam' ? '#e8e4ff' : FACULTIES[id].color
      setBurstColor(color)
      setBurstActive(true)
      setTimeout(() => setBurstActive(false), PARTICLE_BURST_DURATION)
    }
    setEntityState('switching')
    setTimeout(() => setEntityState('dormant'), 1200)
  }, [selectedFaculty, settings.particleBurstOnSwitch])

  // Faculty color for current active
  const facultyColor = activeFaculty === 'svayam' ? '#e8e4ff' : FACULTIES[activeFaculty].color

  // File attachment
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      const type = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'document' : 'audio'
      setAttachment({ id: generateId(), name: file.name, type, mimeType: file.type, size: file.size, dataUrl, base64 })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  // Voice input
  const startVoice = useCallback(async () => {
    if (!settings.voiceEnabled) return
    const w = window as SpeechRecognitionWindow
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new SR()
      rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US'
      rec.onstart = () => { setVoiceState('recording'); setEntityState('voice-listening') }
      rec.onresult = (ev: SpeechRecognitionEventLike) => {
        let final = '', interim = ''
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) final += ev.results[i][0].transcript
          else interim += ev.results[i][0].transcript
        }
        setInput(final || interim)
      }
      rec.onend = () => { setVoiceState('idle'); setEntityState('dormant') }
      rec.onerror = () => { setVoiceState('error'); setTimeout(() => setVoiceState('idle'), 2000); setEntityState('dormant') }
      recognitionRef.current = rec
      rec.start()
    } catch { setVoiceState('error'); setTimeout(() => setVoiceState('idle'), 2000) }
  }, [settings.voiceEnabled])

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop()
    setVoiceState('idle')
    setEntityState('dormant')
  }, [])

  // TTS
  const speak = useCallback((text: string) => {
    if (!settings.ttsEnabled || !synthRef.current) return
    synthRef.current.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = settings.ttsSpeed
    utt.onstart = () => setEntityState('voice-active')
    utt.onend = () => setEntityState('dormant')
    synthRef.current.speak(utt)
  }, [settings.ttsEnabled, settings.ttsSpeed])

  // Send message
  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput(''); setError(null)
    lastUserMsg.current = text

    // Svayam routing with delay
    let resolvedFaculty = selectedFaculty
    if (selectedFaculty === 'svayam') {
      setEntityState('switching')
      await new Promise(r => setTimeout(r, SVAYAM_SELECTION_DELAY))
      resolvedFaculty = routeToFaculty(text)
      setActiveFaculty(resolvedFaculty)
      if (settings.particleBurstOnSwitch) {
        setBurstColor(FACULTIES[resolvedFaculty].color)
        setBurstActive(true)
        setTimeout(() => setBurstActive(false), PARTICLE_BURST_DURATION)
      }
    } else {
      setActiveFaculty(selectedFaculty)
    }

    const userId = generateId()
    const asstId = generateId()
    const userMsg: Message = { id: userId, role: 'user', content: text, timestamp: Date.now(), attachment: attachment ?? undefined }
    const asstMsg: Message = { id: asstId, role: 'assistant', content: '', timestamp: Date.now(), facultyId: resolvedFaculty, isStreaming: true }

    setMessages(prev => [...prev, userMsg, asstMsg])
    setAttachment(null)
    setStreaming(true)
    setEntityState('listening')

    await new Promise(r => setTimeout(r, 400))
    setEntityState('thinking')

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, faculty: resolvedFaculty, settings: { responseTone: settings.responseTone, responseType: settings.responseType, systemInstructions: settings.systemInstructions }, attachment }),
      })

      if (!res.ok) throw new Error((await res.json()).error ?? 'Connection failed')
      setEntityState('responding')

      const reader = res.body?.getReader()
      const dec = new TextDecoder()
      let acc = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          for (const line of dec.decode(value, { stream: true }).split('\n')) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
            try {
              const d = JSON.parse(line.slice(6))
              if (d.meta?.facultyId) {
                setActiveFaculty(d.meta.facultyId)
                setMessages(prev => prev.map(m => m.id === asstId ? { ...m, facultyId: d.meta.facultyId } : m))
              }
              if (d.content) {
                acc += d.content
                setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: acc } : m))
              }
            } catch { /* skip */ }
          }
        }
      }

      setMessages(prev => prev.map(m => m.id === asstId ? { ...m, isStreaming: false } : m))
      setEntityState('dormant')
      if (settings.ttsEnabled && acc) speak(acc)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'The void is unreachable'
      setError(msg)
      setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: msg, isStreaming: false, error: true } : m))
      setEntityState('dormant')
    } finally {
      setStreaming(false)
    }
  }, [input, messages, streaming, selectedFaculty, attachment, settings, speak])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const doRetry = () => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      return last?.role === 'assistant' && last.error ? prev.slice(0, -2) : prev
    })
    if (lastUserMsg.current) { setInput(lastUserMsg.current); setTimeout(send, 50) }
  }

  const doClear = () => { setMessages([]); setError(null); setEntityState('dormant'); clearHistory() }

  const isRecording = voiceState === 'recording'
  const canSend = input.trim().length > 0 && !streaming

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>

      {/* Layer 0 — Void */}
      <VoidCanvas />

      {/* Layer 1 — Entity */}
      <MedhaEntity state={entityState} facultyColor={facultyColor} />

      {/* Layer 2 — Particle burst */}
      <ParticleBurst color={burstColor} active={burstActive} />

      {/* Layer 3 — Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>MEDHĀ</div>
          <div style={{ fontSize: '9px', letterSpacing: '0.28em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontFamily: 'system-ui', marginTop: '3px' }}>
            {STATE_LABELS[entityState] ?? 'DORMANT'}
            {settings.showFacultyIndicator && activeFaculty !== 'svayam' && (
              <span style={{ color: facultyColor, marginLeft: '8px' }}>· {FACULTIES[activeFaculty].name}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {messages.length > 0 && (
            <button onClick={doClear} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: 'rgba(255,255,255,0.25)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '6px 10px', cursor: 'pointer', fontFamily: 'system-ui' }}>Clear</button>
          )}
          <button onClick={() => setShowSettings(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: 'rgba(255,255,255,0.35)', fontSize: '14px', padding: '5px 10px', cursor: 'pointer' }}>⚙</button>
        </div>
      </div>

      {/* Layer 4 — Messages + Input */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, display: 'flex', flexDirection: 'column', maxHeight: '60vh' }}>

        {/* Messages */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: '8px' }}>
              <div style={{ maxWidth: '620px', margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      {m.role === 'assistant' && m.facultyId && m.facultyId !== 'svayam' && (
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: FACULTIES[m.facultyId].color, boxShadow: `0 0 4px ${FACULTIES[m.facultyId].color}` }} />
                      )}
                      <span style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', fontFamily: 'system-ui' }}>
                        {m.role === 'user' ? 'YOU' : m.facultyId && m.facultyId !== 'svayam' ? `MEDHĀ · ${FACULTIES[m.facultyId].name}` : 'MEDHĀ'}
                      </span>
                      {settings.showTimestamps && (
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.12)', fontFamily: 'system-ui' }}>{formatTime(m.timestamp)}</span>
                      )}
                    </div>

                    {/* Attachment preview */}
                    {m.attachment && m.attachment.type === 'image' && (
                      <img src={m.attachment.dataUrl} alt={m.attachment.name} style={{ maxWidth: '200px', borderRadius: '10px', marginBottom: '6px', opacity: 0.8 }} />
                    )}

                    <div style={{ maxWidth: '78%', padding: m.role === 'user' ? '10px 14px' : '0', background: m.role === 'user' ? 'rgba(255,255,255,0.05)' : 'transparent', border: m.role === 'user' ? '1px solid rgba(255,255,255,0.07)' : 'none', borderRadius: '14px', fontSize: '14px', lineHeight: '1.65', letterSpacing: '0.02em', color: m.error ? 'rgba(220,100,100,0.7)' : 'rgba(255,255,255,0.75)', fontFamily: 'system-ui, sans-serif', whiteSpace: 'pre-wrap' }}>
                      {m.content || (m.isStreaming && (
                        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}
                          style={{ display: 'inline-block', width: '2px', height: '14px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px', verticalAlign: 'middle' }} />
                      ))}
                    </div>
                  </motion.div>
                ))}

                {error && !streaming && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={doRetry} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer', fontFamily: 'system-ui' }}>Retry</button>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div style={{ flexShrink: 0, padding: '8px 16px 24px' }}>
          <div style={{ maxWidth: '620px', margin: '0 auto' }}>

            {/* Attachment preview */}
            <AnimatePresence>
              {attachment && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}>
                  {attachment.type === 'image' && <img src={attachment.dataUrl} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '6px' }} />}
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Faculty selector + input */}
            <div style={{ marginBottom: '8px' }}>
              <FacultySelector current={selectedFaculty} onSelect={switchFaculty} />
            </div>

            <div style={{ position: 'relative', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', backdropFilter: 'blur(12px)' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={isRecording ? 'Listening…' : 'Speak into the void…'}
                rows={1}
                disabled={streaming}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.6', letterSpacing: '0.02em', fontFamily: 'system-ui, sans-serif', padding: '14px 110px 12px 16px', maxHeight: '140px', overflow: 'auto', scrollbarWidth: 'none', opacity: streaming ? 0.5 : 1 }}
              />

              {/* Action buttons */}
              <div style={{ position: 'absolute', right: '8px', bottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                {/* Attach */}
                <button onClick={() => fileInputRef.current?.click()} title="Attach file"
                  style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>

                {/* Voice */}
                {settings.voiceEnabled && (
                  <button onClick={isRecording ? stopVoice : startVoice} title={isRecording ? 'Stop' : 'Voice input'}
                    style={{ width: '30px', height: '30px', borderRadius: '50%', background: isRecording ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isRecording ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.08)'}`, color: isRecording ? '#f87171' : 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isRecording
                      ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }} />
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                    }
                  </button>
                )}

                {/* Send */}
                <button onClick={send} disabled={!canSend}
                  style={{ width: '30px', height: '30px', borderRadius: '50%', background: canSend ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: canSend ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', cursor: canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
              </div>

              {/* Streaming line */}
              <AnimatePresence>
                {streaming && (
                  <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} exit={{ scaleX: 0, opacity: 0 }}
                    style={{ position: 'absolute', bottom: 0, left: '12px', right: '12px', height: '1px', background: `linear-gradient(90deg, ${facultyColor}, #7b2fff, ${facultyColor})`, transformOrigin: 'left', borderRadius: '1px' }} />
                )}
              </AnimatePresence>
            </div>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.12)', fontSize: '10px', letterSpacing: '0.18em', fontFamily: 'system-ui', textTransform: 'uppercase', marginTop: '8px' }}>
              Enter · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Settings overlay */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 190, backdropFilter: 'blur(4px)' }} />
            <SettingsPanel settings={settings} onUpdate={setSettings} onClose={() => setShowSettings(false)} />
          </>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.md" onChange={handleFileSelect} style={{ display: 'none' }} />
    </div>
  )
}
