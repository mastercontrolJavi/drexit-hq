import { cn } from '@/lib/utils'
import { Sparkline } from './sparkline'

export type StatTone = 'neutral' | 'success' | 'warn' | 'danger' | 'accent'

const TONE_CLASS: Record<StatTone, string> = {
  neutral: 'text-text-1',
  success: 'text-success',
  warn:    'text-warn',
  danger:  'text-danger',
  accent:  'text-accent',
}

const DELTA_CLASS: Record<StatTone, string> = {
  neutral: 'text-text-3',
  success: 'text-success',
  warn:    'text-warn',
  danger:  'text-danger',
  accent:  'text-accent',
}

interface StatProps {
  label: string
  value: string
  /** Display delta (e.g. "+£12", "-1.4 lbs"). */
  delta?: string
  /** Tone for the value AND delta. Use sparingly — only when meaning demands color. */
  tone?: StatTone
  /** Sparkline data. */
  spark?: number[]
  /** Tailwind size class for the value (default: text-[40px]). */
  valueSize?: string
  className?: string
  align?: 'left' | 'center'
}

export function Stat({
  label,
  value,
  delta,
  tone = 'neutral',
  spark,
  valueSize = 'text-[40px] leading-[44px]',
  className,
  align = 'left',
}: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', align === 'center' && 'items-center text-center', className)}>
      <span className="caption text-text-2">{label}</span>
      <span className={cn('num-display tracking-[-0.02em]', valueSize, TONE_CLASS[tone])}>
        {value}
      </span>
      {(spark || delta) && (
        <div className={cn('flex items-center gap-2', align === 'center' && 'justify-center')}>
          {spark && spark.length > 1 && (
            <Sparkline
              data={spark}
              width={64}
              height={14}
              className={cn(DELTA_CLASS[tone === 'neutral' ? 'neutral' : tone])}
            />
          )}
          {delta && (
            <span className={cn('font-mono text-[11px] tabular-nums', DELTA_CLASS[tone])}>
              {delta}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
