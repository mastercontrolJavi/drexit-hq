-- Budget limits per category with optional rollover
CREATE TABLE budget_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL UNIQUE,
  monthly_limit numeric NOT NULL DEFAULT 0,
  rollover boolean NOT NULL DEFAULT false,
  carryover_amount numeric NOT NULL DEFAULT 0,
  rollover_applied_month text, -- last month rollover was auto-applied e.g. '2026-03'
  updated_at timestamptz DEFAULT now()
);
