'use client'

import { useEffect, useState } from 'react'
import { daysUntilDrexit } from '@/lib/utils'
import { Plane } from 'lucide-react'

export function Countdown() {
  const [days, setDays] = useState(daysUntilDrexit())

  useEffect(() => {
    const interval = setInterval(() => {
      setDays(daysUntilDrexit())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-2xl bg-ios-gray-6 px-4 py-3.5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Plane className="h-3.5 w-3.5" />
        Last Day in UK
      </div>
      <div className="mt-1.5 text-[32px] font-bold leading-none tracking-tight text-foreground">
        {days}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        days until July 24, 2025
      </div>
    </div>
  )
}
