'use client'

import { useEffect, useRef } from 'react'
import type { EntityState } from '@/types'

interface UseEntityAnimationOptions {
  state: EntityState
}

export function useEntityAnimation(
  ref: React.RefObject<HTMLElement | null>,
  { state }: UseEntityAnimationOptions
) {
  const gsapRef = useRef<typeof import('gsap').gsap | null>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    let mounted = true

    import('gsap').then(({ gsap }) => {
      if (!mounted) return
      gsapRef.current = gsap
    })

    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const el = ref.current
    const gsap = gsapRef.current
    if (!el || !gsap) return

    // Kill existing timeline
    timelineRef.current?.kill()

    const tl = gsap.timeline({ repeat: -1, yoyo: true })
    timelineRef.current = tl

    switch (state) {
      case 'dormant':
        tl.to(el, {
          scale: 1.018,
          y: -8,
          duration: 6,
          ease: 'sine.inOut',
        })
        break

      case 'listening':
      case 'voice-listening':
        tl.to(el, {
          scale: 1.025,
          y: -6,
          duration: 3,
          ease: 'sine.inOut',
        })
        break

      case 'thinking':
      case 'reasoning':
        tl.to(el, {
          scale: 1.022,
          y: -10,
          duration: 2.5,
          ease: 'power1.inOut',
        })
        break

      case 'responding':
      case 'voice-active':
        tl.to(el, {
          scale: 1.03,
          y: -12,
          duration: 2,
          ease: 'sine.inOut',
        })
        break

      case 'deep-research':
      case 'researching':
        tl.to(el, {
          scale: 1.035,
          y: -14,
          duration: 1.8,
          ease: 'power2.inOut',
        })
        break

      case 'celebration':
        tl.to(el, {
          scale: 1.05,
          y: -18,
          duration: 1.2,
          ease: 'back.inOut(1.5)',
        })
        break

      default:
        tl.to(el, {
          scale: 1.018,
          y: -8,
          duration: 5,
          ease: 'sine.inOut',
        })
    }

    return () => {
      tl.kill()
    }
  }, [ref, state, gsapRef.current]) // eslint-disable-line react-hooks/exhaustive-deps
}
