'use client'

import { useEffect, useState } from 'react'
import { getTickerItems, formatTickerLine } from '@/lib/ticker-config'

export function Ticker() {
  const [line, setLine] = useState(() => formatTickerLine(getTickerItems()))

  useEffect(() => {
    const tick = () => setLine(formatTickerLine(getTickerItems()))
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  // Duplicate the content so the marquee can loop seamlessly via -50% translate.
  const content = `${line}  ·  ${line}  ·  `

  return (
    <div
      className="ticker hairline-x flex h-6 md:h-8 items-center overflow-hidden bg-bg-base"
      role="marquee"
      aria-label="Live system ticker"
    >
      <div className="animate-ticker flex shrink-0 whitespace-nowrap">
        <span className="caption px-4 text-text-3">{content}</span>
        <span className="caption px-4 text-text-3" aria-hidden>{content}</span>
      </div>
    </div>
  )
}
