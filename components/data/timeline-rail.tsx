import { cn } from '@/lib/utils'

export interface TimelineRailItemProps {
  /** Show this item as the active/current marker. */
  active?: boolean
  /** Tone of the dot marker. */
  tone?: 'accent' | 'success' | 'warn' | 'danger' | 'neutral'
  className?: string
  children: React.ReactNode
}

const DOT_BG: Record<NonNullable<TimelineRailItemProps['tone']>, string> = {
  accent:  'bg-accent',
  success: 'bg-success',
  warn:    'bg-warn',
  danger:  'bg-danger',
  neutral: 'bg-text-3',
}

/**
 * Vertical timeline rail. Render <TimelineRail> as the wrapper and
 * <TimelineRail.Item> for each row. The rail draws a 1px line on the left
 * spanning the full height; each item displays a 6px dot marker plus a
 * hairline horizontal connector before the content.
 */
export function TimelineRail({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return (
    <ol className={cn('relative', className)}>
      <span
        aria-hidden
        className="absolute left-[3px] top-0 bottom-0 w-px bg-border"
      />
      {children}
    </ol>
  )
}

function TimelineRailItem({
  active = false,
  tone = 'neutral',
  className,
  children,
}: TimelineRailItemProps) {
  return (
    <li className={cn('relative pl-8 pb-8 last:pb-0', className)}>
      {/* Dot marker */}
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full ring-2 ring-bg-base',
          active ? 'bg-accent' : DOT_BG[tone],
        )}
      />
      {/* Hairline connector to the right of the dot */}
      <span
        aria-hidden
        className="absolute left-2 top-2 h-px w-4 bg-border"
      />
      {children}
    </li>
  )
}

TimelineRail.Item = TimelineRailItem
