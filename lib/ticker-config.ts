import { daysUntilDrexit, formatCurrencyShort } from './utils'
import { isDemoMode } from './demo'
import * as fixtures from './fixtures'
import { CURRENT_WEIGHT, START_WEIGHT_LBS } from './fixtures/fitness'
import { GOALS_DONE, GOALS_TOTAL } from './fixtures/goals'
import { IDEA_COUNT } from './fixtures/ideas'
import { getCurrentMonthKey } from './utils'
import { DEFAULT_MONTHLY_INCOME } from '@/types'

export interface TickerItem {
  label: string
  value: string
}

/**
 * The ticker used to carry hardcoded figures — RUNWAY £1,484, GOALS 1/12,
 * WEIGHT 222.4 — none of which matched the data the rest of the app was
 * rendering. In demo mode it now reads from the same fixtures every other
 * surface does, so the strip cannot contradict the screen underneath it.
 */
function demoItems(): TickerItem[] {
  const monthKey = getCurrentMonthKey()
  const income = Number(
    fixtures.appSettings.find((s) => s.key === 'monthly_income')?.value ??
      DEFAULT_MONTHLY_INCOME,
  )
  const spent = fixtures.budgetEntries
    .filter((e) => e.month_key === monthKey)
    .reduce((sum, e) => sum + e.amount_gbp, 0)

  const saved = fixtures.savingsGoals.reduce((sum, g) => sum + g.current_amount, 0)
  const lost = Math.round((START_WEIGHT_LBS - CURRENT_WEIGHT) * 10) / 10
  const streakDays = 22

  return [
    { label: 'DREXIT_T', value: `-${daysUntilDrexit()}` },
    { label: 'RUNWAY',   value: formatCurrencyShort(income - spent) },
    { label: 'SAVED',    value: formatCurrencyShort(saved) },
    { label: 'WEIGHT',   value: `${CURRENT_WEIGHT} LBS (-${lost} YTD)` },
    { label: 'GOALS',    value: `${GOALS_DONE}/${GOALS_TOTAL}` },
    { label: 'IDEAS',    value: String(IDEA_COUNT) },
    { label: 'STREAK',   value: `${streakDays}D` },
    { label: 'SYNC',     value: `${new Date().toISOString().slice(11, 16)} UTC` },
  ]
}

/**
 * Live values are computed at render time. Outside demo mode the non-countdown
 * figures are still placeholders pending live Supabase reads.
 */
export function getTickerItems(): TickerItem[] {
  if (isDemoMode) return demoItems()

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
