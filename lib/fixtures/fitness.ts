import { NOW, addDays, between, chance, daysAgo, iso, isoTime, rng } from './clock'

/**
 * Weigh-ins in two phases, because the app reads them two different ways:
 *
 *  - A weekly cadence going back ~5 months gives the progress chart a real
 *    trend line rather than eight points on a stub.
 *  - A daily cadence over the last three weeks gives the STREAK tile something
 *    to count. calcStreak() only counts *consecutive days* ending today or
 *    yesterday, so weekly-only data always read 0 no matter how fresh it was.
 */

const START_WEIGHT = 224.6
const HEIGHT_FACTOR = 0.15651 // BMI at 5'7" (67in) = lbs × 0.15651

const WEEKLY_WEEKS = 20
const DAILY_DAYS = 22

const NOTES = [
  'Held the deficit all week.',
  'Travel week, happy to hold flat.',
  'Two gym sessions and a long walk.',
  'Slept badly, water weight up. Ignoring it.',
  'Steps up, snacking down.',
  null,
  null,
  null,
] as const

interface WeighIn {
  id: string
  date: string
  weight_lbs: number
  bmi: number | null
  body_fat_pct: number | null
  note: string | null
  created_at: string
}

const r = rng(20260311)
const entries: WeighIn[] = []

/**
 * ~0.9 lb/week average loss plus scale noise.
 *
 * The noise band matters: the daily phase is read over windows as short as
 * seven days (the BMI Δ tile) and ten points (the dashboard chart). Jitter
 * wider than the weekly trend turns both into static, so daily readings wobble
 * less than weekly ones do.
 */
function weightAt(daysBack: number, noise: number): number {
  const weeks = daysBack / 7
  const trend = START_WEIGHT - (WEEKLY_WEEKS + DAILY_DAYS / 7 - weeks) * 0.92
  return Math.round((trend + between(r, -noise, noise)) * 10) / 10
}

// Weekly phase: oldest first, stopping where the daily phase takes over.
for (let w = WEEKLY_WEEKS; w >= 1; w--) {
  const daysBack = DAILY_DAYS + w * 7
  const d = daysAgo(daysBack)
  const weight = weightAt(daysBack, 0.6)
  entries.push({
    id: `wi-w${w}`,
    date: iso(d),
    weight_lbs: weight,
    bmi: Math.round(weight * HEIGHT_FACTOR * 10) / 10,
    body_fat_pct: w % 4 === 0 ? Math.round(between(r, 26.5, 31.5) * 10) / 10 : null,
    note: chance(r, 0.3) ? NOTES[Math.floor(r() * NOTES.length)] : null,
    created_at: isoTime(d, 7, 20),
  })
}

// Daily phase: an unbroken run up to and including today.
for (let d0 = DAILY_DAYS - 1; d0 >= 0; d0--) {
  const d = daysAgo(d0)
  const weight = weightAt(d0, 0.22)
  entries.push({
    id: `wi-d${d0}`,
    date: iso(d),
    weight_lbs: weight,
    bmi: Math.round(weight * HEIGHT_FACTOR * 10) / 10,
    body_fat_pct: d0 % 7 === 0 ? Math.round(between(r, 25.8, 28.4) * 10) / 10 : null,
    note:
      d0 === 0
        ? 'Lowest reading since I started logging.'
        : chance(r, 0.18)
          ? NOTES[Math.floor(r() * NOTES.length)]
          : null,
    created_at: isoTime(d, 7, 15),
  })
}

export const weighIns: WeighIn[] = entries

/** The weight the rest of the app should treat as current. */
export const CURRENT_WEIGHT = entries[entries.length - 1].weight_lbs
export const START_WEIGHT_LBS = entries[0].weight_lbs
export const WEIGH_IN_START_DATE = entries[0].date

// ── Food items ────────────────────────────────────────────────────────────────

const FOODS: Array<[string, 'Protein' | 'Carb' | 'Fat' | 'Veg' | 'Other', string | null]> = [
  ['Chicken breast',           'Protein', 'Base of every meal. ~31g protein per 100g.'],
  ['Eggs (pasture-raised)',    'Protein', '5 or 6 per day, mostly scrambled.'],
  ['Whey protein isolate',     'Protein', '1 to 2 scoops post-workout, 25g each.'],
  ['Salmon fillet',            'Protein', 'Twice a week. Worth it for the omega-3.'],
  ['Greek yogurt (0% fat)',    'Protein', 'On oats or as a snack. 10g protein per 100g.'],
  ['Tinned tuna',              'Protein', 'Emergency protein. Always two tins in the cupboard.'],
  ['Cottage cheese',           'Protein', 'Late-night option that does not wreck the day.'],
  ['Brown rice',               'Carb',    '80g dry weight per serving.'],
  ['Oats (rolled)',            'Carb',    'Pre-workout with protein powder and blueberries.'],
  ['Sweet potato',             'Carb',    'Roasted. Better micronutrients than white potato.'],
  ['Quinoa',                   'Carb',    'High-protein carb, good variety from rice.'],
  ['Sourdough',                'Carb',    'Weekends only, otherwise it disappears.'],
  ['Olive oil (extra virgin)', 'Fat',     'Cooking only, measured. Easy 300 kcal mistake.'],
  ['Almonds',                  'Fat',     '30g weighed out. Never from the bag.'],
  ['Avocado',                  'Fat',     'Half with eggs in the morning.'],
  ['Peanut butter',            'Fat',     'One tablespoon, on the scale, no exceptions.'],
  ['Broccoli',                 'Veg',     null],
  ['Spinach',                  'Veg',     'Into smoothies. No taste, good iron.'],
  ['Kale',                     'Veg',     null],
  ['Bell peppers',             'Veg',     'Raw with hummus when the 4pm craving hits.'],
  ['Frozen berries',           'Other',   'Cheaper than fresh and always in date.'],
  ['Black coffee',             'Other',   'Two a day, both before noon.'],
]

export const foodItems = FOODS.map(([name, category, notes], i) => {
  const d = addDays(NOW, -150 + i)
  return {
    id: `fi-${String(i + 1).padStart(2, '0')}`,
    name,
    category,
    notes,
    created_at: isoTime(d, 10, i),
  }
})
