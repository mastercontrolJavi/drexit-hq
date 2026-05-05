'use client'

import { useEffect } from 'react'

type Modifier = 'meta' | 'ctrl' | 'alt' | 'shift'

interface ShortcutOptions {
  key: string
  modifiers?: Modifier[]
  /** When true, fires on either ⌘ or Ctrl. Useful for ⌘K / Ctrl+K. */
  metaOrCtrl?: boolean
  preventDefault?: boolean
}

export function useKeyboardShortcut(
  opts: ShortcutOptions,
  handler: (e: KeyboardEvent) => void
) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== opts.key.toLowerCase()) return

      if (opts.metaOrCtrl && !(e.metaKey || e.ctrlKey)) return

      if (opts.modifiers) {
        for (const m of opts.modifiers) {
          if (m === 'meta' && !e.metaKey) return
          if (m === 'ctrl' && !e.ctrlKey) return
          if (m === 'alt' && !e.altKey) return
          if (m === 'shift' && !e.shiftKey) return
        }
      }

      if (opts.preventDefault) e.preventDefault()
      handler(e)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [opts.key, opts.metaOrCtrl, opts.preventDefault, opts.modifiers, handler])
}
