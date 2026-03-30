-- DREXIT HQ — Supabase Schema Migration
-- Run this in the Supabase SQL Editor to create all tables

-- Budget Entries
create table if not exists budget_entries (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  category text not null,
  description text,
  amount_gbp numeric(10,2) not null,
  month_key text not null,
  created_at timestamptz default now()
);

-- Goals
create table if not exists goals (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text not null,
  deadline date,
  status text default 'not_started',
  progress_pct integer default 0,
  notes text,
  created_at timestamptz default now()
);

-- Weigh-Ins
create table if not exists weigh_ins (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  weight_lbs numeric(5,1) not null,
  note text,
  created_at timestamptz default now()
);

-- Food Items
create table if not exists food_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  notes text,
  created_at timestamptz default now()
);

-- Business Ideas
create table if not exists business_ideas (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  direction text not null,
  priority text default 'medium',
  status text default 'idea',
  next_action text,
  notes text,
  archived boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- App Settings (key-value store for weekly focus, savings, etc.)
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Todos (for dashboard todo list)
create table if not exists todos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_budget_entries_month on budget_entries(month_key);
create index if not exists idx_goals_category on goals(category);
create index if not exists idx_goals_status on goals(status);
create index if not exists idx_weigh_ins_date on weigh_ins(date);
create index if not exists idx_business_ideas_status on business_ideas(status);
create index if not exists idx_business_ideas_archived on business_ideas(archived);
create index if not exists idx_todos_completed on todos(completed);

-- Enable Row Level Security (disabled for personal app — single user)
-- If you want to add auth later, enable RLS and add policies
