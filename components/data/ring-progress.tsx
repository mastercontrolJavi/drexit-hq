import { cn } from '@/lib/utils'

type Tone = 'accent' | 'success' | 'warn' | 'danger'

const STROKE: Record<Tone, string> = {
  accent:  'var(--accent)',
  success: 'var(--success)',
  warn:    'var(--warn)',
  danger:  'var(--danger)',
}

interface RingProgressProps {
  value: number
  max?: number
  size?: number
  /** Stroke width in pixels. Default 8px. */
  strokeWidth?: number
  tone?: Tone
  className?: string
}

export function RingProgress({
  value,
  max = 100,
  size = 56,
  strokeWidth = 8,
  tone = 'accent',
  className,
}: RingProgressProps) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn(className)}
      role="img"
      aria-label={`${Math.round(pct * 100)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--border)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={STROKE[tone]}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 200ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
    </svg>
  )
}
