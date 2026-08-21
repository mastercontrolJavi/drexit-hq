import { NOW, addDays, iso, isoTime } from './clock'
import type { GoalCategory, GoalStatus } from '@/types'

/**
 * Deadlines are expressed as an offset in days from today, so the goal board
 * always shows the full range of deadline tones the UI can render: overdue in
 * danger, inside 30 days in warn, further out in success, and completed goals
 * with no countdown at all. Fixed dates collapse to a single tone over time.
 */
const GOALS: Array<{
  title: string
  description: string | null
  category: GoalCategory
  status: GoalStatus
  progress: number
  /** Negative = already passed. null = no deadline set. */
  deadlineInDays: number | null
  /** Whether to show a target quarter. The label is derived from the deadline
   *  rather than stated separately, so the two can never disagree. */
  quarter: boolean
  notes: string | null
  createdDaysAgo: number
}> = [
  // ── Complete ───────────────────────────────────────────────────────────────
  {
    title: 'Ship AXIS_OS v1',
    description: 'Full-stack personal command centre: budget, goals, fitness, ideas.',
    category: 'Business', status: 'done', progress: 100,
    deadlineInDays: -128, quarter: true,
    notes: 'Shipped on schedule. Demo mode and the public write-up came after.',
    createdDaysAgo: 240,
  },
  {
    title: 'Read 12 books this year',
    description: null,
    category: 'Creative', status: 'done', progress: 100,
    deadlineInDays: -46, quarter: false,
    notes: 'Finished #12 early. Best three: Shape Up, The Creative Act, Slow Productivity.',
    createdDaysAgo: 300,
  },
  {
    title: 'Build a 3-month emergency fund',
    description: 'Enough runway to leave a job without a plan lined up.',
    category: 'Life', status: 'done', progress: 100,
    deadlineInDays: -21, quarter: false,
    notes: 'Hit £2,000 in July. Rolling the standing order into the move-out fund.',
    createdDaysAgo: 190,
  },

  // ── Overdue — the danger tone ──────────────────────────────────────────────
  {
    title: 'Launch the first paid digital product',
    description: 'One product, priced, live, with a real checkout — not another prototype.',
    category: 'Business', status: 'in_progress', progress: 70,
    deadlineInDays: -6, quarter: true,
    notes: 'Rate calculator is built. Blocked on the landing page, which is on me.',
    createdDaysAgo: 120,
  },

  // ── Due soon — the warn tone ───────────────────────────────────────────────
  {
    title: 'Publish the AXIS_OS case study',
    description: 'Write-up with screenshots, architecture notes and the demo link.',
    category: 'Creative', status: 'in_progress', progress: 45,
    deadlineInDays: 9, quarter: true,
    notes: 'Draft exists. Needs the demo finished before the screenshots are worth taking.',
    createdDaysAgo: 34,
  },
  {
    title: 'Reach 195 lbs',
    description: 'Next marker on the way to 170.',
    category: 'Fitness', status: 'in_progress', progress: 72,
    deadlineInDays: 24, quarter: false,
    notes: 'On pace at roughly 0.9 lb/week. The daily weigh-in habit is what fixed it.',
    createdDaysAgo: 160,
  },

  // ── Comfortable runway — the success tone ──────────────────────────────────
  {
    title: 'Save £4,000 for the move',
    description: 'Deposit, first month and a buffer, without touching the emergency fund.',
    category: 'Life', status: 'in_progress', progress: 41,
    deadlineInDays: 232, quarter: true,
    notes: '£260/month standing order. Ahead of schedule since the Lisbon trip was paid off.',
    createdDaysAgo: 158,
  },
  {
    title: 'Land a remote role or £2,000/mo from the business',
    description: 'Either path works. The point is not being tied to one city.',
    category: 'Career', status: 'in_progress', progress: 30,
    deadlineInDays: 128, quarter: true,
    notes: 'Two interviews in the pipeline. Product income is at £180/mo — long way to go.',
    createdDaysAgo: 200,
  },
  {
    title: 'Post 24 videos to the Still.AI channel',
    description: 'Two a month, every month, regardless of how they perform.',
    category: 'Creative', status: 'in_progress', progress: 58,
    deadlineInDays: 160, quarter: true,
    notes: '14 published. The batching approach is the only reason this is still alive.',
    createdDaysAgo: 210,
  },
  {
    title: 'Reach 170 lbs',
    description: 'Goal weight. Roughly 33 lbs to go at the current pace.',
    category: 'Fitness', status: 'in_progress', progress: 39,
    deadlineInDays: 290, quarter: true,
    notes: 'Trend line puts this in spring if the deficit holds through winter.',
    createdDaysAgo: 165,
  },

  // ── Not started ────────────────────────────────────────────────────────────
  {
    title: 'Two weeks in Japan',
    description: 'Tokyo, Kyoto, Osaka. Booked and paid for from the trip fund, not credit.',
    category: 'Life', status: 'not_started', progress: 0,
    deadlineInDays: 268, quarter: true,
    notes: 'Fund is at £720 of £2,600. Flights need booking before the fare window closes.',
    createdDaysAgo: 92,
  },
  {
    title: 'Get two business ideas to a working MVP',
    description: 'Not mockups. Something a stranger can use without me in the room.',
    category: 'Business', status: 'not_started', progress: 0,
    deadlineInDays: 200, quarter: true,
    notes: null,
    createdDaysAgo: 88,
  },
  {
    title: 'Learn enough Japanese to order dinner',
    description: null,
    category: 'Creative', status: 'not_started', progress: 0,
    deadlineInDays: null, quarter: false,
    notes: 'No deadline on purpose — this one is meant to be pressure-free.',
    createdDaysAgo: 40,
  },
]

function quarterLabel(deadline: Date): string {
  return `Q${Math.floor(deadline.getMonth() / 3) + 1} ${deadline.getFullYear()}`
}

export const goals = GOALS.map((g, i) => {
  const deadlineDate = g.deadlineInDays === null ? null : addDays(NOW, g.deadlineInDays)
  return {
  id: `goal-${String(i + 1).padStart(2, '0')}`,
  title: g.title,
  description: g.description,
  category: g.category,
  deadline: deadlineDate === null ? null : iso(deadlineDate),
  target_quarter: g.quarter && deadlineDate ? quarterLabel(deadlineDate) : null,
  status: g.status,
  progress_pct: g.progress,
  notes: g.notes,
  created_at: isoTime(addDays(NOW, -g.createdDaysAgo), 10, i),
  }
})

/** Referenced by the ticker so its goal counter cannot drift from the board. */
export const GOALS_DONE = goals.filter((g) => g.status === 'done').length
export const GOALS_TOTAL = goals.length
