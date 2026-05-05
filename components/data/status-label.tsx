import { cn } from '@/lib/utils'

export type Status = 'not_started' | 'in_progress' | 'done'

const STATUS_LABEL: Record<Status, string> = {
  not_started: 'NOT_STARTED',
  in_progress: 'IN_PROGRESS',
  done:        'COMPLETE',
}

const STATUS_CLASS: Record<Status, string> = {
  not_started: 'text-text-3',
  in_progress: 'text-accent',
  done:        'text-success',
}

interface StatusLabelProps {
  status: Status
  className?: string
}

export function StatusLabel({ status, className }: StatusLabelProps) {
  return (
    <span
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.08em]',
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
