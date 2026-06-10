'use client'

import { useState, useRef, useCallback, useEffect, Component, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── Utilities ──────────────────────────────────────────────────────────────

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Types ──────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'system'

interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  isStreaming?: boolean
  error?: boolean
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'error'

type EntityState =
  | 'dormant'
  | 'listening'
  | 'thinking'
  | 'reasoning'
  | 'researching'
  | 'creating'
  | 'responding'
  | 'memory-recall'
  | 'deep-research'
  | 'voice-listening'
  | 'voice-active'
  | 'creative-flow'
  | 'guardian'
  | 'meditation'
  | 'patrol'
  | 'approach'
  | 'retreat'
  | 'wake-up'
  | 'sleep'
  | 'celebration'

// ─── Web Speech API (typed locally to avoid global lib dependency) ─────────

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

// ─── Error Boundary ─────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[MEDHĀ Error Boundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="fixed inset-0 bg-black flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-white/40 text-sm tracking-[0.2em] uppercase">
                The void encountered an anomaly
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="text-white/25 text-xs tracking-widest uppercase border border-white/10 px-4 py-2 rounded-lg hover:border-white/20 transition-colors"
              >
                Reconnect
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

// ─── VoidCanvas — deep space star field ─────────────────────────────────────

function VoidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let stars: Array<{ x: number; y: number; r: number; o: number; speed: number }> = []

    const buildStars = () => {
      const count = Math.floor((canvas.width * canvas.height) / 14000)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 0.8 + 0.1,
        o: Math.random() * 0.18 + 0.02,
        speed: Math.random() * 0.0008 + 0.0003,
      }))
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      buildStars()
    }

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 1

      for (const star of stars) {
        const opacity = star.o * (0.7 + 0.3 * Math.sin(t * star.speed * 60))
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${opacity})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()

    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{
        background: '#000000',
        zIndex: 0,
      }}
    />
  )
}

// ─── Entity animation hook (GSAP) ───────────────────────────────────────────

function useEntityAnimation(ref: React.RefObject<HTMLElement | null>, state: EntityState) {
  const gsapRef = useRef<typeof import('gsap').gsap | null>(null)
  const timelineRef = useRef<ReturnType<typeof import('gsap').gsap.timeline> | null>(null)

  useEffect(() => {
    let mounted = true

    import('gsap').then(({ gsap }) => {
      if (!mounted) return
      gsapRef.current = gsap
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    const gsap = gsapRef.current
    if (!el || !gsap) return

    timelineRef.current?.kill()

    const tl = gsap.timeline({ repeat: -1, yoyo: true })
    timelineRef.current = tl

    switch (state) {
      case 'dormant':
      case 'meditation':
        tl.to(el, { scale: 1.018, y: -8, duration: 6, ease: 'sine.inOut' })
        break

      case 'listening':
      case 'voice-listening':
        tl.to(el, { scale: 1.025, y: -6, duration: 3, ease: 'sine.inOut' })
        break

      case 'thinking':
      case 'reasoning':
        tl.to(el, { scale: 1.022, y: -10, duration: 2.5, ease: 'power1.inOut' })
        break

      case 'responding':
      case 'voice-active':
        tl.to(el, { scale: 1.03, y: -12, duration: 2, ease: 'sine.inOut' })
        break

      case 'deep-research':
      case 'researching':
        tl.to(el, { scale: 1.035, y: -14, duration: 1.8, ease: 'power2.inOut' })
        break

      case 'celebration':
        tl.to(el, { scale: 1.05, y: -18, duration: 1.2, ease: 'back.inOut(1.5)' })
        break

      default:
        tl.to(el, { scale: 1.018, y: -8, duration: 5, ease: 'sine.inOut' })
    }

    return () => {
      tl.kill()
    }
  }, [ref, state])
}

// ─── MedhaEntity ─────────────────────────────────────────────────────────────

interface MedhaEntityProps {
  state: EntityState
  videoSrc?: string
  className?: string
}

function StateAura({ state }: { state: EntityState }) {
  const auraConfig: Record<string, { color: string; opacity: number; size: number }> = {
    dormant: { color: '#1a1aff', opacity: 0.04, size: 120 },
    listening: { color: '#7b2fff', opacity: 0.06, size: 140 },
    thinking: { color: '#7b2fff', opacity: 0.08, size: 150 },
    reasoning: { color: '#c026d3', opacity: 0.08, size: 155 },
    responding: { color: '#c026d3', opacity: 0.1, size: 160 },
    'deep-research': { color: '#1a1aff', opacity: 0.1, size: 170 },
    celebration: { color: '#dc2626', opacity: 0.12, size: 200 },
  }

  const config = auraConfig[state] ?? auraConfig.dormant

  return (
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
      animate={{
        opacity: [config.opacity * 0.6, config.opacity, config.opacity * 0.6],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        width: config.size,
        height: config.size * 0.3,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at center, ${config.color} 0%, transparent 70%)`,
        filter: 'blur(20px)',
      }}
    />
  )
}

/**
 * MedhāEntity — The celestial wing centerpiece.
 * Renders the animated wing video suspended in void.
 * Falls back to static image if no video provided.
 */
function MedhaEntity({ state, videoSrc, className }: MedhaEntityProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEntityAnimation(containerRef, state)

  // Ensure video plays (autoplay policy workaround)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const tryPlay = () => {
      video.play().catch(() => {
        // Autoplay blocked — will play on first interaction
      })
    }

    video.addEventListener('loadeddata', tryPlay)
    tryPlay()

    return () => video.removeEventListener('loadeddata', tryPlay)
  }, [videoSrc])

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'relative flex items-center justify-center',
        'will-change-transform',
        className
      )}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-contain pointer-events-none select-none"
          style={{
            filter: 'none',
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/medha-entity.png"
          alt="MEDHĀ"
          className="w-full h-full object-contain pointer-events-none select-none"
          style={{ filter: 'none' }}
        />
      )}

      <StateAura state={state} />
    </motion.div>
  )
}

// ─── Chat: Message List ──────────────────────────────────────────────────────

function CursorBlink() {
  return (
    <motion.span
      className="inline-block w-[2px] h-[14px] bg-white/40 rounded-full align-middle ml-0.5"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  )
}

function MessageItem({ message, index }: { message: ChatMessage; index: number }) {
  const isUser = message.role === 'user'
  const isError = message.error

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn('w-full flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[78%] md:max-w-[65%]',
          isUser ? 'items-end' : 'items-start',
          'flex flex-col gap-1'
        )}
      >
        {/* Role label */}
        <span
          className={cn(
            'text-[10px] tracking-[0.2em] uppercase font-body',
            isUser ? 'text-right text-white/20 pr-1' : 'text-left text-white/25 pl-1'
          )}
        >
          {isUser ? 'YOU' : 'MEDHĀ'}
        </span>

        {/* Content */}
        <div
          className={cn(
            'relative px-4 py-3 rounded-2xl',
            'font-body text-[15px] leading-relaxed tracking-wide',
            isUser
              ? 'bg-white/[0.06] border border-white/[0.08] text-white/80 rounded-br-md'
              : isError
              ? 'text-red-400/70 pl-1'
              : 'text-white/75 pl-1 bg-transparent border-none'
          )}
        >
          {message.content || (message.isStreaming && <CursorBlink />)}

          {message.isStreaming && message.content && (
            <span className="inline-block ml-0.5">
              <CursorBlink />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function MessageList({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) return null

  return (
    <div className="w-full flex flex-col gap-5 px-4 md:px-0">
      {messages.map((message, i) => (
        <MessageItem key={message.id} message={message} index={i} />
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  )
}

// ─── Chat: Input ──────────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

function RecordingIcon() {
  return (
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
      className="w-2.5 h-2.5 rounded-full bg-red-400"
    />
  )
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

interface ChatInputProps {
  onSend: (message: string) => void
  onVoiceStart: () => void
  onVoiceStop: () => void
  voiceState: VoiceState
  voiceTranscript: string
  isStreaming: boolean
  isVoiceSupported: boolean
  placeholder?: string
}

function ChatInput({
  onSend,
  onVoiceStart,
  onVoiceStop,
  voiceState,
  voiceTranscript,
  isStreaming,
  isVoiceSupported,
  placeholder = 'Speak into the void…',
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync voice transcript into input
  useEffect(() => {
    if (voiceTranscript) {
      setValue(voiceTranscript)
    }
  }, [voiceTranscript])

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const isRecording = voiceState === 'recording'
  const canSend = value.trim().length > 0 && !isStreaming

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto px-4 md:px-0"
    >
      <div
        className={cn(
          'relative rounded-2xl transition-all duration-300',
          'bg-white/[0.04] backdrop-blur-md',
          'border',
          isFocused
            ? 'border-white/[0.12] shadow-[0_0_40px_rgba(123,47,255,0.08)]'
            : 'border-white/[0.06]'
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isRecording ? 'Listening…' : placeholder}
          disabled={isStreaming}
          rows={1}
          className={cn(
            'w-full bg-transparent resize-none outline-none',
            'text-white/80 placeholder:text-white/25',
            'text-[15px] leading-relaxed tracking-wide font-body',
            'px-4 pt-4 pb-3 pr-24',
            'max-h-[160px] overflow-y-auto',
            'scrollbar-none',
            'transition-colors duration-200',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          style={{ scrollbarWidth: 'none' }}
        />

        {/* Actions */}
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          {/* Voice button */}
          {isVoiceSupported && (
            <motion.button
              onClick={isRecording ? onVoiceStop : onVoiceStart}
              disabled={isStreaming}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                'transition-all duration-200',
                isRecording
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white/60 hover:bg-white/[0.08]',
                isStreaming && 'opacity-30 cursor-not-allowed'
              )}
              whileTap={{ scale: 0.92 }}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? <RecordingIcon /> : <MicIcon />}
            </motion.button>
          )}

          {/* Send button */}
          <motion.button
            onClick={handleSubmit}
            disabled={!canSend}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              'transition-all duration-200',
              canSend
                ? 'bg-white/[0.1] border border-white/[0.15] text-white/80 hover:bg-white/[0.15]'
                : 'bg-white/[0.03] border border-white/[0.05] text-white/20 cursor-not-allowed'
            )}
            whileTap={canSend ? { scale: 0.92 } : {}}
            title="Send (Enter)"
          >
            <SendIcon />
          </motion.button>
        </div>

        {/* Streaming indicator */}
        <AnimatePresence>
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              className="absolute bottom-0 left-4 right-4 h-px origin-left"
              style={{
                background: 'linear-gradient(90deg, #1a1aff, #7b2fff, #c026d3)',
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Hint */}
      <p className="text-center text-white/15 text-[11px] tracking-[0.15em] font-body mt-3 uppercase">
        Enter to send · Shift+Enter for new line
      </p>
    </motion.div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

const STATE_LABELS: Partial<Record<EntityState, string>> = {
  dormant: 'DORMANT',
  listening: 'LISTENING',
  thinking: 'THINKING',
  reasoning: 'REASONING',
  researching: 'RESEARCHING',
  responding: 'RESPONDING',
  'deep-research': 'DEEP RESEARCH',
  'voice-listening': 'VOICE LISTENING',
  'voice-active': 'VOICE ACTIVE',
  celebration: 'CELEBRATION',
}

interface HeaderProps {
  entityState: EntityState
  onClear?: () => void
  hasMessages?: boolean
}

function Header({ entityState, onClear, hasMessages }: HeaderProps) {
  const stateLabel = STATE_LABELS[entityState] ?? 'DORMANT'

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-10"
    >
      {/* Wordmark */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-white/90 text-sm tracking-[0.35em] font-display uppercase">
          MEDHĀ
        </h1>
        <motion.span
          key={stateLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-white/25 text-[9px] tracking-[0.3em] font-body uppercase"
        >
          {stateLabel}
        </motion.span>
      </div>

      {/* Clear button — only when messages exist */}
      {hasMessages && onClear && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClear}
          className={cn(
            'text-white/20 hover:text-white/50 transition-colors duration-200',
            'text-[10px] tracking-[0.25em] font-body uppercase',
            'px-3 py-1.5 rounded-lg border border-white/[0.05] hover:border-white/[0.1]',
            'bg-transparent hover:bg-white/[0.03]'
          )}
        >
          Clear
        </motion.button>
      )}
    </motion.header>
  )
}

// ─── Voice (Web Speech API) ────────────────────────────────────────────────────

function useVoice(onTranscript?: (text: string) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setVoiceState('error')
      return
    }

    try {
      // Request mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const w = window as SpeechRecognitionWindow
      const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition
      if (!SpeechRecognitionAPI) {
        setVoiceState('error')
        return
      }

      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => setVoiceState('recording')

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        const current = finalTranscript || interimTranscript
        setTranscript(current)

        if (finalTranscript) {
          onTranscript?.(finalTranscript)
        }
      }

      recognition.onerror = () => {
        setVoiceState('error')
        setTimeout(() => setVoiceState('idle'), 2000)
      }

      recognition.onend = () => {
        setVoiceState('idle')
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setVoiceState('error')
      setTimeout(() => setVoiceState('idle'), 2000)
    }
  }, [isSupported, onTranscript])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    mediaRecorderRef.current?.stop()
    setVoiceState('idle')
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    voiceState,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript,
    isSupported,
  }
}

// ─── Chat (streaming) ───────────────────────────────────────────────────────────

function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entityState, setEntityState] = useState<EntityState>('dormant')
  const lastUserMessageRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      setError(null)
      lastUserMessageRef.current = content

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      }

      setMessages(prev => [...prev, userMessage, assistantMessage])
      setIsStreaming(true)
      setEntityState('listening')

      // Brief listening state before thinking
      await new Promise(r => setTimeout(r, 400))
      setEntityState('thinking')

      abortControllerRef.current = new AbortController()

      try {
        const conversationHistory = [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content,
        }))

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversationHistory }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Connection failed')
        }

        setEntityState('responding')

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        if (!reader) throw new Error('No response stream')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  accumulated += parsed.content
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantMessage.id ? { ...m, content: accumulated } : m
                    )
                  )
                }
              } catch {
                // Malformed SSE chunk — skip
              }
            }
          }
        }

        setMessages(prev =>
          prev.map(m => (m.id === assistantMessage.id ? { ...m, isStreaming: false } : m))
        )

        setEntityState('dormant')
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setEntityState('dormant')
          return
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setEntityState('dormant')

        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: errorMessage, isStreaming: false, error: true }
              : m
          )
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [messages, isStreaming]
  )

  const retryLast = useCallback(async () => {
    if (lastUserMessageRef.current) {
      // Remove last assistant message if it errored
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.error) {
          return prev.slice(0, -2) // remove both user + failed assistant
        }
        return prev
      })
      await sendMessage(lastUserMessageRef.current)
    }
  }, [sendMessage])

  const clearHistory = useCallback(() => {
    abortControllerRef.current?.abort()
    setMessages([])
    setError(null)
    setEntityState('dormant')
  }, [])

  return {
    messages,
    isStreaming,
    error,
    entityState,
    sendMessage,
    clearHistory,
    retryLast,
  }
}

/**
 * MEDHĀ — Main Experience
 *
 * Layer stack (z-index order):
 * 0 — VoidCanvas (canvas star field)
 * 30 — MedhaEntity (wing video)
 * 40 — Conversation + Input
 * 50 — Header
 */
export default function MedhaPage() {
  const { messages, isStreaming, error, entityState, sendMessage, clearHistory, retryLast } =
    useChat()

  const handleTranscript = useCallback((_text: string) => {
    // Voice transcript is inserted into input via useVoice
  }, [])

  const { voiceState, transcript, startRecording, stopRecording, clearTranscript, isSupported } =
    useVoice(handleTranscript)

  const handleSend = useCallback(
    (content: string) => {
      clearTranscript()
      sendMessage(content)
    },
    [sendMessage, clearTranscript]
  )

  const hasMessages = messages.length > 0

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-black overflow-hidden">

        {/* ── Layer 0: Void ─────────────────────────────────────────────── */}
        <div className="absolute inset-0 z-0">
          <VoidCanvas />
        </div>

        {/* ── Layer 30: MEDHĀ Entity ──────────────────────────────────────── */}
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <MedhaEntity
            state={entityState}
            videoSrc="/assets/medha-dormant.mp4"
            className="
              w-auto
              h-[42vh] md:h-[44vh] lg:h-[46vh]
              max-w-[90vw] md:max-w-[60vw] lg:max-w-[50vw]
              gpu-accelerated
            "
          />
        </div>

        {/* ── Layer 40: Conversation + Input ──────────────────────────── */}
        <div className="absolute inset-0 z-40 flex flex-col">

          {/* Conversation scroll area — sits above entity, scrollable */}
          <div className="flex-1 overflow-y-auto pt-24 pb-4 flex flex-col justify-end">
            <div className="w-full max-w-2xl mx-auto">
              <AnimatePresence initial={false}>
                {hasMessages && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <MessageList messages={messages} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error retry */}
              <AnimatePresence>
                {error && !isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-center mt-4 px-4"
                  >
                    <button
                      onClick={retryLast}
                      className="text-white/30 hover:text-white/60 text-xs tracking-[0.2em] uppercase border border-white/[0.08] hover:border-white/[0.15] px-4 py-2 rounded-lg transition-all duration-200"
                    >
                      Retry
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Input system */}
          <div className="flex-shrink-0 pb-8 pt-3">
            <ChatInput
              onSend={handleSend}
              onVoiceStart={startRecording}
              onVoiceStop={stopRecording}
              voiceState={voiceState}
              voiceTranscript={transcript}
              isStreaming={isStreaming}
              isVoiceSupported={isSupported}
            />
          </div>
        </div>

        {/* ── Layer 50: Header ───────────────────────────────────────────── */}
        <div className="z-50">
          <Header entityState={entityState} onClear={clearHistory} hasMessages={hasMessages} />
        </div>

      </div>
    </ErrorBoundary>
  )
}
