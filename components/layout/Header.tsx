'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { EntityState } from '@/types'

interface HeaderProps {
  entityState: EntityState
  onClear?: () => void
  hasMessages?: boolean
}

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

export function Header({ entityState, onClear, hasMessages }: HeaderProps) {
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
