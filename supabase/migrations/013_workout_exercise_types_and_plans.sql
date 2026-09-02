-- Per-exercise type. Existing rows all default to 'strength'. Never inferred
-- from wger's category — confirmed live that wger's own categorization isn't
-- a reliable strength/cardio signal — always an explicit user toggle.
alter table workout_exercises add column if not exists exercise_type text not null default 'strength' check (exercise_type in ('strength', 'cardio'));

-- Added vs. assisted weight. Reuses the existing weight_kg column as a plain
-- positive magnitude (per the locked decision); this just adds the mode.
alter table workout_exercises add column if not exists weight_mode text default 'added' check (weight_mode is null or weight_mode in ('added', 'assisted'));

-- Cardio fields, all null for strength rows. Seconds (not minutes) so short
-- intervals don't round to 0; the UI still shows a single "Duration (min)"
-- input and converts on save, matching the existing workout-level field.
alter table workout_exercises add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds > 0);
alter table workout_exercises add column if not exists distance_km numeric(6,2) check (distance_km is null or distance_km >= 0);
alter table workout_exercises add column if not exists avg_heart_rate_bpm smallint check (avg_heart_rate_bpm is null or avg_heart_rate_bpm between 30 and 250);
alter table workout_exercises add column if not exists cardio_intensity text check (cardio_intensity is null or cardio_intensity in ('low', 'moderate', 'high'));

-- Recurring schedule. days_of_week uses JS Date.getDay() convention
-- (0=Sunday..6=Saturday) so client-side "is today scheduled" needs no
-- remapping; its length IS the "how many times a week" count, no separate
-- frequency column that could drift out of sync.
create table if not exists workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid not null references circles(id),
  title text not null,
  source_workout_id uuid references workouts(id) on delete set null,
  days_of_week smallint[] not null check (
    array_length(days_of_week, 1) > 0 and days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  is_active boolean not null default true,
  created_at timestamptz default now() not null
);

alter table workout_plans enable row level security;

create policy "members read workout plans" on workout_plans for select using (is_circle_member(circle_id));
create policy "own insert workout plan" on workout_plans for insert with check (user_id = auth.uid());
create policy "own update workout plan" on workout_plans for update using (user_id = auth.uid());
create policy "own delete workout plan" on workout_plans for delete using (user_id = auth.uid());
