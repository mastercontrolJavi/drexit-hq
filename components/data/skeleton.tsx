import { cn } from '@/lib/utils'

/**
 * Loading shapes that match the real content.
 *
 * A grey slab where a chart goes tells the reader nothing and guarantees a
 * jump when the data lands. These draw the actual structure: panel chrome,
 * row rhythm, bar columns, a line path, so the skeleton and the loaded
 * state occupy the same geometry.
 *
 * Pulse is offset per element so a panel breathes in sequence rather than
 * flashing as one block. Delays are deterministic (no Math.random) to keep
 * server and client markup identical.
 */

/** Base block. Rectangular, because the design system has no rounded fills. */
export function Shimmer({
  className,
  delay = 0,
  style,
}: {
  className?: string
  /** Pulse offset in ms. */
  delay?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse bg-bg-hover', className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined, ...style }}
    />
  )
}

/** Panel chrome: hairline border plus a header rule, matching a real section. */
export function SkeletonPanel({
  children,
  headerWidth = 'w-24',
  className,
}: {
  children?: React.ReactNode
  headerWidth?: string
  className?: string
}) {
  return (
    <section
      aria-hidden
      className={cn('border border-border bg-bg-elevated', className)}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <Shimmer className={cn('h-3', headerWidth)} />
        <Shimmer className="h-3 w-12" delay={120} />
      </div>
      {children}
    </section>
  )
}

/** Hairline-separated rows at varying widths, matching a real list. */
const ROW_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-[45%]', 'w-[70%]', 'w-3/5']

export function SkeletonRows({
  count = 3,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <ul aria-hidden className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="border-b border-border px-4 py-2.5 last:border-b-0">
          <Shimmer
            className={cn('h-4', ROW_WIDTHS[i % ROW_WIDTHS.length])}
            delay={i * 90}
          />
        </li>
      ))}
    </ul>
  )
}

/** Caption plus 2px bar: the shape HairlineProgress rows actually take. */
export function SkeletonBarRows({
  count = 3,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div aria-hidden className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Shimmer
              className={cn('h-3', ROW_WIDTHS[i % ROW_WIDTHS.length])}
              delay={i * 90}
            />
            <Shimmer className="h-3 w-10" delay={i * 90 + 40} />
          </div>
          <Shimmer className="h-0.5 w-full" delay={i * 90} />
        </div>
      ))}
    </div>
  )
}

/** Stat cell: caption, figure, delta. */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('space-y-2', className)}>
      <Shimmer className="h-3 w-20" />
      <Shimmer className="h-10 w-24" delay={80} />
      <Shimmer className="h-3 w-16" delay={160} />
    </div>
  )
}

/** Deterministic column heights, so it reads as data not as a placeholder. */
const BAR_RATIOS = [0.42, 0.68, 0.34, 0.86, 0.55, 0.72, 0.38, 0.62, 0.5, 0.78]

export function SkeletonBarChart({
  height = 140,
  bars = 6,
  className,
}: {
  height?: number
  bars?: number
  className?: string
}) {
  return (
    <div aria-hidden className={cn('relative w-full', className)} style={{ height }}>
      <div className="flex h-full items-end gap-2 pb-4">
        {Array.from({ length: bars }).map((_, i) => (
          <Shimmer
            key={i}
            className="flex-1"
            delay={i * 70}
            style={{ height: `${BAR_RATIOS[i % BAR_RATIOS.length] * 100}%` }}
          />
        ))}
      </div>
      {/* Baseline, exactly where the real axis sits */}
      <div className="absolute inset-x-0 bottom-4 h-px bg-border" />
    </div>
  )
}

export function SkeletonLineChart({
  height = 180,
  className,
}: {
  height?: number
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn('relative w-full animate-pulse', className)}
      style={{ height }}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        role="presentation"
      >
        <polyline
          points="0,31 14,27 28,30 43,21 57,23 71,15 85,17 100,10"
          fill="none"
          stroke="var(--bg-hover)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
    </div>
  )
}

/** Bordered card ghost for grid cells. */
export function SkeletonCard({
  className,
  lines = 2,
  delay = 0,
}: {
  className?: string
  lines?: number
  delay?: number
}) {
  return (
    <div
      aria-hidden
      className={cn('space-y-2 border border-border bg-bg-elevated p-4', className)}
    >
      <Shimmer className="h-3 w-16" delay={delay} />
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className={cn('h-4', ROW_WIDTHS[i % ROW_WIDTHS.length])}
          delay={delay + 60 + i * 60}
        />
      ))}
    </div>
  )
}
