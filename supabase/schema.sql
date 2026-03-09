-- Goal Sparkle Tracker schema + RLS
create extension if not exists "pgcrypto";

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  type text not null check (type in ('binary', 'count')),
  target integer,
  label text,
  streak integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.goal_progress (
  goal_id uuid primary key references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  binary_done boolean not null default false,
  count_value integer not null default 0,
  history integer[] not null default array[0,0,0,0,0,0,0],
  last_reset_date text not null,
  last_week_reset_date text not null,
  last_month_reset_date text not null,
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;
alter table public.goal_progress enable row level security;

create policy "Users manage own goals"
on public.goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own goal progress"
on public.goal_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
