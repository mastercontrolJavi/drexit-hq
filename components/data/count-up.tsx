'use client'

import { useCountUp } from '@/lib/hooks/use-count-up'

interface CountUpProps {
  value: number
  /** Formatter applied to the in-flight value, e.g. formatCurrencyShort. */
  format?: (n: number) => string
  /** Decimal places held during the tween. Default 0. */
  precision?: number
  className?: string
}

/**
 * Renders a figure that counts toward its value. Drop it in wherever a raw
 * number is available; the surrounding type styles (num-display, tabular-nums)
 * come from the parent.
 */
export function CountUp({ value, format, precision, className }: CountUpProps) {
  const n = useCountUp(value, { precision })
  return <span className={className}>{format ? format(n) : String(n)}</span>
}
