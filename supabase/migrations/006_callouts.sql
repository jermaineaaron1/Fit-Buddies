-- Tiered title-match "Callouts" system: 1v1 through Fatal 5-Way, plus an
-- open format for lower-ranked contenders. Format is chosen client-side
-- based on the issuer's current Standings rank (see src/lib/callouts.ts).

create table if not exists callouts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  format text not null check (format in ('1v1', 'triple_threat', 'fatal_4way', 'fatal_5way', 'open')),
  issuer_id uuid not null references profiles(id),
  activity_type text not null,
  personal_target text,
  start_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'cancelled')),
  created_at timestamptz default now() not null
);

create table if not exists callout_participants (
  id uuid primary key default gen_random_uuid(),
  callout_id uuid not null references callouts(id) on delete cascade,
  user_id uuid not null references profiles(id),
  personal_target text,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  final_score numeric,
  unique(callout_id, user_id)
);

create table if not exists callout_spectators (
  callout_id uuid not null references callouts(id) on delete cascade,
  user_id uuid not null references profiles(id),
  viewed_at timestamptz default now() not null,
  primary key (callout_id, user_id)
);

-- Match Room chat reuses chat_messages, scoped by callout_id instead of circle_id.
alter table chat_messages add column if not exists callout_id uuid references callouts(id) on delete cascade;
alter table chat_messages alter column circle_id drop not null;

alter table callouts enable row level security;
alter table callout_participants enable row level security;
alter table callout_spectators enable row level security;

create policy "members read callouts" on callouts for select using (is_circle_member(circle_id));
create policy "members create callouts" on callouts for insert with check (is_circle_member(circle_id) and issuer_id = auth.uid());
create policy "members update callouts" on callouts for update using (is_circle_member(circle_id));

create policy "members read callout participants" on callout_participants for select
  using (exists (select 1 from callouts c where c.id = callout_participants.callout_id and is_circle_member(c.circle_id)));
create policy "members insert callout participants" on callout_participants for insert
  with check (exists (select 1 from callouts c where c.id = callout_participants.callout_id and is_circle_member(c.circle_id)));
create policy "own update callout participation" on callout_participants for update using (user_id = auth.uid());

create policy "members read spectators" on callout_spectators for select
  using (exists (select 1 from callouts c where c.id = callout_spectators.callout_id and is_circle_member(c.circle_id)));
create policy "own insert spectator record" on callout_spectators for insert with check (user_id = auth.uid());
create policy "own update spectator record" on callout_spectators for update using (user_id = auth.uid());

-- Match Room messages: same send/read rules as group chat, scoped to the callout instead.
create policy "members read match room" on chat_messages for select
  using (callout_id is not null and exists (select 1 from callouts c where c.id = chat_messages.callout_id and is_circle_member(c.circle_id)));
create policy "members send match room messages" on chat_messages for insert
  with check (callout_id is not null and sender_id = auth.uid() and exists (select 1 from callouts c where c.id = chat_messages.callout_id and is_circle_member(c.circle_id)));
