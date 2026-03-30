# Budget Enhancements: Savings Transactions, Budget Linking & Charts

**Date:** 2026-03-30
**Status:** Approved

## Overview

Enhance the DREXIT HQ budget section with: (1) a savings transaction log replacing direct amount editing, (2) budget-to-savings linking, (3) quick +/- adjustments, (4) expanded and interactive charts, and (5) key financial charts promoted to the dashboard.

## 1. Savings Transaction Log

### Database

New table `savings_transactions`:
```sql
CREATE TABLE savings_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,        -- positive = deposit, negative = withdrawal
  type TEXT NOT NULL DEFAULT 'manual',   -- 'manual' | 'budget_link'
  note TEXT,
  linked_entry_id UUID REFERENCES budget_entries(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_savings_tx_goal ON savings_transactions(goal_id);
CREATE INDEX idx_savings_tx_date ON savings_transactions(date);
```

### Behavior
- `savings_goals.current_amount` is still stored but kept in sync: on every transaction insert/delete, update the goal's `current_amount` as `SUM(amount)` from its transactions.
- Existing goals keep their current_amount; a single "Opening balance" transaction is created on first load if no transactions exist for a goal.

### UI Changes to SavingsTracker
- Each goal card shows: name, progress bar, current/target, quick +/- buttons
- **Quick adjust**: Click +/- button -> small popover with amount input + optional note -> creates transaction
- **History**: "View history" link opens a dialog/sheet with paginated transaction list (date, amount, note, type badge)
- **Edit goal**: Still allows editing name/target. Current amount is read-only (derived from transactions).
- **Delete goal**: Cascading delete removes all transactions.

## 2. Budget-to-Savings Link

### UI Changes to BudgetClient
- Expense entry form gets an optional "Link to savings goal" Select dropdown (default: none)
- When a goal is selected, inserting the budget entry also creates a `savings_transaction` with:
  - `type: 'budget_link'`
  - `amount: -entry.amount_gbp` (withdrawal)
  - `linked_entry_id: entry.id`
  - `note: "Budget: {description}"`

### Visual Indicator
- Budget entries table gets a small piggy-bank icon or badge if `linked_entry_id` exists on any savings transaction
- Tooltip shows which goal it's linked to

## 3. Enhanced Charts

### Budget Analytics Improvements
- Switch from cramped 2x2 grid to **tabbed layout** (Spending | Cash Flow | Pace | Trends | Savings)
- Each chart gets full width of the content area
- New "Savings" tab: line chart showing savings growth per goal over time

### New Charts
1. **Savings Growth** (line chart): One line per savings goal, X=date, Y=cumulative amount. Shows how each goal progresses.
2. **Net Position** (composed chart): Monthly bars for income, expenses, savings contributions. Line for net (income - expenses - savings).
3. **Income vs Expenses** (bar chart): Side-by-side bars per month, clear comparison.

### Interactive Drill-Down
- Clicking a bar in "Spending by Category" filters the expense table below to that category
- Clicking a month in "Cash Flow" switches the month selector to that month
- Visual highlight on selected element

### Dashboard Promotion
- Add "Financial Overview" section to dashboard page with 2 mini-charts:
  1. **Cash Flow Mini** (last 3 months bar chart, compact)
  2. **Savings Progress Mini** (horizontal stacked bar showing all goals' progress)
- These sit alongside existing stat cards

## 4. Files to Create/Modify

### New Files
- `supabase/003_savings_transactions.sql` — migration
- `components/budget/savings-history.tsx` — transaction history dialog
- `components/budget/quick-adjust.tsx` — +/- popover component
- `components/dashboard/cash-flow-mini.tsx` — dashboard cash flow chart
- `components/dashboard/savings-mini.tsx` — dashboard savings chart

### Modified Files
- `types/index.ts` — add SavingsTransaction type, update SavingsGoal
- `components/budget/savings-tracker.tsx` — transaction-based flow, quick adjust, history link
- `components/budget/budget-client.tsx` — add savings goal linking to expense form
- `components/budget/budget-analytics.tsx` — tabbed layout, new charts, click interactions
- `app/dashboard/page.tsx` — add financial overview section
- `components/dashboard/stat-cards.tsx` — adjust grid for new charts

## 5. Data Flow

```
Budget Entry Form
  ├── Insert budget_entry → Supabase
  └── If savings goal linked:
      └── Insert savings_transaction (type: budget_link, negative amount)
          └── Update savings_goals.current_amount (SUM recalc)

Quick Adjust (+/-)
  └── Insert savings_transaction (type: manual)
      └── Update savings_goals.current_amount (SUM recalc)

Charts
  ├── Budget analytics: fetch budget_entries grouped by month/category
  ├── Savings growth: fetch savings_transactions grouped by goal + date
  └── Dashboard minis: fetch last 3 months summaries
```

## 6. Non-Goals
- No auto-categorization of CSV imports (future feature)
- No recurring transaction detection
- No multi-currency support
- No authentication/RLS changes
