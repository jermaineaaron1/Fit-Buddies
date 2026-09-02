-- ============================================================================
-- Body composition history.
--
-- profiles already holds weight_kg / body_fat_percentage / muscle_mass_kg, but
-- only as CURRENT values. A single snapshot can't answer "am I losing fat or
-- losing muscle", which is the whole question — that needs a time series.
--
-- Deliberately private to the individual, unlike workouts and meals which are
-- circle-visible. Weight and body fat are the most sensitive numbers in the
-- app, and a fitness circle doesn't need them to hold you accountable.
-- ============================================================================

create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(6,2) check (weight_kg is null or (weight_kg > 20 and weight_kg < 400)),
  body_fat_percentage numeric(4,1) check (body_fat_percentage is null or body_fat_percentage between 1 and 75),
  muscle_mass_kg numeric(6,2) check (muscle_mass_kg is null or muscle_mass_kg > 0),
  visceral_fat_rating numeric(4,1) check (visceral_fat_rating is null or visceral_fat_rating between 1 and 60),
  -- 'inbody' and 'scale' are device readings; 'manual' is typed in. Kept so a
  -- trend can distinguish a consistent device from mixed sources, which is a
  -- common reason for phantom jumps.
  source text not null default 'manual' check (source in ('manual', 'inbody', 'scale')),
  notes text,
  created_at timestamptz not null default now(),
  -- One entry per day: weighing twice in a day should correct the day, not
  -- create a second point that makes the trend line zigzag.
  unique (user_id, measured_at)
);

create index if not exists idx_body_measurements_user
  on body_measurements (user_id, measured_at desc);

alter table body_measurements enable row level security;
revoke all on body_measurements from anon, authenticated;
grant select, insert, update, delete on body_measurements to authenticated;

create policy "own measurements read" on body_measurements
  for select to authenticated using (user_id = auth.uid());
create policy "own measurements insert" on body_measurements
  for insert to authenticated with check (user_id = auth.uid());
create policy "own measurements update" on body_measurements
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own measurements delete" on body_measurements
  for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Keep profiles in step with the newest measurement.
--
-- profiles.weight_kg feeds the Mifflin-St Jeor calorie target, so a stale value
-- there quietly skews every nutrition goal and the Belt's nutrition scoring.
-- Doing it in a trigger means it cannot be forgotten by a caller.
-- ----------------------------------------------------------------------------
create or replace function sync_profile_from_measurement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only the latest measurement should drive the profile; back-filling an old
  -- weigh-in must not overwrite today's numbers.
  if exists (
    select 1 from body_measurements
    where user_id = new.user_id and measured_at > new.measured_at
  ) then
    return new;
  end if;

  update profiles
     set weight_kg           = coalesce(new.weight_kg, weight_kg),
         body_fat_percentage = coalesce(new.body_fat_percentage, body_fat_percentage),
         muscle_mass_kg      = coalesce(new.muscle_mass_kg, muscle_mass_kg)
   where id = new.user_id;

  return new;
end $$;

drop trigger if exists trg_sync_profile_from_measurement on body_measurements;
create trigger trg_sync_profile_from_measurement
after insert or update on body_measurements
for each row execute function sync_profile_from_measurement();
