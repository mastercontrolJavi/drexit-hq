'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render the resolved label after mount.
  useEffect(() => setMounted(true), [])

  const label = mounted ? (resolvedTheme === 'dark' ? 'DARK' : 'LIGHT') : '...'

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="caption flex w-full items-center justify-between border border-border px-3 py-2 text-text-2 transition-colors duration-200 ease-out-200 hover:border-border-strong hover:bg-bg-hover hover:text-text-1"
      aria-label="Toggle theme"
    >
      <span>THEME</span>
      <span className="text-text-1">{label}</span>
    </button>
  )
}
