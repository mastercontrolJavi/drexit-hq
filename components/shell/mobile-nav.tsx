'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Wallet, Target, Dumbbell, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Daily HQ', icon: LayoutDashboard },
  { href: '/budget',    label: 'Budget',   icon: Wallet },
  { href: '/goals',     label: 'Goals',    icon: Target },
  { href: '/fitness',   label: 'Fitness',  icon: Dumbbell },
  { href: '/business',  label: 'Ideas',    icon: Lightbulb },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-40 flex h-14 items-stretch border-t border-border bg-bg-elevated md:hidden"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-200',
              isActive ? 'text-accent' : 'text-text-3'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] leading-[12px]">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
