// ── Budget entries ────────────────────────────────────────────────────────────
// Three months of spend. March & April are full months; May is partial (day 5).

export const budgetEntries = [
  // ── March 2026 ─────────────────────────────────────────────────────────────
  { id: 'be-2603-01', date: '2026-03-01', category: 'Rent',           description: 'Monthly rent',                     amount_gbp: 800.00, month_key: '2026-03', created_at: '2026-03-01T09:00:00.000Z' },
  { id: 'be-2603-02', date: '2026-03-03', category: 'Utilities',      description: 'EDF Energy + BT Broadband',        amount_gbp:  86.20, month_key: '2026-03', created_at: '2026-03-03T10:00:00.000Z' },
  { id: 'be-2603-03', date: '2026-03-05', category: 'Transportation',  description: 'TfL Travelcard monthly',           amount_gbp:  88.80, month_key: '2026-03', created_at: '2026-03-05T08:30:00.000Z' },
  { id: 'be-2603-04', date: '2026-03-06', category: 'Groceries',      description: 'Tesco weekly shop',                amount_gbp:  52.40, month_key: '2026-03', created_at: '2026-03-06T11:00:00.000Z' },
  { id: 'be-2603-05', date: '2026-03-07', category: 'Subscriptions',  description: 'Spotify + Netflix + Claude Pro',   amount_gbp:  39.98, month_key: '2026-03', created_at: '2026-03-07T00:01:00.000Z' },
  { id: 'be-2603-06', date: '2026-03-09', category: 'Restaurants',    description: 'Pret A Manger',                   amount_gbp:   8.40, month_key: '2026-03', created_at: '2026-03-09T12:30:00.000Z' },
  { id: 'be-2603-07', date: '2026-03-10', category: 'Groceries',      description: 'Lidl weekly shop',                 amount_gbp:  41.20, month_key: '2026-03', created_at: '2026-03-10T10:00:00.000Z' },
  { id: 'be-2603-08', date: '2026-03-11', category: 'Groceries',      description: "Sainsbury's top-up",              amount_gbp:  44.80, month_key: '2026-03', created_at: '2026-03-11T14:00:00.000Z' },
  { id: 'be-2603-09', date: '2026-03-12', category: 'Restaurants',    description: "Nando's — dinner with friends",   amount_gbp:  22.50, month_key: '2026-03', created_at: '2026-03-12T19:00:00.000Z' },
  { id: 'be-2603-10', date: '2026-03-13', category: 'Shopping',       description: 'Amazon — desk accessories',        amount_gbp:  36.99, month_key: '2026-03', created_at: '2026-03-13T15:00:00.000Z' },
  { id: 'be-2603-11', date: '2026-03-15', category: 'Groceries',      description: 'Tesco weekly shop',                amount_gbp:  38.80, month_key: '2026-03', created_at: '2026-03-15T10:00:00.000Z' },
  { id: 'be-2603-12', date: '2026-03-17', category: 'Restaurants',    description: 'Deliveroo — Thai',                 amount_gbp:  21.40, month_key: '2026-03', created_at: '2026-03-17T20:00:00.000Z' },
  { id: 'be-2603-13', date: '2026-03-18', category: 'Shopping',       description: 'Gymshark — shorts + training top', amount_gbp:  54.99, month_key: '2026-03', created_at: '2026-03-18T11:00:00.000Z' },
  { id: 'be-2603-14', date: '2026-03-19', category: 'Shopping',       description: 'ASOS — chinos',                   amount_gbp:  38.00, month_key: '2026-03', created_at: '2026-03-19T13:00:00.000Z' },
  { id: 'be-2603-15', date: '2026-03-20', category: 'Groceries',      description: "Sainsbury's",                     amount_gbp:  44.60, month_key: '2026-03', created_at: '2026-03-20T10:00:00.000Z' },
  { id: 'be-2603-16', date: '2026-03-22', category: 'Health',         description: 'Boots — protein supps + meds',    amount_gbp:  18.50, month_key: '2026-03', created_at: '2026-03-22T12:00:00.000Z' },
  { id: 'be-2603-17', date: '2026-03-25', category: 'Entertainment',  description: 'Odeon cinema',                    amount_gbp:  16.50, month_key: '2026-03', created_at: '2026-03-25T18:00:00.000Z' },
  { id: 'be-2603-18', date: '2026-03-27', category: 'Restaurants',    description: 'Wagamama — solo lunch',           amount_gbp:  28.40, month_key: '2026-03', created_at: '2026-03-27T13:00:00.000Z' },
  { id: 'be-2603-19', date: '2026-03-29', category: 'Groceries',      description: 'Tesco weekly shop',               amount_gbp:  34.20, month_key: '2026-03', created_at: '2026-03-29T10:00:00.000Z' },
  { id: 'be-2603-20', date: '2026-03-30', category: 'Services',       description: 'Barber',                          amount_gbp:  22.00, month_key: '2026-03', created_at: '2026-03-30T11:00:00.000Z' },

  // ── April 2026 ─────────────────────────────────────────────────────────────
  { id: 'be-2604-01', date: '2026-04-01', category: 'Rent',           description: 'Monthly rent',                     amount_gbp: 800.00, month_key: '2026-04', created_at: '2026-04-01T09:00:00.000Z' },
  { id: 'be-2604-02', date: '2026-04-02', category: 'Utilities',      description: 'EDF Energy + BT Broadband',        amount_gbp:  82.40, month_key: '2026-04', created_at: '2026-04-02T10:00:00.000Z' },
  { id: 'be-2604-03', date: '2026-04-06', category: 'Transportation',  description: 'TfL Travelcard monthly',           amount_gbp:  88.80, month_key: '2026-04', created_at: '2026-04-06T08:30:00.000Z' },
  { id: 'be-2604-04', date: '2026-04-07', category: 'Groceries',      description: 'Tesco weekly shop',                amount_gbp:  48.20, month_key: '2026-04', created_at: '2026-04-07T10:00:00.000Z' },
  { id: 'be-2604-05', date: '2026-04-07', category: 'Subscriptions',  description: 'Spotify + Netflix + Claude + Monzo', amount_gbp: 45.97, month_key: '2026-04', created_at: '2026-04-07T00:01:00.000Z' },
  { id: 'be-2604-06', date: '2026-04-09', category: 'Restaurants',    description: 'Pret A Manger ×2',                amount_gbp:  12.80, month_key: '2026-04', created_at: '2026-04-09T12:30:00.000Z' },
  { id: 'be-2604-07', date: '2026-04-10', category: 'Groceries',      description: 'Lidl weekly shop',                 amount_gbp:  38.60, month_key: '2026-04', created_at: '2026-04-10T10:00:00.000Z' },
  { id: 'be-2604-08', date: '2026-04-12', category: 'Restaurants',    description: 'Dishoom — dinner',                 amount_gbp:  48.20, month_key: '2026-04', created_at: '2026-04-12T19:30:00.000Z' },
  { id: 'be-2604-09', date: '2026-04-13', category: 'Shopping',       description: 'ASOS — jeans',                    amount_gbp:  34.99, month_key: '2026-04', created_at: '2026-04-13T14:00:00.000Z' },
  { id: 'be-2604-10', date: '2026-04-14', category: 'Groceries',      description: "Sainsbury's weekly shop",          amount_gbp:  42.80, month_key: '2026-04', created_at: '2026-04-14T10:00:00.000Z' },
  { id: 'be-2604-11', date: '2026-04-16', category: 'Restaurants',    description: 'Deliveroo — Sunday dinner',        amount_gbp:  26.40, month_key: '2026-04', created_at: '2026-04-16T19:00:00.000Z' },
  { id: 'be-2604-12', date: '2026-04-19', category: 'Groceries',      description: 'Tesco weekly shop',               amount_gbp:  39.40, month_key: '2026-04', created_at: '2026-04-19T10:00:00.000Z' },
  { id: 'be-2604-13', date: '2026-04-21', category: 'Health',         description: 'Boots — vitamins',                amount_gbp:  14.00, month_key: '2026-04', created_at: '2026-04-21T12:00:00.000Z' },
  { id: 'be-2604-14', date: '2026-04-23', category: 'Entertainment',  description: 'Vue cinema — A Minecraft Movie',   amount_gbp:  19.00, month_key: '2026-04', created_at: '2026-04-23T18:00:00.000Z' },
  { id: 'be-2604-15', date: '2026-04-24', category: 'Restaurants',    description: 'Itsu — lunch',                    amount_gbp:  11.20, month_key: '2026-04', created_at: '2026-04-24T13:00:00.000Z' },
  { id: 'be-2604-16', date: '2026-04-26', category: 'Groceries',      description: 'Tesco weekend shop',              amount_gbp:  44.30, month_key: '2026-04', created_at: '2026-04-26T10:00:00.000Z' },
  { id: 'be-2604-17', date: '2026-04-27', category: 'Shopping',       description: 'Waterstones — 2 books',           amount_gbp:  28.00, month_key: '2026-04', created_at: '2026-04-27T14:00:00.000Z' },
  { id: 'be-2604-18', date: '2026-04-28', category: 'Transfer',       description: 'Europe Trip Fund savings transfer', amount_gbp: 100.00, month_key: '2026-04', created_at: '2026-04-28T09:00:00.000Z' },
  { id: 'be-2604-19', date: '2026-04-29', category: 'Services',       description: 'Barber',                          amount_gbp:  22.00, month_key: '2026-04', created_at: '2026-04-29T11:00:00.000Z' },
  { id: 'be-2604-20', date: '2026-04-30', category: 'Restaurants',    description: 'Pret A Manger',                   amount_gbp:   7.60, month_key: '2026-04', created_at: '2026-04-30T09:00:00.000Z' },

  // ── May 2026 (partial — day 5) ─────────────────────────────────────────────
  { id: 'be-2605-01', date: '2026-05-01', category: 'Groceries',      description: 'Lidl weekly shop',                amount_gbp:  28.40, month_key: '2026-05', created_at: '2026-05-01T10:00:00.000Z' },
  { id: 'be-2605-02', date: '2026-05-01', category: 'Subscriptions',  description: 'Monzo Plus',                      amount_gbp:   5.99, month_key: '2026-05', created_at: '2026-05-01T00:01:00.000Z' },
  { id: 'be-2605-03', date: '2026-05-02', category: 'Restaurants',    description: 'Pret A Manger',                   amount_gbp:   8.60, month_key: '2026-05', created_at: '2026-05-02T09:00:00.000Z' },
  { id: 'be-2605-04', date: '2026-05-02', category: 'Transportation',  description: 'TfL Oyster top-up',              amount_gbp:  20.00, month_key: '2026-05', created_at: '2026-05-02T08:00:00.000Z' },
  { id: 'be-2605-05', date: '2026-05-03', category: 'Groceries',      description: 'Tesco',                           amount_gbp:  34.10, month_key: '2026-05', created_at: '2026-05-03T10:00:00.000Z' },
  { id: 'be-2605-06', date: '2026-05-04', category: 'Shopping',       description: 'Amazon — monitor arm',            amount_gbp:  39.99, month_key: '2026-05', created_at: '2026-05-04T11:00:00.000Z' },
  { id: 'be-2605-07', date: '2026-05-04', category: 'Restaurants',    description: 'Deliveroo — pizza night',         amount_gbp:  22.40, month_key: '2026-05', created_at: '2026-05-04T20:00:00.000Z' },
  { id: 'be-2605-08', date: '2026-05-05', category: 'Restaurants',    description: 'Pret A Manger',                   amount_gbp:   4.40, month_key: '2026-05', created_at: '2026-05-05T09:00:00.000Z' },
]

// ── Savings goals ─────────────────────────────────────────────────────────────

export const savingsGoals = [
  { id: 'sg-1', name: 'Europe Trip Fund',  target_amount: 800,  current_amount: 420,  deadline: '2026-06-01', created_at: '2026-01-15T10:00:00.000Z' },
  { id: 'sg-2', name: 'Emergency Fund',    target_amount: 2000, current_amount: 650,  deadline: null,         created_at: '2026-01-15T10:01:00.000Z' },
  { id: 'sg-3', name: 'MacBook Pro M4',    target_amount: 2499, current_amount: 1200, deadline: '2026-12-31', created_at: '2026-02-01T10:00:00.000Z' },
]

// ── Savings transactions ───────────────────────────────────────────────────────
// Links the April transfer budget entry to the Europe Trip Fund goal.

export const savingsTransactions = [
  {
    id: 'st-1',
    goal_id: 'sg-1',
    amount: 100.00,
    type: 'budget_link',
    note: 'Monthly savings transfer',
    linked_entry_id: 'be-2604-18',
    date: '2026-04-28',
    created_at: '2026-04-28T09:00:00.000Z',
  },
  {
    id: 'st-2',
    goal_id: 'sg-1',
    amount: 150.00,
    type: 'manual',
    note: 'Freelance payment deposit',
    linked_entry_id: null,
    date: '2026-03-15',
    created_at: '2026-03-15T14:00:00.000Z',
  },
  {
    id: 'st-3',
    goal_id: 'sg-2',
    amount: 200.00,
    type: 'manual',
    note: 'Initial deposit',
    linked_entry_id: null,
    date: '2026-01-20',
    created_at: '2026-01-20T10:00:00.000Z',
  },
]

// ── App settings ──────────────────────────────────────────────────────────────

export const appSettings = [
  { key: 'monthly_income', value: '2400', updated_at: '2026-05-01T00:00:00.000Z' },
  { key: 'weekly_focus',   value: 'Ship demo mode · book Lisbon for June · stay in the deficit', updated_at: '2026-05-04T08:30:00.000Z' },
]
