-- ============================================================
-- FIT BUDDIES — INITIAL SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  total_xp integer default 0 not null,
  weekly_xp integer default 0 not null,
  level integer default 1 not null,
  current_streak integer default 0 not null,
  longest_streak integer default 0 not null,
  last_active_date date,
  created_at timestamptz default now() not null
);

-- CIRCLES
create table if not exists circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references profiles(id),
  max_members integer default 30 not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

create table if not exists circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now() not null,
  unique(circle_id, user_id)
);

create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  code text unique not null,
  created_by uuid not null references profiles(id),
  max_uses integer default 30 not null,
  use_count integer default 0 not null,
  expires_at timestamptz,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

-- DAILY QUESTS
create table if not exists daily_quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  xp_reward integer not null,
  quest_type text not null,
  is_active boolean default true not null
);

create table if not exists quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  quest_id uuid not null references daily_quests(id),
  circle_id uuid not null references circles(id),
  completed_date date not null default current_date,
  xp_earned integer not null,
  created_at timestamptz default now() not null,
  unique(user_id, quest_id, completed_date)
);

-- WORKOUT LOGGING
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid not null references circles(id),
  title text not null,
  notes text,
  difficulty integer check (difficulty between 1 and 5),
  duration_minutes integer,
  xp_earned integer default 0 not null,
  logged_at timestamptz default now() not null
);

create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_name text not null,
  sets integer,
  reps integer,
  weight_kg numeric(6,2),
  notes text,
  sort_order integer default 0 not null
);

-- MEAL LOGGING
create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid not null references circles(id),
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_name text not null,
  calories integer,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1),
  notes text,
  xp_earned integer default 0 not null,
  logged_at timestamptz default now() not null
);

-- STEP LOGGING
create table if not exists step_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid not null references circles(id),
  step_count integer not null,
  step_goal integer default 10000 not null,
  goal_hit boolean default false not null,
  xp_earned integer default 0 not null,
  log_date date not null default current_date,
  created_at timestamptz default now() not null,
  unique(user_id, log_date)
);

-- XP EVENTS
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid not null references circles(id),
  action_type text not null,
  xp_amount integer not null,
  description text,
  reference_id uuid,
  created_at timestamptz default now() not null
);

-- CIRCLE CHALLENGES
create table if not exists circle_challenges (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  title text not null,
  description text,
  goal_xp integer not null,
  start_date date not null,
  end_date date not null,
  is_active boolean default true not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now() not null
);

create table if not exists challenge_progress (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references circle_challenges(id) on delete cascade,
  user_id uuid not null references profiles(id),
  xp_contributed integer default 0 not null,
  updated_at timestamptz default now() not null,
  unique(challenge_id, user_id)
);

-- CHAT
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz default now() not null
);

-- PUSH NOTIFICATIONS
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null,
  platform text check (platform in ('ios', 'android')),
  updated_at timestamptz default now() not null,
  unique(user_id, token)
);

create table if not exists notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  notification_type text not null,
  title text not null,
  body text not null,
  sent_at timestamptz default now() not null,
  opened boolean default false not null
);

-- RECIPES
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid not null references circles(id),
  title text not null,
  ingredients text not null,
  instructions text not null,
  calories_estimate integer,
  protein_estimate numeric(6,1),
  estimated_cost numeric(8,2),
  image_url text,
  created_at timestamptz default now() not null
);

-- GROCERY POSTS
create table if not exists grocery_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid not null references circles(id),
  item_name text not null,
  store text,
  price numeric(8,2),
  notes text,
  created_at timestamptz default now() not null
);

-- SUPPLEMENT POSTS
create table if not exists supplement_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid not null references circles(id),
  supplement_name text not null,
  category text,
  price numeric(8,2),
  notes text,
  created_at timestamptz default now() not null
);

-- MOTIVATIONAL MESSAGES
create table if not exists motivational_messages (
  id uuid primary key default gen_random_uuid(),
  message_type text not null,
  content text not null,
  is_active boolean default true not null
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table circles enable row level security;
alter table circle_members enable row level security;
alter table invite_codes enable row level security;
alter table daily_quests enable row level security;
alter table quest_completions enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table meal_logs enable row level security;
alter table step_logs enable row level security;
alter table xp_events enable row level security;
alter table circle_challenges enable row level security;
alter table challenge_progress enable row level security;
alter table chat_messages enable row level security;
alter table push_tokens enable row level security;
alter table notification_logs enable row level security;
alter table recipes enable row level security;
alter table grocery_posts enable row level security;
alter table supplement_posts enable row level security;
alter table motivational_messages enable row level security;

-- HELPER: check circle membership
create or replace function is_circle_member(p_circle_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from circle_members
    where circle_id = p_circle_id and user_id = auth.uid()
  );
$$;

-- PROFILES
create policy "view own profile" on profiles for select using (id = auth.uid());
create policy "update own profile" on profiles for update using (id = auth.uid());
create policy "insert own profile" on profiles for insert with check (id = auth.uid());

-- Allow circle-mates to see each other's profiles
create policy "view circle member profiles" on profiles for select
  using (
    exists (
      select 1 from circle_members cm1
      join circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid() and cm2.user_id = profiles.id
    )
  );

-- CIRCLES
create policy "members view circle" on circles for select using (is_circle_member(id));
create policy "owner updates circle" on circles for update using (owner_id = auth.uid());
create policy "authenticated creates circle" on circles for insert with check (auth.uid() is not null);

-- CIRCLE MEMBERS
create policy "members view member list" on circle_members for select using (is_circle_member(circle_id));
create policy "join circle" on circle_members for insert with check (user_id = auth.uid());

-- INVITE CODES
create policy "members view invite codes" on invite_codes for select using (is_circle_member(circle_id));
create policy "authenticated reads active codes" on invite_codes for select using (is_active = true);
create policy "members create invite codes" on invite_codes for insert with check (
  is_circle_member(circle_id) and created_by = auth.uid()
);
create policy "members update invite codes" on invite_codes for update using (is_circle_member(circle_id));

-- DAILY QUESTS (public read — no circle restriction)
create policy "anyone reads active quests" on daily_quests for select using (is_active = true);

-- QUEST COMPLETIONS
create policy "members read completions" on quest_completions for select using (is_circle_member(circle_id));
create policy "own quest completions" on quest_completions for insert with check (user_id = auth.uid());

-- WORKOUTS
create policy "members read workouts" on workouts for select using (is_circle_member(circle_id));
create policy "own insert workout" on workouts for insert with check (user_id = auth.uid());
create policy "own update workout" on workouts for update using (user_id = auth.uid());
create policy "own delete workout" on workouts for delete using (user_id = auth.uid());

-- WORKOUT EXERCISES
create policy "members read exercises" on workout_exercises for select
  using (exists (select 1 from workouts w where w.id = workout_exercises.workout_id and is_circle_member(w.circle_id)));
create policy "own insert exercises" on workout_exercises for insert
  with check (exists (select 1 from workouts w where w.id = workout_exercises.workout_id and w.user_id = auth.uid()));
create policy "own delete exercises" on workout_exercises for delete
  using (exists (select 1 from workouts w where w.id = workout_exercises.workout_id and w.user_id = auth.uid()));

-- MEAL LOGS
create policy "members read meals" on meal_logs for select using (is_circle_member(circle_id));
create policy "own insert meal" on meal_logs for insert with check (user_id = auth.uid());
create policy "own update meal" on meal_logs for update using (user_id = auth.uid());
create policy "own delete meal" on meal_logs for delete using (user_id = auth.uid());

-- STEP LOGS
create policy "members read steps" on step_logs for select using (is_circle_member(circle_id));
create policy "own insert steps" on step_logs for insert with check (user_id = auth.uid());
create policy "own update steps" on step_logs for update using (user_id = auth.uid());

-- XP EVENTS
create policy "members read xp events" on xp_events for select using (is_circle_member(circle_id));
create policy "own insert xp event" on xp_events for insert with check (user_id = auth.uid());

-- CHAT
create policy "members read chat" on chat_messages for select using (is_circle_member(circle_id));
create policy "members send chat" on chat_messages for insert
  with check (sender_id = auth.uid() and is_circle_member(circle_id));

-- PUSH TOKENS
create policy "own push tokens" on push_tokens for all using (user_id = auth.uid());

-- NOTIFICATION LOGS
create policy "own notification logs" on notification_logs for select using (user_id = auth.uid());

-- RECIPES
create policy "members read recipes" on recipes for select using (is_circle_member(circle_id));
create policy "own insert recipe" on recipes for insert with check (user_id = auth.uid());
create policy "own delete recipe" on recipes for delete using (user_id = auth.uid());

-- GROCERY POSTS
create policy "members read grocery posts" on grocery_posts for select using (is_circle_member(circle_id));
create policy "own insert grocery post" on grocery_posts for insert with check (user_id = auth.uid());
create policy "own delete grocery post" on grocery_posts for delete using (user_id = auth.uid());

-- SUPPLEMENT POSTS
create policy "members read supplement posts" on supplement_posts for select using (is_circle_member(circle_id));
create policy "own insert supplement post" on supplement_posts for insert with check (user_id = auth.uid());
create policy "own delete supplement post" on supplement_posts for delete using (user_id = auth.uid());

-- MOTIVATIONAL MESSAGES (public read)
create policy "anyone reads motivational messages" on motivational_messages for select using (is_active = true);

-- CIRCLE CHALLENGES
create policy "members read challenges" on circle_challenges for select using (is_circle_member(circle_id));
create policy "members insert challenges" on circle_challenges for insert with check (is_circle_member(circle_id));

-- CHALLENGE PROGRESS
create policy "members read progress" on challenge_progress for select
  using (exists (select 1 from circle_challenges cc where cc.id = challenge_progress.challenge_id and is_circle_member(cc.circle_id)));
create policy "own insert progress" on challenge_progress for insert with check (user_id = auth.uid());
create policy "own update progress" on challenge_progress for update using (user_id = auth.uid());

-- ============================================================
-- SEED: DEFAULT DAILY QUESTS
-- ============================================================
insert into daily_quests (title, description, xp_reward, quest_type) values
  ('Log a workout', 'Complete and log any workout today.', 20, 'workout'),
  ('Log a meal', 'Track at least one meal today.', 20, 'meal'),
  ('Log your steps', 'Enter your step count for today.', 20, 'steps'),
  ('Send an encouragement', 'Write a message in the group chat.', 20, 'chat'),
  ('Share something healthy', 'Post a recipe, grocery find, or supplement tip.', 20, 'share')
on conflict do nothing;

-- SEED: MOTIVATIONAL MESSAGES
insert into motivational_messages (message_type, content) values
  ('daily', 'Consistency beats perfection every single time.'),
  ('daily', 'One rep. One log. One step. That is enough for today.'),
  ('daily', 'Progress is not always visible. But it is always real.'),
  ('daily', 'Show up today. Your crew notices.'),
  ('comeback', 'You are back. That is the hardest part.'),
  ('comeback', 'The comeback is always stronger than the setback.'),
  ('encouragement', 'You are doing better than you think.'),
  ('encouragement', 'Hard days count too. You are still here.'),
  ('hard_day', 'Log one thing. Anything. That is your win for today.')
on conflict do nothing;
