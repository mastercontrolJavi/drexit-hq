import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Empty states existed at six different paddings for the same job: py-2,
 * py-4, py-6, py-8, py-12, py-16, and only two of fifteen carried a mark.
 * Three variants now cover every case, and the `>` prompt is baked in so
 * the terminal voice cannot drift out of one of them.
 *
 * This is "there is nothing here yet", never "the read failed". That is
 * LoadError, and conflating the two tells the reader something untrue.
 */
const emptyStateVariants = cva('font-mono text-xs text-text-3', {
  variants: {
    variant: {
      /** Dense sub-region: a kanban column, an inline sub-list. */
      compact: 'py-2',
      /** Default: inside a container that already supplies horizontal padding. */
      inline: 'py-6',
      /** Sitting directly against the panel edge, with no padded body around it. */
      flush: 'px-4 py-6',
      /** A whole panel with nothing in it. Centred, takes a mark. */
      block:
        'flex flex-col items-center justify-center gap-3 border border-border bg-bg-elevated px-4 py-12 text-center',
    },
  },
  defaultVariants: { variant: 'inline' },
})

interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
  children: React.ReactNode
  /** Only rendered by the `block` variant. */
  icon?: LucideIcon
  /** Second line: the why, or the next step. `block` variant only. */
  hint?: React.ReactNode
  className?: string
}

export function EmptyState({
  children,
  icon: Icon,
  hint,
  variant,
  className,
}: EmptyStateProps) {
  if (variant === 'block') {
    return (
      <div className={cn(emptyStateVariants({ variant }), className)}>
        {Icon && <Icon className="h-5 w-5 text-text-3" strokeWidth={1.5} />}
        <div className="space-y-1">
          <p className="caption text-text-2">{children}</p>
          {hint && (
            <p className="mx-auto max-w-xs font-mono text-[11px] leading-relaxed text-text-3">
              &gt; {hint}
            </p>
          )}
        </div>
      </div>
    )
  }
  return (
    <p className={cn(emptyStateVariants({ variant }), className)}>
      &gt; {children}
    </p>
  )
}
