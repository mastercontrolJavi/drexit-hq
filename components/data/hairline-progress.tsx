import { cn } from '@/lib/utils'

type Tone = 'accent' | 'success' | 'warn' | 'danger' | 'neutral'

const TONE: Record<Tone, string> = {
  accent:  'bg-accent',
  success: 'bg-success',
  warn:    'bg-warn',
  danger:  'bg-danger',
  neutral: 'bg-text-2',
}

interface HairlineProgressProps {
  value: number
  max?: number
  tone?: Tone
  className?: string
  /** Bar height in pixels. Default 2px. */
  height?: number
}

export function HairlineProgress({
  value,
  max = 100,
  tone = 'accent',
  className,
  height = 2,
}: HairlineProgressProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div
      className={cn('w-full bg-border', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn('h-full transition-[width] duration-200 ease-out', TONE[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
