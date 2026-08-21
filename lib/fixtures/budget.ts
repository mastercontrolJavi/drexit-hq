import type { BudgetCategory } from '@/types'
import {
  NOW,
  TODAY_DOM,
  between,
  chance,
  daysInMonth,
  iso,
  isoTime,
  monthKey,
  monthStart,
  pick,
  rng,
} from './clock'

/**
 * Six rolling months of spend: five complete, plus the current month up to
 * today. Generated rather than hand-written so the demo always shows a month
 * in flight — a hardcoded set goes stale the moment the calendar moves past it.
 */

const MONTHS_BACK = 5

interface Recurring {
  day: number
  category: BudgetCategory
  description: string
  base: number
  /** Fractional wobble month to month. Kept under 30% so the RECURRING tab
   *  still detects these as commitments rather than one-offs. */
  drift: number
}

/** Fixed monthly commitments. Descriptions are identical month to month by
 *  design — that is what the recurring detector keys on. */
const RECURRING: Recurring[] = [
  { day: 1,  category: 'Rent',           description: 'Monthly rent — Zone 3 flatshare', base: 800,   drift: 0 },
  { day: 1,  category: 'Health',         description: 'PureGym membership',              base: 31.99, drift: 0 },
  { day: 2,  category: 'Transportation', description: 'TfL monthly travelcard',          base: 88.8,  drift: 0 },
  { day: 3,  category: 'Services',       description: 'Council tax',                     base: 118,   drift: 0 },
  { day: 4,  category: 'Utilities',      description: 'EDF Energy — gas & electric',     base: 89,    drift: 0.18 },
  { day: 5,  category: 'Utilities',      description: 'BT Broadband',                    base: 32,    drift: 0 },
  { day: 6,  category: 'Utilities',      description: 'giffgaff mobile',                 base: 18,    drift: 0 },
  { day: 7,  category: 'Subscriptions',  description: 'Spotify + Netflix + Claude Pro',  base: 43.97, drift: 0.04 },
]

const GROCERY_SHOPS = [
  'Tesco weekly shop',
  'Lidl weekly shop',
  "Sainsbury's top-up",
  'Aldi weekly shop',
  'Co-op top-up',
] as const

const EATING_OUT = [
  ['Pret A Manger', 4.2, 9.8],
  ['Dishoom — dinner with Sam', 28, 46],
  ['Local curry house', 16, 27],
  ['Flat white + pastry', 4.6, 7.4],
  ['Franco Manca', 12, 19],
  ['Team lunch — Borough Market', 11, 18],
] as const

const ENTERTAINMENT = [
  ['Prince Charles Cinema', 9, 14],
  ['Five-a-side pitch hire', 7, 9],
  ['Gig at Village Underground', 22, 38],
  ['Bouldering day pass', 12, 16],
] as const

const SHOPPING = [
  ['Uniqlo — basics restock', 28, 62],
  ['Running shoes', 68, 96],
  ['Muji — desk bits', 14, 34],
  ['Birthday gift — Mum', 25, 45],
] as const

const HEALTH_ONEOFF = [
  ['Boots — vitamins & protein', 18, 34],
  ['Dentist check-up', 25, 45],
  ['Physio session', 40, 55],
] as const

/** The one big month — a Lisbon long weekend three months back. Gives the
 *  cash-flow chart real shape instead of six near-identical bars. */
const TRIP_MONTH = 3
const TRIP: Array<[BudgetCategory, string, number, number]> = [
  ['Travel', 'Lisbon flights — return', 118, 118],
  ['Travel', 'Lisbon — Airbnb 3 nights', 164, 164],
  ['Restaurants', 'Lisbon — food & drink', 96, 96],
  ['Transportation', 'Airport transfers', 34, 34],
]

interface Entry {
  id: string
  date: string
  category: BudgetCategory
  description: string | null
  amount_gbp: number
  month_key: string
  created_at: string
}

function buildMonth(monthsBack: number): Entry[] {
  const start = monthStart(monthsBack)
  const mk = monthKey(start)
  const isCurrent = monthsBack === 0
  const lastDay = isCurrent ? TODAY_DOM : daysInMonth(start)
  // Seed from the month itself so each month is stable but distinct.
  const r = rng(start.getFullYear() * 100 + start.getMonth() + 7)
  const out: Entry[] = []

  const push = (
    day: number,
    category: BudgetCategory,
    description: string,
    amount: number,
    hour = 12,
  ) => {
    if (day > lastDay) return
    const d = new Date(start.getFullYear(), start.getMonth(), day)
    out.push({
      id: `be-${mk}-${String(out.length + 1).padStart(2, '0')}`,
      date: iso(d),
      category,
      description,
      amount_gbp: Math.round(amount * 100) / 100,
      month_key: mk,
      created_at: isoTime(d, hour),
    })
  }

  for (const c of RECURRING) {
    const amount = c.drift ? between(r, c.base * (1 - c.drift), c.base * (1 + c.drift)) : c.base
    push(c.day, c.category, c.description, amount, 8)
  }

  // Variable spend lands anywhere in the month *so far*. Drawing from a fixed
  // 1–27 window under-fills the current month, since anything past today is
  // dropped — which is how the Shopping budget card ended up reading £0.
  const anyDay = () => 1 + Math.floor(r() * lastDay)

  // Weekly groceries, drifting a day or two each week like a real shop does.
  for (let week = 0; week < 5; week++) {
    const day = 3 + week * 7 + Math.floor(r() * 3)
    push(day, 'Groceries', pick(r, GROCERY_SHOPS), between(r, 34, 58), 18)
  }

  // Eating out — the most variable line in anyone's budget.
  const meals = 5 + Math.floor(r() * 4)
  for (let i = 0; i < meals; i++) {
    const [name, lo, hi] = pick(r, EATING_OUT)
    push(anyDay(), 'Restaurants', name, between(r, lo, hi), 13)
  }

  // Contactless top-ups on top of the travelcard.
  for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
    push(anyDay(), 'Transportation', 'Contactless top-up', between(r, 6, 15), 9)
  }

  if (chance(r, 0.85)) {
    const [name, lo, hi] = pick(r, ENTERTAINMENT)
    push(anyDay(), 'Entertainment', name, between(r, lo, hi), 20)
  }
  if (chance(r, 0.7)) {
    const [name, lo, hi] = pick(r, SHOPPING)
    push(anyDay(), 'Shopping', name, between(r, lo, hi), 15)
  }
  if (chance(r, 0.5)) {
    const [name, lo, hi] = pick(r, HEALTH_ONEOFF)
    push(anyDay(), 'Health', name, between(r, lo, hi), 11)
  }
  if (chance(r, 0.4)) {
    push(anyDay(), 'Cash', 'ATM withdrawal', between(r, 20, 50), 17)
  }

  if (monthsBack === TRIP_MONTH) {
    let day = 11
    for (const [category, description, lo, hi] of TRIP) {
      push(day, category, description, between(r, lo, hi), 10)
      day += 1
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export const budgetEntries: Entry[] = Array.from(
  { length: MONTHS_BACK + 1 },
  (_, i) => buildMonth(MONTHS_BACK - i),
).flat()

// ── Savings ───────────────────────────────────────────────────────────────────

interface SavingsTx {
  id: string
  goal_id: string
  amount: number
  type: 'manual' | 'budget_link'
  note: string | null
  linked_entry_id: string | null
  date: string
  created_at: string
}

/** Monthly deposits per goal, oldest first. `current_amount` is derived from
 *  these rather than stated separately, so the progress bar and the HISTORY
 *  drawer can never disagree. */
const DEPOSIT_PLAN: Array<{
  id: string
  name: string
  target: number
  monthly: number
  since: number
  deadlineMonths: number
  note: string
}> = [
  { id: 'sg-1', name: 'Move-out fund',      target: 4000, monthly: 260, since: 5, deadlineMonths: 8,  note: 'Monthly transfer' },
  { id: 'sg-2', name: 'Emergency fund',     target: 2000, monthly: 120, since: 5, deadlineMonths: 12, note: 'Standing order' },
  { id: 'sg-3', name: 'Japan trip — spring', target: 2600, monthly: 180, since: 4, deadlineMonths: 9,  note: 'Trip fund' },
  { id: 'sg-4', name: 'MacBook Pro M4',     target: 2499, monthly: 200, since: 3, deadlineMonths: 5,  note: 'Kit upgrade' },
]

const txs: SavingsTx[] = []
for (const plan of DEPOSIT_PLAN) {
  const r = rng(plan.id.charCodeAt(3) * 977)
  for (let m = plan.since; m >= 0; m--) {
    const start = monthStart(m)
    const day = 26
    if (m === 0 && TODAY_DOM < day) continue
    const d = new Date(start.getFullYear(), start.getMonth(), day)
    txs.push({
      id: `st-${plan.id}-${monthKey(start)}`,
      goal_id: plan.id,
      amount: Math.round(between(r, plan.monthly * 0.85, plan.monthly * 1.15)),
      type: 'manual',
      note: plan.note,
      linked_entry_id: null,
      date: iso(d),
      created_at: isoTime(d, 20),
    })
  }
}

export const savingsTransactions: SavingsTx[] = txs.sort((a, b) =>
  a.date.localeCompare(b.date),
)

export const savingsGoals = DEPOSIT_PLAN.map((plan) => {
  const deadline = new Date(NOW.getFullYear(), NOW.getMonth() + plan.deadlineMonths, 15)
  const created = monthStart(plan.since)
  return {
    id: plan.id,
    name: plan.name,
    target_amount: plan.target,
    current_amount: savingsTransactions
      .filter((t) => t.goal_id === plan.id)
      .reduce((sum, t) => sum + t.amount, 0),
    deadline: iso(deadline),
    created_at: isoTime(created, 10),
  }
})

// ── Budget limits ─────────────────────────────────────────────────────────────
// Previously absent from the mock entirely, so the BUDGETS tab rendered its
// empty state. Set close to real spend so the tab shows a mix of under, near
// and over — which is the only way the warn and danger tones ever appear.

export const budgetLimits = [
  { id: 'bl-1', category: 'Groceries',      monthly_limit: 220, rollover: true,  carryover_amount: 18.4, rollover_applied_month: null },
  { id: 'bl-2', category: 'Restaurants',    monthly_limit: 120, rollover: false, carryover_amount: 0,    rollover_applied_month: null },
  { id: 'bl-3', category: 'Transportation', monthly_limit: 110, rollover: false, carryover_amount: 0,    rollover_applied_month: null },
  { id: 'bl-4', category: 'Entertainment',  monthly_limit: 60,  rollover: true,  carryover_amount: 0,    rollover_applied_month: null },
  { id: 'bl-5', category: 'Shopping',       monthly_limit: 80,  rollover: false, carryover_amount: 0,    rollover_applied_month: null },
  { id: 'bl-6', category: 'Utilities',      monthly_limit: 150, rollover: false, carryover_amount: 0,    rollover_applied_month: null },
]

// ── App settings ──────────────────────────────────────────────────────────────

export const appSettings = [
  { key: 'monthly_income', value: '2400', updated_at: isoTime(monthStart(0), 0) },
  {
    key: 'weekly_focus',
    value: 'Ship the AXIS_OS demo · lock Japan dates · hold the deficit through the weekend',
    updated_at: isoTime(NOW, 8),
  },
]
