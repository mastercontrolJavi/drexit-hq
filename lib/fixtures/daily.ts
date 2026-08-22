import { NOW, daysAgo, iso, isoTime } from './clock'

const TODAY = iso(NOW)
const YESTERDAY = iso(daysAgo(1))

export const todos = [
  { id: 'todo-1', title: 'Send the AXIS_OS write-up to the portfolio site',    completed: false, created_at: isoTime(NOW, 7, 14) },
  { id: 'todo-2', title: 'Outline the "AI tools for creators" video',          completed: false, created_at: isoTime(daysAgo(1), 18, 30) },
  { id: 'todo-3', title: 'Book Japan flights before the fare window closes',   completed: false, created_at: isoTime(daysAgo(1), 12, 0) },
  { id: 'todo-4', title: 'Email accountant re: self-assessment deadline',      completed: false, created_at: isoTime(daysAgo(2), 9, 45) },
  { id: 'todo-5', title: 'Reply to the freelance enquiry from Marcus',         completed: false, created_at: isoTime(daysAgo(3), 16, 20) },
  { id: 'todo-6', title: 'Cancel the unused Adobe subscription',               completed: false, created_at: isoTime(daysAgo(4), 11, 5) },
]

/**
 * Three of five ticked for today. A demo where everything is done reads as
 * finished and a demo where nothing is reads as abandoned. Mid-progress is
 * the only state that shows the counter, the strike-through and the untouched
 * row all at once.
 */
export const nonNegotiables = [
  { id: 'nn-1', title: 'Morning journal (10 min)',                sort_order: 1, last_completed_date: TODAY,     active: true },
  { id: 'nn-2', title: 'Gym or 10k steps',                        sort_order: 2, last_completed_date: TODAY,     active: true },
  { id: 'nn-3', title: 'No phone before 9am',                     sort_order: 3, last_completed_date: YESTERDAY, active: true },
  { id: 'nn-4', title: '2× deep work blocks (coding or writing)', sort_order: 4, last_completed_date: TODAY,     active: true },
  { id: 'nn-5', title: '8h sleep target',                         sort_order: 5, last_completed_date: YESTERDAY, active: true },
]
