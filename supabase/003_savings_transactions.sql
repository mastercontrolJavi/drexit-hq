-- Savings transactions table: tracks deposits/withdrawals per goal
create table if not exists savings_transactions (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid not null references savings_goals(id) on delete cascade,
  amount numeric(10,2) not null,
  type text not null default 'manual',
  note text,
  linked_entry_id uuid references budget_entries(id) on delete set null,
  date date not null default current_date,
  created_at timestamptz default now()
);

create index if not exists idx_savings_tx_goal on savings_transactions(goal_id);
create index if not exists idx_savings_tx_date on savings_transactions(date);

-- For existing goals that already have a current_amount > 0,
-- create an "Opening balance" transaction so the ledger matches.
insert into savings_transactions (goal_id, amount, type, note, date)
select id, current_amount, 'manual', 'Opening balance', current_date
from savings_goals
where current_amount > 0;
