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

export function useVoice(onTranscript?: (text: string) => void): UseVoiceReturn {
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
