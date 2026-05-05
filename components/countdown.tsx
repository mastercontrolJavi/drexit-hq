'use client'

import { useEffect, useState } from 'react'
import { daysUntilDrexit } from '@/lib/utils'

export function Countdown() {
  const [days, setDays] = useState(daysUntilDrexit())

  useEffect(() => {
    const interval = setInterval(() => setDays(daysUntilDrexit()), 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="border border-border px-3 py-2.5">
      <div className="caption text-text-3">LAST DAY · UK</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="num-display text-[24px] leading-none text-text-1">{days}</span>
        <span className="caption text-text-3">DAYS</span>
      </div>
    </div>
  )
}
