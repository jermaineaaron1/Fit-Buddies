-- Exercise-library metadata captured when picked from the wger API instead of
-- typed manually. Null when manually entered.
alter table workout_exercises add column if not exists wger_exercise_id integer;
alter table workout_exercises add column if not exists exercise_image_url text;

-- Food-library metadata + quantity/unit. Null when not applicable.
alter table meal_logs add column if not exists quantity numeric(8,2);
alter table meal_logs add column if not exists quantity_unit text
  check (quantity_unit in ('g','oz','tsp','tbsp','cup','serving'));
alter table meal_logs add column if not exists off_food_id text;
alter table meal_logs add column if not exists food_image_url text;
