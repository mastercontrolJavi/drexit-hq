import { cn } from '@/lib/utils'

/**
 * The section shell every data surface uses: hairline border, elevated
 * ground, a header rule at 10px vertical.
 *
 * It existed as two dozen inline copies — consistent by luck, with three
 * outliers that had already drifted. This makes it consistent by
 * construction, so the next surface added to the app cannot drift either.
 */
export function Panel({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn('border border-border bg-bg-elevated', className)}
      {...props}
    />
  )
}

function PanelHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 border-b border-border px-4 py-2.5',
        className,
      )}
      {...props}
    />
  )
}

/** Left-hand label. 11px tracked mono, the app's section voice. */
function PanelTitle({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('caption min-w-0 truncate text-text-2', className)} {...props} />
}

/** Right-hand readout — counts, totals, units. */
function PanelMeta({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('caption shrink-0 text-text-3', className)} {...props} />
}

function PanelBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-4', className)} {...props} />
}

Panel.Header = PanelHeader
Panel.Title = PanelTitle
Panel.Meta = PanelMeta
Panel.Body = PanelBody
