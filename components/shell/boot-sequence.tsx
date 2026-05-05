'use client'

import { useEffect, useState } from 'react'
import { useBootSequence } from '@/lib/hooks/use-boot-sequence'

const LINES = [
  '> DREXIT_HQ v1.0.0',
  '> initializing modules...',
  '> [✓] finance',
  '> [✓] goals',
  '> [✓] fitness',
  '> [✓] ideas',
  '> ready.',
]

const LINE_INTERVAL_MS = 140
const HOLD_MS = 280
const FADE_MS = 220

export function BootSequence() {
  const { shouldShow, dismiss } = useBootSequence()
  const [visibleLines, setVisibleLines] = useState(0)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    if (!shouldShow) return

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion) {
      // Render all lines immediately, hold briefly, then dismiss without fade.
      setVisibleLines(LINES.length)
      timers.push(
        setTimeout(() => {
          if (!cancelled) dismiss()
        }, 400)
      )
    } else {
      LINES.forEach((_, i) => {
        timers.push(
          setTimeout(() => {
            if (!cancelled) setVisibleLines(i + 1)
          }, i * LINE_INTERVAL_MS)
        )
      })

      timers.push(
        setTimeout(() => {
          if (!cancelled) setFadingOut(true)
        }, LINES.length * LINE_INTERVAL_MS + HOLD_MS)
      )

      timers.push(
        setTimeout(() => {
          if (!cancelled) dismiss()
        }, LINES.length * LINE_INTERVAL_MS + HOLD_MS + FADE_MS)
      )
    }

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [shouldShow, dismiss])

  if (!shouldShow) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-base"
    >
      <pre
        className="font-mono text-sm leading-6 text-text-1"
        style={{ fontVariantLigatures: 'none' }}
      >
        {LINES.slice(0, visibleLines).map((l, i) => {
          const isLast = i === visibleLines - 1
          return (
            <div key={i} className={isLast ? 'boot-cursor' : undefined}>
              {l}
            </div>
          )
        })}
      </pre>
    </div>
  )
}
