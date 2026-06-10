'use client'

import { useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { VoidBackground } from '@/components/layout/VoidBackground'
import { Header } from '@/components/layout/Header'
import {
  ParticleSystemLayer,
  MemoryGalaxyLayer,
} from '@/components/layout/FutureLayers'
import { MedhaEntity } from '@/components/entity/MedhaEntity'
import { MessageList } from '@/components/chat/MessageList'
import { ChatInput } from '@/components/input/ChatInput'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

import { useChat } from '@/hooks/useChat'
import { useVoice } from '@/hooks/useVoice'

/**
 * MEDHĀ — Main Experience
 *
 * Layer stack (z-index order):
 * 0 — VoidBackground (canvas star field)
 * 1 — MemoryGalaxyLayer (Phase 2 placeholder)
 * 2 — ParticleSystemLayer (Phase 3 placeholder)
 * 3 — MedhaEntity (wing video)
 * 4 — MessageList (conversation)
 * 5 — ChatInput (input system)
 * 50 — Header
 */
export default function MedhaPage() {
  const { messages, isStreaming, error, entityState, sendMessage, clearHistory, retryLast } = useChat()

  const handleTranscript = useCallback((text: string) => {
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
          <VoidBackground />
        </div>

        {/* ── Layer 1: Memory Galaxy (Phase 2) ──────────────────────────── */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <MemoryGalaxyLayer />
        </div>

        {/* ── Layer 2: Particle System (Phase 3) ────────────────────────── */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <ParticleSystemLayer />
        </div>

        {/* ── Layer 3: MEDHĀ Entity ──────────────────────────────────────── */}
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

        {/* ── Layers 4–5: Conversation + Input ──────────────────────────── */}
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
          <Header
            entityState={entityState}
            onClear={clearHistory}
            hasMessages={hasMessages}
          />
        </div>

      </div>
    </ErrorBoundary>
  )
}
