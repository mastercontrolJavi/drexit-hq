import { cn } from '@/lib/utils'

interface LoadErrorProps {
  /** Optional detail appended after the failure line, in the terminal voice. */
  detail?: string
  /** Re-runs the fetch. Omit to render without a retry affordance. */
  onRetry?: () => void
  className?: string
}

/**
 * Failure state for a data surface. Distinct from the empty state on purpose —
 * "no data" and "we could not read the data" must never look the same.
 */
export function LoadError({ detail, onRetry, className }: LoadErrorProps) {
  return (
    <div
      role="alert"
      className={cn('flex items-center justify-between gap-3 py-4', className)}
    >
      <p className="min-w-0 truncate font-mono text-xs text-danger">
        ! failed to load{detail ? ` — ${detail}` : ''}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="caption shrink-0 cursor-pointer border border-border px-2 py-1 text-text-3 transition-colors duration-150 ease-out-200 hover:border-danger hover:text-danger"
        >
          RETRY
        </button>
      )}
    </div>
  )
}
