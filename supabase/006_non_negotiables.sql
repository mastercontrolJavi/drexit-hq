-- Non-Negotiables / Daily Wins tracker
CREATE TABLE non_negotiables (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  last_completed_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
