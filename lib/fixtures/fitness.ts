// ── Weigh-ins ─────────────────────────────────────────────────────────────────
// 8 weekly entries showing a steady downward trend (222 → 215 lbs).
// BMI computed at 5′7″ (67 in): weight_lbs × 0.15651

export const weighIns = [
  { id: 'wi-1', date: '2026-03-11', weight_lbs: 222.4, bmi: 34.8, body_fat_pct: null,  note: 'Starting fresh — back to logging.', created_at: '2026-03-11T07:30:00.000Z' },
  { id: 'wi-2', date: '2026-03-18', weight_lbs: 221.0, bmi: 34.6, body_fat_pct: null,  note: null, created_at: '2026-03-18T07:15:00.000Z' },
  { id: 'wi-3', date: '2026-03-25', weight_lbs: 219.8, bmi: 34.4, body_fat_pct: null,  note: 'Good week — stayed in deficit every day.', created_at: '2026-03-25T07:20:00.000Z' },
  { id: 'wi-4', date: '2026-04-01', weight_lbs: 218.6, bmi: 34.2, body_fat_pct: 28.4,  note: 'First body-fat reading. Long way to go.', created_at: '2026-04-01T07:10:00.000Z' },
  { id: 'wi-5', date: '2026-04-08', weight_lbs: 217.4, bmi: 34.0, body_fat_pct: null,  note: null, created_at: '2026-04-08T07:25:00.000Z' },
  { id: 'wi-6', date: '2026-04-15', weight_lbs: 216.2, bmi: 33.8, body_fat_pct: null,  note: 'Dishoom last week — still dropped. Amazing.', created_at: '2026-04-15T07:15:00.000Z' },
  { id: 'wi-7', date: '2026-04-22', weight_lbs: 215.6, bmi: 33.7, body_fat_pct: 27.8,  note: 'Slower week but held the trend.', created_at: '2026-04-22T07:20:00.000Z' },
  { id: 'wi-8', date: '2026-04-29', weight_lbs: 215.0, bmi: 33.6, body_fat_pct: null,  note: '7.4 lbs down since March. Compounding.', created_at: '2026-04-29T07:10:00.000Z' },
]

// ── Food items ────────────────────────────────────────────────────────────────

export const foodItems = [
  { id: 'fi-01', name: 'Chicken breast',          category: 'Protein', notes: 'Base of every meal. ~31g protein per 100g.', created_at: '2026-01-10T10:00:00.000Z' },
  { id: 'fi-02', name: 'Eggs (pasture-raised)',   category: 'Protein', notes: '5–6 per day, mostly scrambled.', created_at: '2026-01-10T10:01:00.000Z' },
  { id: 'fi-03', name: 'Whey protein isolate',    category: 'Protein', notes: '1–2 scoops post-workout (25g protein each).', created_at: '2026-01-10T10:02:00.000Z' },
  { id: 'fi-04', name: 'Salmon fillet',           category: 'Protein', notes: 'Twice a week — great for omega-3.', created_at: '2026-01-10T10:03:00.000Z' },
  { id: 'fi-05', name: 'Greek yogurt (0% fat)',   category: 'Protein', notes: 'On oats or as a snack. 10g protein per 100g.', created_at: '2026-01-10T10:04:00.000Z' },
  { id: 'fi-06', name: 'Brown rice',              category: 'Carb',    notes: '80g dry weight per serving.', created_at: '2026-01-10T10:05:00.000Z' },
  { id: 'fi-07', name: 'Oats (rolled)',            category: 'Carb',    notes: 'Pre-workout with protein powder and blueberries.', created_at: '2026-01-10T10:06:00.000Z' },
  { id: 'fi-08', name: 'Sweet potato',            category: 'Carb',    notes: 'Roasted. Better micronutrient profile than white potato.', created_at: '2026-01-10T10:07:00.000Z' },
  { id: 'fi-09', name: 'Quinoa',                  category: 'Carb',    notes: 'High-protein carb — good variety from rice.', created_at: '2026-01-10T10:08:00.000Z' },
  { id: 'fi-10', name: 'Olive oil (extra virgin)', category: 'Fat',    notes: 'Cooking only — measured portions.', created_at: '2026-01-10T10:09:00.000Z' },
  { id: 'fi-11', name: 'Almonds',                 category: 'Fat',     notes: '30g measured out. Easy to overeat.', created_at: '2026-01-10T10:10:00.000Z' },
  { id: 'fi-12', name: 'Avocado',                 category: 'Fat',     notes: 'Half with eggs in the morning.', created_at: '2026-01-10T10:11:00.000Z' },
  { id: 'fi-13', name: 'Broccoli',                category: 'Veg',     notes: null, created_at: '2026-01-10T10:12:00.000Z' },
  { id: 'fi-14', name: 'Spinach',                 category: 'Veg',     notes: 'Great in smoothies — zero taste, good iron.', created_at: '2026-01-10T10:13:00.000Z' },
  { id: 'fi-15', name: 'Kale',                    category: 'Veg',     notes: null, created_at: '2026-01-10T10:14:00.000Z' },
  { id: 'fi-16', name: 'Bell peppers',            category: 'Veg',     notes: 'Vitamin C. Raw or roasted.', created_at: '2026-01-10T10:15:00.000Z' },
]
