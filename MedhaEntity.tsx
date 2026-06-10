'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useEntityAnimation } from '@/hooks/useEntityAnimation'
import { cn } from '@/lib/utils'
import type { EntityState } from '@/types'

interface MedhaEntityProps {
  state: EntityState
  videoSrc?: string
  className?: string
}

/**
 * MedhāEntity — The celestial wing centerpiece.
 * Renders the animated wing video suspended in void.
 * Falls back to static image if no video provided.
 */
export function MedhaEntity({ state, videoSrc, className }: MedhaEntityProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEntityAnimation(containerRef, { state })

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
        // Hardware acceleration
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
          className={cn(
            'w-full h-full object-contain',
            'pointer-events-none select-none',
          )}
          style={{
            // No filters, no effects — pure video
            filter: 'none',
            imageRendering: 'high-quality',
          }}
        />
      ) : (
        // Static image fallback
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/medha-entity.png"
          alt="MEDHĀ"
          className="w-full h-full object-contain pointer-events-none select-none"
          style={{ filter: 'none' }}
        />
      )}

      {/* State indicator — subtle glow pulse at base */}
      <StateAura state={state} />
    </motion.div>
  )
}

// ─── State Aura ───────────────────────────────────────────────────────────────

interface StateAuraProps {
  state: EntityState
}

function StateAura({ state }: StateAuraProps) {
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
        ease: 'sine.inOut',
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
