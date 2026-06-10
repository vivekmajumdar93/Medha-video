'use client'

import { useEffect, useRef } from 'react'

/**
 * VoidBackground
 * Pure #000000 base with an almost-imperceptible deep space star field.
 * Canvas-rendered, hardware accelerated, zero impact on foreground.
 */
export function VoidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let stars: Array<{ x: number; y: number; r: number; o: number; speed: number }> = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      buildStars()
    }

    const buildStars = () => {
      const count = Math.floor((canvas.width * canvas.height) / 14000)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 0.8 + 0.1,
        o: Math.random() * 0.18 + 0.02,
        speed: Math.random() * 0.0008 + 0.0003,
      }))
    }

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 1

      for (const star of stars) {
        const opacity = star.o * (0.7 + 0.3 * Math.sin(t * star.speed * 60))
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${opacity})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()

    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{
        background: '#000000',
        zIndex: 0,
      }}
    />
  )
}
