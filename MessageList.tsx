'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageItemProps {
  message: Message
  index: number
}

export function MessageItem({ message, index }: MessageItemProps) {
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
      className={cn(
        'w-full flex',
        isUser ? 'justify-end' : 'justify-start'
      )}
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
            isUser
              ? 'text-right text-white/20 pr-1'
              : 'text-left text-white/25 pl-1'
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
              : 'text-white/75 pl-1 bg-transparent border-none',
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

function CursorBlink() {
  return (
    <motion.span
      className="inline-block w-[2px] h-[14px] bg-white/40 rounded-full align-middle ml-0.5"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'steps(1)' }}
    />
  )
}

// ─── Message List ─────────────────────────────────────────────────────────────

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
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
