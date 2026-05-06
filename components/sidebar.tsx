'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  Target,
  Dumbbell,
  Lightbulb,
} from 'lucide-react'
import { Countdown } from './countdown'
import { ThemeToggle } from './shell/theme-toggle'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'DAILY_HQ', icon: LayoutDashboard },
  { href: '/budget',    label: 'BUDGET',   icon: Wallet },
  { href: '/goals',     label: 'GOALS',    icon: Target },
  { href: '/fitness',   label: 'FITNESS',  icon: Dumbbell },
  { href: '/business',  label: 'IDEAS',    icon: Lightbulb },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex h-screen w-[200px] shrink-0 flex-col border-r border-border bg-bg-base">
      {/* Wordmark */}
      <div className="px-4 pt-5 pb-6">
        <div className="flex items-center gap-2" aria-label="AXIS_OS">
          {/* Crosshair axis mark */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="shrink-0 text-text-1"
            aria-hidden="true"
          >
            <line x1="9" y1="1" x2="9" y2="17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="1" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="9" cy="9" r="2.2" fill="currentColor"/>
            <line x1="1" y1="7" x2="1" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="17" y1="7" x2="17" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="7" y1="1" x2="11" y2="1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="7" y1="17" x2="11" y2="17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-text-1">
            AXIS_OS
          </span>
        </div>
        <div className="caption mt-1 text-text-3">v1.0.0 · COMMAND CTR</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2">
        <ul className="space-y-px">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-2.5 px-3 py-2 transition-colors duration-200 ease-out-200',
                    isActive
                      ? 'text-text-1'
                      : 'text-text-2 hover:bg-bg-hover hover:text-text-1'
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-y-1 left-0 w-px bg-accent"
                    />
                  )}
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span className="caption !text-current">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom block: countdown + theme toggle */}
      <div className="space-y-2 px-3 pb-3">
        <Countdown />
        <ThemeToggle />
      </div>
    </aside>
  )
}
