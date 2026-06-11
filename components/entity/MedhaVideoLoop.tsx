'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * MedhaVideoLoop
 * Cross-fades between two instances of the same video offset by half duration.
 * Creates a perfectly smooth perceived loop even when the source video
 * has a mismatched first/last frame.
 */
interface MedhaVideoLoopProps {
  src: string
  style?: React.CSSProperties
}

export function MedhaVideoLoop({ src, style }: MedhaVideoLoopProps) {
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const [opacityA, setOpacityA] = useState(1)
  const [opacityB, setOpacityB] = useState(0)
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRef = useRef<'a' | 'b'>('a')

  useEffect(() => {
    const vA = videoARef.current
    const vB = videoBRef.current
    if (!vA || !vB) return

    const FADE_DURATION = 1200  // ms — crossfade window
    const FADE_STEPS = 30
    const STEP_INTERVAL = FADE_DURATION / FADE_STEPS

    const startCrossfade = () => {
      if (fadeRef.current) clearInterval(fadeRef.current)

      let step = 0
      const fromA = activeRef.current === 'a'

      // Start incoming video from beginning
      const incoming = fromA ? vB : vA
      incoming.currentTime = 0
      incoming.play().catch(() => {})

      fadeRef.current = setInterval(() => {
        step++
        const progress = step / FADE_STEPS
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2 // ease in-out quad

        if (fromA) {
          setOpacityA(1 - eased)
          setOpacityB(eased)
        } else {
          setOpacityA(eased)
          setOpacityB(1 - eased)
        }

        if (step >= FADE_STEPS) {
          clearInterval(fadeRef.current!)
          activeRef.current = fromA ? 'b' : 'a'
          // Pause and reset the now-hidden video
          const outgoing = fromA ? vA : vB
          outgoing.pause()
          outgoing.currentTime = 0
        }
      }, STEP_INTERVAL)
    }

    const setupVideo = async (video: HTMLVideoElement) => {
      video.src = src
      video.loop = false
      video.muted = true
      video.playsInline = true
      video.preload = 'auto'
      await video.load()
    }

    const initAndPlay = async () => {
      await Promise.all([setupVideo(vA), setupVideo(vB)])

      // Stagger B by half the video duration once metadata loads
      vA.addEventListener('loadedmetadata', () => {
        const halfDuration = vA.duration / 2
        vB.currentTime = halfDuration
      }, { once: true })

      vA.play().catch(() => {})

      // Crossfade trigger — start fade when 1.2s before end
      const checkTime = () => {
        const active = activeRef.current === 'a' ? vA : vB
        const timeLeft = active.duration - active.currentTime
        if (timeLeft <= FADE_DURATION / 1000 + 0.05 && timeLeft > 0) {
          startCrossfade()
        }
      }

      vA.addEventListener('timeupdate', checkTime)
      vB.addEventListener('timeupdate', checkTime)

      return () => {
        vA.removeEventListener('timeupdate', checkTime)
        vB.removeEventListener('timeupdate', checkTime)
      }
    }

    let cleanup: (() => void) | undefined
    initAndPlay().then(fn => { cleanup = fn })

    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current)
      cleanup?.()
      vA.pause()
      vB.pause()
    }
  }, [src])

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
    transition: 'none',
    ...style,
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoARef}
        muted
        playsInline
        style={{ ...baseStyle, opacity: opacityA }}
      />
      <video
        ref={videoBRef}
        muted
        playsInline
        style={{ ...baseStyle, opacity: opacityB }}
      />
    </div>
  )
}
