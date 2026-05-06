'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  ArrowRight,
  Command,
  Dumbbell,
  LayoutDashboard,
  Lightbulb,
  type LucideIcon,
  Moon,
  Plus,
  Sun,
  Target,
  Wallet,
} from 'lucide-react'
import { useKeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcut'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  label: string
  hint?: string
  group: 'navigate' | 'actions' | 'system'
  icon: LucideIcon
  run: (ctx: CommandContext) => void
  keywords?: string
}

interface CommandContext {
  router: ReturnType<typeof useRouter>
  setTheme: (t: string) => void
  resolvedTheme?: string
  close: () => void
}

const COMMANDS: Command[] = [
  { id: 'nav-dashboard', group: 'navigate', label: 'Go to Daily HQ',  hint: '/dashboard', icon: LayoutDashboard, keywords: 'daily hq dashboard home', run: ({ router, close }) => { router.push('/dashboard'); close() } },
  { id: 'nav-budget',    group: 'navigate', label: 'Go to Budget',    hint: '/budget',    icon: Wallet,           keywords: 'budget finance money expenses', run: ({ router, close }) => { router.push('/budget'); close() } },
  { id: 'nav-goals',     group: 'navigate', label: 'Go to Goals',     hint: '/goals',     icon: Target,           keywords: 'goals timeline objectives', run: ({ router, close }) => { router.push('/goals'); close() } },
  { id: 'nav-fitness',   group: 'navigate', label: 'Go to Fitness',   hint: '/fitness',   icon: Dumbbell,         keywords: 'fitness weight macros', run: ({ router, close }) => { router.push('/fitness'); close() } },
  { id: 'nav-business',  group: 'navigate', label: 'Go to Ideas',     hint: '/business',  icon: Lightbulb,        keywords: 'business ideas kanban', run: ({ router, close }) => { router.push('/business'); close() } },

  { id: 'add-expense',   group: 'actions',  label: 'Add expense',     hint: '/budget',    icon: Plus,             keywords: 'log spend money', run: ({ router, close }) => { router.push('/budget?action=add-expense'); close() } },
  { id: 'log-weight',    group: 'actions',  label: 'Log weight',      hint: '/fitness',   icon: Plus,             keywords: 'fitness scale weigh', run: ({ router, close }) => { router.push('/fitness?action=log-weight'); close() } },
  { id: 'add-idea',      group: 'actions',  label: 'Add idea',        hint: '/business',  icon: Plus,             keywords: 'kanban startup', run: ({ router, close }) => { router.push('/business?action=add-idea'); close() } },

  { id: 'theme-toggle',  group: 'system',   label: 'Toggle theme',    hint: 'dark / light', icon: Moon,           keywords: 'dark light mode appearance', run: ({ setTheme, resolvedTheme }) => { setTheme(resolvedTheme === 'dark' ? 'light' : 'dark') } },
]

const GROUP_LABELS: Record<Command['group'], string> = {
  navigate: 'NAVIGATE',
  actions: 'ACTIONS',
  system: 'SYSTEM',
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()

  useKeyboardShortcut(
    { key: 'k', metaOrCtrl: true, preventDefault: true },
    () => setOpen((o) => !o)
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      // base-ui dialog also handles focus trap; we manage our own here.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter((c) =>
      `${c.label} ${c.keywords ?? ''}`.toLowerCase().includes(q)
    )
  }, [query])

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filtered[activeIdx]
      if (cmd) cmd.run({ router, setTheme, resolvedTheme, close: () => setOpen(false) })
    }
  }

  let runningIdx = -1

  return (
    <>
      {/* Mobile FAB — opens command palette on touch */}
      <button
        className="mobile-fab fixed right-4 z-30 flex h-11 w-11 items-center justify-center border border-border bg-bg-elevated md:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open command palette"
      >
        <Command className="h-[18px] w-[18px] text-text-2" strokeWidth={1.5} />
      </button>

      {open && (
      <div
        className="fixed inset-0 z-[90] flex items-start justify-center pt-[14vh]"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false)
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/40 supports-[backdrop-filter]:bg-black/30 supports-[backdrop-filter]:backdrop-blur-md"
      />
      <div className="relative w-full max-w-xl border border-border-strong bg-bg-elevated">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="> type a command..."
          className="block w-full bg-transparent px-4 py-3.5 font-mono text-sm text-text-1 placeholder:text-text-3 focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="hairline-x" />
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="caption px-4 py-6 text-center text-text-3">no results</div>
          )}
          {(['navigate', 'actions', 'system'] as const).map((group) => {
            const groupCmds = filtered.filter((c) => c.group === group)
            if (groupCmds.length === 0) return null
            return (
              <div key={group} className="py-1">
                <div className="caption px-4 py-1 text-text-3">{GROUP_LABELS[group]}</div>
                <ul>
                  {groupCmds.map((cmd) => {
                    runningIdx += 1
                    const isActive = runningIdx === activeIdx
                    const Icon = cmd.icon
                    const ThemeIcon = cmd.id === 'theme-toggle' && resolvedTheme === 'dark' ? Sun : Moon
                    const ResolvedIcon = cmd.id === 'theme-toggle' ? ThemeIcon : Icon
                    return (
                      <li key={cmd.id}>
                        <button
                          onMouseEnter={() => setActiveIdx(runningIdx)}
                          onClick={() =>
                            cmd.run({ router, setTheme, resolvedTheme, close: () => setOpen(false) })
                          }
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-200 ease-out-200',
                            isActive ? 'bg-bg-hover text-text-1' : 'text-text-2 hover:bg-bg-hover'
                          )}
                        >
                          <ResolvedIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                          <span className="flex-1 text-sm">{cmd.label}</span>
                          {cmd.hint && (
                            <span className="caption text-text-3">{cmd.hint}</span>
                          )}
                          {isActive && <ArrowRight className="h-3 w-3 text-text-3" strokeWidth={1.5} />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
        <div className="hairline-x" />
        <div className="flex items-center justify-between px-4 py-2">
          <span className="caption text-text-3">AXIS_OS</span>
          <span className="caption text-text-3">↵ select &nbsp; ↑↓ navigate &nbsp; esc close</span>
        </div>
      </div>
    </div>
      )}
    </>
  )
}
