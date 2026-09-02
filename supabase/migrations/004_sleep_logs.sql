-- Sleep tracking
create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid not null references circles(id),
  bedtime timestamptz not null,
  wake_time timestamptz not null,
  quality integer check (quality between 1 and 5),
  notes text,
  xp_earned integer default 0 not null,
  log_date date not null default current_date,
  created_at timestamptz default now() not null,
  unique(user_id, log_date)
);

alter table sleep_logs enable row level security;

create policy "members read sleep" on sleep_logs for select using (is_circle_member(circle_id));
create policy "own insert sleep" on sleep_logs for insert with check (user_id = auth.uid());
create policy "own update sleep" on sleep_logs for update using (user_id = auth.uid());
