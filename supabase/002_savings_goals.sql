-- Run this in Supabase SQL Editor to add the savings_goals table

create table if not exists savings_goals (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  target_amount numeric(10,2) not null,
  current_amount numeric(10,2) default 0,
  deadline date,
  created_at timestamptz default now()
);

-- Seed with default goals (skip if already exist)
insert into savings_goals (name, target_amount, current_amount)
select 'Mexico Trip Fund', 800, 0
where not exists (select 1 from savings_goals where name = 'Mexico Trip Fund');

insert into savings_goals (name, target_amount, current_amount)
select 'General Savings', 1500, 0
where not exists (select 1 from savings_goals where name = 'General Savings');
