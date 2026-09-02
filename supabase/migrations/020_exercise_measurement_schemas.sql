-- Adaptive exercise measurement + per-set logging.
--
-- Design note that everything else here depends on: `workout_exercises` keeps
-- its existing rollup columns (sets, reps, weight_kg, duration_seconds,
-- distance_km) and the client writes a summary into them on save. That means
-- every current consumer -- belt_workout_calories() in migration 015,
-- estimateWorkoutCalories() in the app, and the Tale of the Tape history --
-- keeps working with no change at all. The new workout_sets table holds the
-- detail those rollups summarise, not a replacement for them.

-- ---------------------------------------------------------------------------
-- 1. Measurement schema per exercise
-- ---------------------------------------------------------------------------

alter table workout_exercises add column if not exists measurement_type text not null default 'strength'
  check (measurement_type in (
    'strength', 'bodyweight', 'isometric', 'isometric_force',
    'distance_cardio', 'intervals', 'mobility'
  ));

-- Equipment is a separate field from the exercise name: "Bench Press" on a
-- barbell and on a Smith machine are the same movement with different loads,
-- and history is only comparable when they are distinguished.
alter table workout_exercises add column if not exists equipment text;

-- Optional session reference photo from the equipment-recognition flow. Points
-- into the private equipment-photos bucket created below.
alter table workout_exercises add column if not exists equipment_photo_path text;

alter table workout_exercises add column if not exists rest_seconds integer
  check (rest_seconds is null or (rest_seconds >= 0 and rest_seconds <= 3600));

-- exercise_type ('strength' | 'cardio') is still what the scoring functions
-- read, so it is derived from measurement_type rather than trusted from the
-- client. Keeping the two in sync in the database means a stale client can
-- never write a row that scores wrongly.
create or replace function sync_exercise_type_from_measurement()
returns trigger
language plpgsql
as $$
begin
  new.exercise_type := case
    when new.measurement_type in ('distance_cardio', 'intervals') then 'cardio'
    else 'strength'
  end;
  return new;
end;
$$;

drop trigger if exists trg_sync_exercise_type on workout_exercises;
create trigger trg_sync_exercise_type
  before insert or update of measurement_type on workout_exercises
  for each row execute function sync_exercise_type_from_measurement();

-- Backfill. Rows logged before this migration already carry exercise_type, and
-- the new column defaults to 'strength' -- which would leave every existing
-- cardio row describing itself as strength. The trigger only fires on write,
-- so it cannot repair history on its own.
update workout_exercises
set measurement_type = 'distance_cardio'
where exercise_type = 'cardio' and measurement_type = 'strength';

-- ---------------------------------------------------------------------------
-- 2. Per-set detail
-- ---------------------------------------------------------------------------

create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_index smallint not null check (set_index >= 0),
  completed boolean not null default true,

  -- strength and bodyweight
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  weight_mode text check (weight_mode is null or weight_mode in ('added', 'assisted')),
  reps smallint check (reps is null or (reps >= 0 and reps <= 1000)),
  -- Reps in reserve and rate of perceived exertion are alternative scales for
  -- the same judgement; either may be recorded, neither is required.
  rir smallint check (rir is null or (rir >= 0 and rir <= 10)),
  rpe numeric(3,1) check (rpe is null or (rpe >= 1 and rpe <= 10)),

  -- isometric
  position_label text,
  joint_angle_degrees smallint check (joint_angle_degrees is null or (joint_angle_degrees between 0 and 180)),
  hold_seconds integer check (hold_seconds is null or hold_seconds > 0),

  -- force-measured isometric. Only ever populated from a real measuring
  -- device; there is no way to infer newtons from a phone, so the app must
  -- never write these from an estimate.
  peak_force_n numeric(7,1) check (peak_force_n is null or peak_force_n >= 0),
  avg_force_n numeric(7,1) check (avg_force_n is null or avg_force_n >= 0),
  force_device text,

  -- distance cardio
  distance_km numeric(6,2) check (distance_km is null or distance_km >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  incline_pct numeric(4,1) check (incline_pct is null or (incline_pct >= -30 and incline_pct <= 60)),
  resistance_level smallint check (resistance_level is null or (resistance_level between 0 and 100)),

  -- intervals
  work_seconds integer check (work_seconds is null or work_seconds > 0),
  recovery_seconds integer check (recovery_seconds is null or recovery_seconds >= 0),
  rounds smallint check (rounds is null or (rounds > 0 and rounds <= 200)),
  intensity text check (intensity is null or intensity in ('low', 'moderate', 'high')),

  -- mobility
  range_rating smallint check (range_rating is null or (range_rating between 1 and 5)),

  notes text,
  created_at timestamptz not null default now(),

  unique (workout_exercise_id, set_index)
);

create index if not exists idx_workout_sets_exercise on workout_sets (workout_exercise_id, set_index);

alter table workout_sets enable row level security;

-- Sets inherit their visibility from the workout two levels up: circle members
-- can read them, only the owner can write them. Mirrors workout_exercises,
-- with an update policy added because sets are edited in place while a session
-- is in progress -- which workout_exercises never were.
drop policy if exists "members read workout sets" on workout_sets;
create policy "members read workout sets" on workout_sets for select
  using (exists (
    select 1 from workout_exercises we
    join workouts w on w.id = we.workout_id
    where we.id = workout_sets.workout_exercise_id and is_circle_member(w.circle_id)
  ));

drop policy if exists "own insert workout set" on workout_sets;
create policy "own insert workout set" on workout_sets for insert
  with check (exists (
    select 1 from workout_exercises we
    join workouts w on w.id = we.workout_id
    where we.id = workout_sets.workout_exercise_id and w.user_id = auth.uid()
  ));

drop policy if exists "own update workout set" on workout_sets;
create policy "own update workout set" on workout_sets for update
  using (exists (
    select 1 from workout_exercises we
    join workouts w on w.id = we.workout_id
    where we.id = workout_sets.workout_exercise_id and w.user_id = auth.uid()
  ));

drop policy if exists "own delete workout set" on workout_sets;
create policy "own delete workout set" on workout_sets for delete
  using (exists (
    select 1 from workout_exercises we
    join workouts w on w.id = we.workout_id
    where we.id = workout_sets.workout_exercise_id and w.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 3. Equipment photos (private, per-user folders)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('equipment-photos', 'equipment-photos', false)
on conflict (id) do nothing;

drop policy if exists "own equipment photo read" on storage.objects;
create policy "own equipment photo read" on storage.objects for select
  using (bucket_id = 'equipment-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own equipment photo write" on storage.objects;
create policy "own equipment photo write" on storage.objects for insert
  with check (bucket_id = 'equipment-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own equipment photo delete" on storage.objects;
create policy "own equipment photo delete" on storage.objects for delete
  using (bucket_id = 'equipment-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 4. Household measures for food logging
-- ---------------------------------------------------------------------------

-- The old list stopped at six units, which forced anyone eating a bowl of
-- anything to convert to grams in their head before logging it.
alter table meal_logs drop constraint if exists meal_logs_quantity_unit_check;
alter table meal_logs add constraint meal_logs_quantity_unit_check
  check (quantity_unit is null or quantity_unit in (
    'g', 'kg', 'oz', 'ml', 'l', 'tsp', 'tbsp', 'cup',
    'piece', 'slice', 'serving', 'bowl', 'plate', 'ladle'
  ));

-- What a household unit was taken to weigh, so a "1 bowl" entry stays
-- interpretable later even if the default conversion changes.
alter table meal_logs add column if not exists estimated_grams numeric(7,1)
  check (estimated_grams is null or estimated_grams >= 0);

-- ---------------------------------------------------------------------------
-- 5. Championship elimination match
-- ---------------------------------------------------------------------------

-- Completes the eligibility ladder: rank 5 challenges into an elimination
-- match with the champion and ranks 1-5, rather than dropping to a free-pick
-- open callout.
alter table callouts drop constraint if exists callouts_format_check;
alter table callouts add constraint callouts_format_check
  check (format in ('1v1', 'triple_threat', 'fatal_4way', 'fatal_5way', 'elimination', 'open'));
