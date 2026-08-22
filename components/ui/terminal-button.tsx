'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { DUR, EASE_OUT } from '@/lib/motion'

/**
 * The app's own button. `components/ui/button.tsx` is stock shadcn. It carries
 * pill radii, rings and shadows the design system does not use, and no screen
 * imports it. This is the one the screens actually use: hairline border, 4px
 * radius, 11px tracked mono label.
 *
 * `md` is intentionally taller on touch (py-3 → 44px) and tightens on desktop.
 */
const terminalButtonVariants = cva(
  'caption inline-flex shrink-0 select-none items-center justify-center gap-1.5 border text-center transition-colors duration-150 ease-out-200 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'border-text-1 bg-text-1 text-bg-base hover:bg-bg-base hover:text-text-1',
        ghost:
          'border-border bg-transparent text-text-2 hover:border-text-1 hover:bg-bg-hover hover:text-text-1',
        danger:
          'border-border bg-transparent text-text-2 hover:border-danger hover:text-danger',
      },
      size: {
        sm: 'px-2 py-1',
        md: 'px-3 py-3 md:py-2',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

export interface TerminalButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof terminalButtonVariants> {
  children?: React.ReactNode
}

export function TerminalButton({
  className,
  variant,
  size,
  block,
  type = 'button',
  disabled,
  ...props
}: TerminalButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: DUR.press, ease: EASE_OUT }}
      className={cn(terminalButtonVariants({ variant, size, block }), className)}
      {...props}
    />
  )
}

export { terminalButtonVariants }
