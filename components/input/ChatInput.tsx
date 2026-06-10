'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { VoiceState } from '@/types'

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

export function ChatInput({
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
              {isRecording ? (
                <RecordingIcon />
              ) : (
                <MicIcon />
              )}
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

// ─── Icons ────────────────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
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
      <path d="m22 2-7 20-4-9-9-4Z"/>
      <path d="M22 2 11 13"/>
    </svg>
  )
}
