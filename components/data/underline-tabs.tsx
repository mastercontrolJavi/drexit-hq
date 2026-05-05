'use client'

import { cn } from '@/lib/utils'

export interface UnderlineTabOption<T extends string = string> {
  value: T
  label: string
  hint?: string
}

interface UnderlineTabsProps<T extends string = string> {
  options: UnderlineTabOption<T>[]
  value: T
  onChange: (next: T) => void
  className?: string
  /** Render a horizontally scrollable strip with snap. */
  scroll?: boolean
}

/**
 * Underlined-word tab strip. Active = single underlined word. No pills,
 * no fills. Used as month switcher and as filter tabs.
 */
export function UnderlineTabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
  scroll = false,
}: UnderlineTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-end gap-6 border-b border-border',
        scroll && 'overflow-x-auto snap-x snap-mandatory',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'caption shrink-0 snap-start pb-2 transition-colors duration-200 ease-out-200',
              active
                ? 'text-text-1 border-b border-text-1 -mb-px'
                : 'text-text-3 hover:text-text-1',
            )}
          >
            {opt.label}
            {opt.hint && (
              <span className="ml-1.5 text-text-3 normal-case tracking-normal">
                {opt.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
