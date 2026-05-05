import { daysUntilDrexit } from './utils'

export interface TickerItem {
  label: string
  value: string
}

/**
 * Ticker values are computed at render time. Some are wired to live data sources
 * (daysUntilDrexit). Others are placeholders that will be replaced by live
 * Supabase reads in later milestones (weight, runway, goals counts).
 */
export function getTickerItems(): TickerItem[] {
  const sync = new Date().toISOString().slice(11, 16) // HH:MM UTC

  return [
    { label: 'DREXIT_T', value: `-${daysUntilDrexit()}` },
    { label: 'RUNWAY',   value: '£1,484' },
    { label: 'WEIGHT',   value: '222.4 LBS (-17.6 YTD)' },
    { label: 'GOALS',    value: '1/12' },
    { label: 'IDEAS',    value: '8' },
    { label: 'STREAK',   value: '23D' },
    { label: 'SYNC',     value: `${sync} UTC` },
  ]
}

export function formatTickerLine(items: TickerItem[]): string {
  return items.map((i) => `${i.label} ${i.value}`).join('  ·  ')
}
