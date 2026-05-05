import { cn } from '@/lib/utils'
import { Stat, type StatTone } from './stat'

export interface MetricStripItem {
  label: string
  value: string
  delta?: string
  tone?: StatTone
  spark?: number[]
}

interface MetricStripProps {
  items: MetricStripItem[]
  /** Tailwind size class for values (defaults to text-[40px]). */
  valueSize?: string
  className?: string
}

/**
 * Horizontal strip of stats with hairline dividers between cells.
 * No card chrome, no shadows — pure data density.
 */
export function MetricStrip({ items, valueSize, className }: MetricStripProps) {
  return (
    <div
      className={cn(
        'grid border border-border bg-bg-elevated divide-x divide-border',
        items.length === 4 && 'grid-cols-2 lg:grid-cols-4',
        items.length === 3 && 'grid-cols-1 md:grid-cols-3',
        items.length === 2 && 'grid-cols-2',
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="px-5 py-4">
          <Stat
            label={item.label}
            value={item.value}
            delta={item.delta}
            tone={item.tone}
            spark={item.spark}
            valueSize={valueSize}
          />
        </div>
      ))}
    </div>
  )
}
