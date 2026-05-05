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
    <aside className="flex h-screen w-[200px] shrink-0 flex-col border-r border-border bg-bg-base">
      {/* Wordmark */}
      <div className="px-4 pt-5 pb-6">
        <div
          className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-text-1"
          aria-label="AXIS_OS"
        >
          AXIS_OS
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
