'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  Target,
  Dumbbell,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
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
  const [collapsed, setCollapsed] = useState(false)

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-ios-gray-6 bg-white transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center pt-6 pb-4', collapsed ? 'justify-center px-2' : 'justify-between px-6')}>
        {collapsed ? (
          <span className="text-lg font-bold text-foreground">D</span>
        ) : (
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">
              DREXIT HQ
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Command Center</p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'rounded-lg p-1.5 text-muted-foreground hover:bg-ios-gray-6 hover:text-foreground transition-colors',
            collapsed && 'mt-2'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
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
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-[10px] py-2.5 text-[15px] font-medium transition-all duration-200',
                    collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                    isActive
                      ? 'bg-[rgba(0,122,255,0.1)] text-ios-blue'
                      : 'text-secondary-foreground hover:bg-ios-gray-6'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-[20px] w-[20px] shrink-0',
                      isActive ? 'text-ios-blue' : 'text-muted-foreground'
                    )}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  {!collapsed && (
                    <>
                      {item.label}
                      {isActive && (
                        <span className="ml-auto h-[6px] w-[6px] rounded-full bg-ios-blue" />
                      )}
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Countdown Widget */}
      {!collapsed && (
        <div className="p-4">
          <Countdown />
        </div>
      )}
    </aside>
  )
}
