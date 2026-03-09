-- Task 3A: append-only goal event history (additive migration)

create table if not exists public.goal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'goal_created',
      'goal_deleted',
      'binary_toggled',
      'count_incremented',
      'count_decremented',
      'goal_reset_daily',
      'goal_reset_weekly',
      'goal_reset_monthly'
    )
  ),
  event_date text not null,
  binary_done boolean,
  count_value integer,
  delta integer,
  created_at timestamptz not null default now()
);

alter table public.goal_events enable row level security;

drop policy if exists "Users manage own goal events" on public.goal_events;
create policy "Users manage own goal events"
on public.goal_events
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_goal_events_user_created_at
  on public.goal_events (user_id, created_at desc);

create index if not exists idx_goal_events_goal_created_at
  on public.goal_events (goal_id, created_at desc);
