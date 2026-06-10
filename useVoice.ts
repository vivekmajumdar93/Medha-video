'use client'

import { useState, useRef, useCallback } from 'react'
import type { VoiceState } from '@/types'

interface UseVoiceReturn {
  voiceState: VoiceState
  transcript: string
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearTranscript: () => void
  isSupported: boolean
}

export function useVoice(onTranscript?: (text: string) => void): UseVoiceReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
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

      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => setVoiceState('recording')

      recognition.onresult = (event: SpeechRecognitionEvent) => {
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

// Extend Window type for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
