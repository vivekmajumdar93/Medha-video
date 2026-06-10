'use client'

import { useState, useCallback, useRef } from 'react'
import { generateId } from '@/lib/utils'
import type { Message, EntityState } from '@/types'

interface UseChatReturn {
  messages: Message[]
  isStreaming: boolean
  error: string | null
  entityState: EntityState
  sendMessage: (content: string) => Promise<void>
  clearHistory: () => void
  retryLast: () => Promise<void>
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entityState, setEntityState] = useState<EntityState>('dormant')
  const lastUserMessageRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return

    setError(null)
    lastUserMessageRef.current = content

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }

    const assistantMessage: Message = {
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
                    m.id === assistantMessage.id
                      ? { ...m, content: accumulated }
                      : m
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
        prev.map(m =>
          m.id === assistantMessage.id
            ? { ...m, isStreaming: false }
            : m
        )
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
  }, [messages, isStreaming])

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
