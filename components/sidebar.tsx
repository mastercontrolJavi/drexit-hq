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
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Daily HQ', icon: LayoutDashboard },
  { href: '/budget', label: 'Budget', icon: Wallet },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell },
  { href: '/business', label: 'Ideas', icon: Lightbulb },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-ios-gray-6 bg-white">
      {/* App Name */}
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          DREXIT HQ
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Command Center</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[rgba(0,122,255,0.1)] text-ios-blue'
                      : 'text-secondary-foreground hover:bg-ios-gray-6'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-[20px] w-[20px]',
                      isActive ? 'text-ios-blue' : 'text-muted-foreground'
                    )}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-[6px] w-[6px] rounded-full bg-ios-blue" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Countdown Widget */}
      <div className="p-4">
        <Countdown />
      </div>
    </aside>
  )
}
