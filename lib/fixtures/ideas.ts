import { daysAgo, iso, isoTime } from './clock'
import type { IdeaDirection, IdeaPriority, IdeaStatus } from '@/types'

/**
 * `updated_at` drives the date stamp on every kanban card, so it is expressed
 * in days-ago rather than fixed dates. Otherwise the board reads as abandoned
 * the moment the calendar moves past it.
 */
const IDEAS: Array<{
  title: string
  description: string
  direction: IdeaDirection
  priority: IdeaPriority
  status: IdeaStatus
  next_action: string
  notes: string | null
  updatedDaysAgo: number
  createdDaysAgo: number
}> = [
  {
    title: 'AXIS_OS personal command centre',
    description: 'Full-stack personal OS: budget tracker, goal board, fitness log and idea kanban in one dense terminal-style shell.',
    direction: 'SaaS', priority: 'high', status: 'live',
    next_action: 'Ship the public demo and write the case study',
    notes: 'Next.js 14, Supabase, Tailwind. Demo mode runs off fixtures so it needs no credentials.',
    updatedDaysAgo: 0, createdDaysAgo: 210,
  },
  {
    title: 'Still.AI video generator for creators',
    description: 'Turn a text prompt into short-form video. Target: creators who want volume without an editor.',
    direction: 'AI Tools', priority: 'high', status: 'building',
    next_action: 'Get the v2 prototype to two minutes end-to-end',
    notes: 'Runway Gen-3 API for the render step. Biggest unknown is cost per minute at scale.',
    updatedDaysAgo: 1, createdDaysAgo: 96,
  },
  {
    title: 'Freelance rate calculator',
    description: 'Interactive tool that prices projects from a target annual income, working weeks and overhead.',
    direction: 'Digital Products', priority: 'medium', status: 'building',
    next_action: 'Design the landing page, set up Gumroad at £9',
    notes: 'Small enough to finish in a weekend. Good SEO surface.',
    updatedDaysAgo: 3, createdDaysAgo: 61,
  },
  {
    title: 'Newsletter monetisation hub',
    description: 'One dashboard consolidating sponsorship bookings, paid subscriptions and tip jars for independent writers.',
    direction: 'SaaS', priority: 'medium', status: 'researching',
    next_action: 'Survey 50 newsletter writers on current pain points',
    notes: 'Crowded space. Needs a wedge, probably sponsorships, which nobody handles well.',
    updatedDaysAgo: 5, createdDaysAgo: 74,
  },
  {
    title: 'AI meeting notes summariser',
    description: 'Auto-summarise Zoom and Google Meet calls into action items with owner tagging.',
    direction: 'AI Tools', priority: 'medium', status: 'researching',
    next_action: 'Validate the pain point with 10 potential users before writing code',
    notes: 'Otter and Fireflies already own this. Only worth it with a real differentiator.',
    updatedDaysAgo: 8, createdDaysAgo: 55,
  },
  {
    title: 'Notion productivity template pack',
    description: 'Eight templates covering goal tracking, weekly reviews, content calendars and habit systems.',
    direction: 'Digital Products', priority: 'medium', status: 'live',
    next_action: 'Drive traffic via Pinterest boards and r/Notion',
    notes: 'Shipped at £19. Slow but genuinely passive, 3 or 4 sales a week with no upkeep.',
    updatedDaysAgo: 11, createdDaysAgo: 168,
  },
  {
    title: 'Twitter/X growth playbook (PDF)',
    description: '49-page guide on growing 0 → 5k followers with reply strategy, hooks and posting cadence.',
    direction: 'Content', priority: 'low', status: 'live',
    next_action: 'Refresh for the 2026 algorithm changes and re-launch at £19',
    notes: 'Sold 61 copies at £12. Worth a second edition rather than a new product.',
    updatedDaysAgo: 16, createdDaysAgo: 240,
  },
  {
    title: 'YouTube thumbnail A/B tester',
    description: 'Upload two thumbnail variants; a model trained on public CTR data predicts the winner.',
    direction: 'AI Tools', priority: 'low', status: 'idea',
    next_action: 'Check the Canva and Figma plugin markets for existing tools first',
    notes: null,
    updatedDaysAgo: 21, createdDaysAgo: 44,
  },
  {
    title: 'Local-first invoicing for sole traders',
    description: 'Invoices, expenses and a Making Tax Digital export, stored on-device with no subscription.',
    direction: 'SaaS', priority: 'low', status: 'idea',
    next_action: 'Read the MTD API docs and size the compliance work',
    notes: 'Compliance is the moat and the risk. Would need to be right, not fast.',
    updatedDaysAgo: 28, createdDaysAgo: 33,
  },
  {
    title: 'Weekly "what I shipped" newsletter',
    description: 'Short Friday letter documenting the build in public. One project, one lesson, one number.',
    direction: 'Content', priority: 'medium', status: 'idea',
    next_action: 'Write three issues before publishing any of them',
    notes: 'Cheap to start, compounds slowly. Mostly a forcing function for shipping.',
    updatedDaysAgo: 34, createdDaysAgo: 38,
  },
]

export const businessIdeas = IDEAS.map((idea, i) => ({
  id: `idea-${String(i + 1).padStart(2, '0')}`,
  title: idea.title,
  description: idea.description,
  direction: idea.direction,
  priority: idea.priority,
  status: idea.status,
  next_action: idea.next_action,
  notes: idea.notes,
  archived: false,
  updated_at: isoTime(daysAgo(idea.updatedDaysAgo), 14, i),
  created_at: isoTime(daysAgo(idea.createdDaysAgo), 10, i),
}))

/** Referenced by the ticker so its idea count cannot drift from the board. */
export const IDEA_COUNT = businessIdeas.length
export const LATEST_IDEA_DATE = iso(daysAgo(IDEAS[0].updatedDaysAgo))
