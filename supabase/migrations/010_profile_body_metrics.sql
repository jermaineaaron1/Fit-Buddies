-- Private body metrics used for personal fitness tracking and unit display.
-- These columns live on profiles, whose existing RLS policies control access.
alter table profiles
  add column if not exists height_cm numeric(5,2),
  add column if not exists gender text check (gender in ('male', 'female')),
  add column if not exists weight_kg numeric(6,2),
  add column if not exists age smallint check (age between 13 and 120),
  add column if not exists body_fat_percentage numeric(4,1) check (body_fat_percentage between 1 and 75),
  add column if not exists muscle_mass_kg numeric(6,2) check (muscle_mass_kg > 0),
  add column if not exists preferred_height_unit text default 'cm' check (preferred_height_unit in ('cm', 'ft')),
  add column if not exists preferred_weight_unit text default 'kg' check (preferred_weight_unit in ('kg', 'lb'));

