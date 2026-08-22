'use client'

import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from 'next-themes'
import { transition } from '@/lib/motion'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="drexit-theme"
      disableTransitionOnChange
    >
      {/*
        `reducedMotion="user"` drops transform and layout animation for anyone
        who asked the OS for less motion, while keeping opacity, so the app
        stays legible rather than going inert. `transition` makes the house
        curve the default for every motion component that does not override it.
      */}
      <MotionConfig reducedMotion="user" transition={transition}>
        {children}
      </MotionConfig>
    </ThemeProvider>
  )
}
