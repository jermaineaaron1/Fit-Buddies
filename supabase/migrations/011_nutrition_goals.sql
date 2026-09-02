alter table public.profiles
  add column if not exists fitness_goal text not null default 'recomposition'
    check (fitness_goal in ('lose_fat', 'build_muscle', 'recomposition', 'maintain')),
  add column if not exists calorie_goal_mode text not null default 'recommended'
    check (calorie_goal_mode in ('recommended', 'custom')),
  add column if not exists custom_calorie_goal integer
    check (custom_calorie_goal is null or custom_calorie_goal between 800 and 8000);
