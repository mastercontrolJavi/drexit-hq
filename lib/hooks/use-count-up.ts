'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
import { DUR, EASE_OUT } from '@/lib/motion'

interface CountUpOptions {
  /** Decimal places held during the tween. Default 0 — whole units. */
  precision?: number
  /** Seconds. Default DUR.count. */
  duration?: number
}

/**
 * Tweens a figure toward its new value. Runs from 0 on first paint (data
 * arrives async, so this is the moment the number lands) and from the
 * previous value on every change after that — so logging an expense walks
 * the total up rather than snapping it.
 *
 * Always pair with tabular-nums, or the number will jitter its own width.
 */
export function useCountUp(value: number, options: CountUpOptions = {}): number {
  const { precision = 0, duration = DUR.count } = options
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (!Number.isFinite(value)) return

    if (reduced) {
      from.current = value
      setDisplay(value)
      return
    }

    const factor = 10 ** precision
    const controls = animate(from.current, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(Math.round(v * factor) / factor),
    })
    from.current = value
    return () => controls.stop()
  }, [value, precision, duration, reduced])

  return display
}
