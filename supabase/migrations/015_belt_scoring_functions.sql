-- ============================================================================
-- THE BELT — scoring engine (Phase 1)
--
-- Categories scored here: login streak, training volume + progressive overload,
-- nutrition. Steps is a documented no-op (weight defaults to 0).
--
-- All day/week boundaries use Asia/Kuala_Lumpur, NOT UTC. The app's client-side
-- code computes dates with toISOString() (which is UTC) in several places — that
-- is a known inconsistency tracked separately. Nothing in this file trusts a
-- client-written date column; every boundary is derived from a timestamptz here.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tunable constants, centralised so calibration is a one-line change.
-- ----------------------------------------------------------------------------
create or replace function belt_config()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'timezone',                  'Asia/Kuala_Lumpur',
    'streak_target_days',        30,     -- streak length that earns full points
    'min_exercises_per_session', 6,
    'min_sets_per_exercise',     3,      -- warmup + 2 working sets; we only
                                         -- store one `sets` count per exercise,
                                         -- so this is the available proxy
    'min_cardio_seconds',        1800,   -- 30 minutes
    'min_sessions_per_week',     3,
    'full_exercise_value',       10,     -- TUNABLE: points for one progressed exercise
    'per_rep_value',             2,      -- TUNABLE: points per extra rep at same weight
    'max_raw_points_per_week',   90,     -- TUNABLE: normalisation divisor.
                                         -- 3 sessions x 6 exercises x 10 pts x ~50%
                                         -- progression rate. RECALIBRATE once real
                                         -- usage data exists.
    'nutrition_band_pct',        0.10    -- TUNABLE: +/- 10% of target counts as compliant
  );
$$;

-- ----------------------------------------------------------------------------
-- Mirrors estimateWorkoutCalories() in src/lib/energyEstimates.ts.
-- Keep the two in step: MET tables and MINUTES_PER_SET are duplicated there.
-- ----------------------------------------------------------------------------
create or replace function belt_workout_calories(p_workout_id uuid, p_weight_kg numeric)
returns numeric language plpgsql stable as $$
declare
  v_difficulty int; v_duration_min int; v_session_mets numeric;
  v_kcal numeric := 0; v_logged_min numeric := 0;
  v_min numeric; v_mets numeric; r record;
begin
  if p_weight_kg is null or p_weight_kg <= 0 then return 0; end if;

  select difficulty, duration_minutes into v_difficulty, v_duration_min
  from workouts where id = p_workout_id;

  v_session_mets := (array[3, 4, 5, 6.5, 8])[greatest(1, least(5, coalesce(v_difficulty, 3)))];

  for r in
    select exercise_type, duration_seconds, sets, cardio_intensity
    from workout_exercises where workout_id = p_workout_id
  loop
    if r.exercise_type = 'cardio' then
      v_min := coalesce(r.duration_seconds, 0) / 60.0;
      if v_min <= 0 then continue; end if;
      v_mets := case r.cardio_intensity
                  when 'low' then 4 when 'moderate' then 7 when 'high' then 10
                  else v_session_mets end;
    else
      v_min := coalesce(r.sets, 0) * 3;   -- MINUTES_PER_SET
      if v_min <= 0 then continue; end if;
      v_mets := 5;                        -- STRENGTH_METS
    end if;
    v_logged_min := v_logged_min + v_min;
    v_kcal := v_kcal + v_mets * 3.5 * p_weight_kg / 200 * v_min;
  end loop;

  -- Session time the logged exercises don't account for (warm-up, rest between
  -- blocks), credited at the session's overall intensity. Never double-counts.
  v_kcal := v_kcal + v_session_mets * 3.5 * p_weight_kg / 200
            * greatest(0, coalesce(v_duration_min, 0) - v_logged_min);

  return round(v_kcal);
end $$;

-- ----------------------------------------------------------------------------
-- Authoritative daily calorie target. This is now the SINGLE source of truth —
-- the app should read it via RPC rather than recomputing in TypeScript, so the
-- number a user is scored against is provably the number they were shown.
-- Returns null when the profile lacks the metrics needed to compute one.
-- ----------------------------------------------------------------------------
create or replace function belt_daily_calorie_target(p_user_id uuid, p_date date)
returns integer language plpgsql stable as $$
declare
  p record; v_tz text := belt_config()->>'timezone';
  v_base numeric; v_exercise numeric := 0; v_maintenance numeric; v_delta numeric;
begin
  select weight_kg, height_cm, age, gender, fitness_goal, calorie_goal_mode, custom_calorie_goal
    into p from profiles where id = p_user_id;
  if not found then return null; end if;

  if p.calorie_goal_mode = 'custom' and p.custom_calorie_goal is not null then
    return p.custom_calorie_goal;
  end if;

  if p.weight_kg is null or p.height_cm is null or p.age is null or p.gender is null then
    return null;
  end if;

  -- Mifflin-St Jeor x 1.2 sedentary multiplier
  v_base := round((10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age
            + case when p.gender = 'male' then 5 else -161 end) * 1.2);

  select coalesce(sum(belt_workout_calories(w.id, p.weight_kg)), 0) into v_exercise
  from workouts w
  where w.user_id = p_user_id
    and (w.logged_at at time zone v_tz)::date = p_date;

  v_maintenance := v_base + v_exercise;

  v_delta := case coalesce(p.fitness_goal, 'recomposition')
    when 'lose_fat'      then -least(450, greatest(250, round(v_maintenance * 0.15)))
    when 'build_muscle'  then  least(300, greatest(150, round(v_maintenance * 0.08)))
    when 'recomposition' then -150
    else 0 end;

  return (round((v_maintenance + v_delta) / 10.0) * 10)::integer;
end $$;

grant execute on function belt_daily_calorie_target(uuid, date) to authenticated;

-- ----------------------------------------------------------------------------
-- Bootstrap: create the belt (if absent) and open a scoring period.
-- SECURITY DEFINER so it can write champion-adjacent rows users cannot touch,
-- but gated on circle membership.
-- ----------------------------------------------------------------------------
-- Internal: no membership check, because the scorer calls this from pg_cron
-- where there is no auth.uid() and is_circle_member() would always be false.
create or replace function belt_open_challenge(p_circle_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_belt circle_belts; v_challenge_id uuid; v_len interval;
begin
  select * into v_belt from circle_belts where circle_id = p_circle_id;
  if not found then
    insert into circle_belts (circle_id) values (p_circle_id) returning * into v_belt;
  end if;

  if exists (select 1 from title_challenges
             where circle_id = p_circle_id and status in ('active', 'extended')) then
    raise exception 'a challenge is already running for this circle';
  end if;

  -- First-ever challenge runs 30 days; defences use the belt's cadence.
  v_len := case
    when v_belt.current_champion_id is null then interval '30 days'
    when v_belt.defense_cycle = 'weekly'    then interval '7 days'
    when v_belt.defense_cycle = 'monthly'   then interval '1 month'
    else interval '3 months' end;

  insert into title_challenges (circle_id, started_at, ends_at, status, weights_snapshot)
  values (p_circle_id, now(), now() + v_len, 'active', v_belt.category_weights)
  returning id into v_challenge_id;

  return v_challenge_id;
end $$;

revoke all on function belt_open_challenge(uuid) from public, anon, authenticated;

-- User-facing wrapper: same thing, gated on circle membership.
create or replace function start_title_challenge(p_circle_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not is_circle_member(p_circle_id) then
    raise exception 'not a member of this circle';
  end if;
  return belt_open_challenge(p_circle_id);
end $$;

grant execute on function start_title_challenge(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- The scorer. Idempotent: always recomputes from source data, never increments,
-- so it is safe to re-run any number of times per day.
-- ----------------------------------------------------------------------------
create or replace function calculate_belt_scores()
returns void language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := belt_config();
  v_tz text := cfg->>'timezone';
  v_today date := (now() at time zone (cfg->>'timezone'))::date;
  ch record; m record; r record;
  v_weights jsonb;
  v_win_start date; v_win_end date; v_score_end date;
  v_streak int; v_last_active date; v_elim_date date; v_elim_reason text;
  v_raw numeric; v_pts numeric; v_pct numeric; v_allowed numeric;
  v_prev_metric numeric; v_cur_metric numeric;
  v_weeks int; v_max_raw numeric;
  -- NB: no single-letter names here. plpgsql resolves an identifier to a
  -- variable before a column, so a variable named `d` makes every `as d`
  -- column alias below ambiguous (42702).
  v_days int; v_compliant int; v_target int; v_intake numeric; v_day date;
  v_login numeric; v_training numeric; v_nutrition numeric;
  v_valid_ids uuid[];
  v_winner uuid; v_top numeric; v_tied int; v_belt circle_belts;
begin
for ch in select * from title_challenges where status in ('active', 'extended') loop
  v_weights   := ch.weights_snapshot;
  v_win_start := (ch.started_at at time zone v_tz)::date;
  v_win_end   := least(v_today, (ch.ends_at at time zone v_tz)::date);

  for m in select user_id from circle_members where circle_id = ch.circle_id loop
    v_elim_date := null; v_elim_reason := null;

    -- ---- Valid sessions in the window -----------------------------------
    select coalesce(array_agg(w.id), '{}'::uuid[]) into v_valid_ids
    from workouts w
    where w.user_id = m.user_id
      and (w.logged_at at time zone v_tz)::date between v_win_start and v_win_end
      and (
        (select count(*) from workout_exercises e
          where e.workout_id = w.id
            and coalesce(e.sets, 0) >= (cfg->>'min_sets_per_exercise')::int)
          >= (cfg->>'min_exercises_per_session')::int
        or
        (select coalesce(sum(e.duration_seconds), 0) from workout_exercises e
          where e.workout_id = w.id and e.exercise_type = 'cardio')
          >= (cfg->>'min_cardio_seconds')::int
      );

    -- ---- Weekly checklist ------------------------------------------------
    v_weeks := greatest(1, ceil((v_win_end - v_win_start + 1) / 7.0)::int);
    for i in 1..v_weeks loop
      declare
        w_start date := v_win_start + (i - 1) * 7;
        w_end   date := v_win_start + (i * 7) - 1;
        w_count int;
      begin
        select count(*) into w_count from workouts w
        where w.id = any(v_valid_ids)
          and (w.logged_at at time zone v_tz)::date between w_start and w_end;

        insert into title_challenge_weeks
          (challenge_id, user_id, week_number, week_start, week_end,
           valid_session_count, requirement_met, updated_at)
        values (ch.id, m.user_id, i, w_start, w_end, w_count,
                w_count >= (cfg->>'min_sessions_per_week')::int, now())
        on conflict (challenge_id, user_id, week_number) do update
          set valid_session_count = excluded.valid_session_count,
              requirement_met     = excluded.requirement_met,
              updated_at          = now();

        -- Only a fully elapsed week can eliminate.
        if w_end < v_today
           and w_count < (cfg->>'min_sessions_per_week')::int
           and v_elim_date is null then
          v_elim_date := w_end; v_elim_reason := 'missed_weekly_sessions';
        end if;
      end;
    end loop;

    -- ---- Login/activity streak, derived from xp_events -------------------
    -- Deliberately NOT profiles.current_streak: that value is maintained
    -- client-side against UTC dates and can double-increment within one local
    -- day. Elimination hangs off this, so it is recomputed from timestamps.
    select max(log_day) into v_last_active from (
      select distinct (created_at at time zone v_tz)::date as log_day
      from xp_events
      where user_id = m.user_id and circle_id = ch.circle_id
        and (created_at at time zone v_tz)::date between v_win_start and v_win_end
    ) x;

    if v_last_active is null then
      v_streak := 0;
    else
      -- Gaps-and-islands: consecutive dates share a constant (date - row_number),
      -- so the run containing the most recent active day is one group.
      with active_days as (
        select distinct (created_at at time zone v_tz)::date as log_day
        from xp_events
        where user_id = m.user_id and circle_id = ch.circle_id
          and (created_at at time zone v_tz)::date between v_win_start and v_win_end
      ),
      grouped as (
        select log_day, log_day - (row_number() over (order by log_day))::int as grp
        from active_days
      )
      select count(*) into v_streak
      from grouped
      where grp = (select grp from grouped where log_day = v_last_active);
    end if;

    -- A gap of more than one day breaks it. Scoring runs just after midnight,
    -- so "yesterday" still counts as live.
    if v_elim_date is null
       and v_win_end > v_win_start
       and (v_last_active is null or v_last_active < v_today - 1) then
      v_elim_date := coalesce(v_last_active + 1, v_win_start);
      v_elim_reason := 'login_streak_broken';
    end if;

    -- Once eliminated, freeze scoring at that date. Recomputing to a fixed
    -- endpoint is what keeps this function idempotent.
    v_score_end := coalesce(v_elim_date, v_win_end);

    -- ---- 1. Login streak points ------------------------------------------
    v_login := least(1.0, v_streak::numeric / (cfg->>'streak_target_days')::numeric)
               * coalesce((v_weights->>'login_streak')::numeric, 0);

    -- ---- 2. Training volume + progressive overload ------------------------
    v_raw := 0;
    for r in
      select cur.id as we_id, cur.exercise_name, cur.exercise_type,
             cur.weight_kg as cur_w, cur.reps as cur_r,
             cur.duration_seconds as cur_dur, cur.distance_km as cur_dist,
             w.id as workout_id,
             prev.weight_kg as prev_w, prev.reps as prev_r,
             prev.duration_seconds as prev_dur, prev.distance_km as prev_dist
      from workouts w
      join workout_exercises cur on cur.workout_id = w.id
      left join lateral (
        select pe.weight_kg, pe.reps, pe.duration_seconds, pe.distance_km
        from workouts pw
        join workout_exercises pe on pe.workout_id = pw.id
        where pw.user_id = w.user_id
          and pw.logged_at < w.logged_at
          and lower(pe.exercise_name) = lower(cur.exercise_name)
        order by pw.logged_at desc
        limit 1
      ) prev on true
      where w.id = any(v_valid_ids)
        and (w.logged_at at time zone v_tz)::date <= v_score_end
    loop
      v_pts := 0;

      if r.exercise_type = 'cardio' then
        -- Duration is the primary metric, distance the fallback.
        v_cur_metric  := coalesce(r.cur_dur,  r.cur_dist);
        v_prev_metric := coalesce(r.prev_dur, r.prev_dist);
        if v_prev_metric is not null and v_prev_metric > 0 and v_cur_metric is not null then
          v_pct := (v_cur_metric - v_prev_metric) / v_prev_metric * 100;
          if v_pct > 100 then
            insert into training_volume_anomalies
              (challenge_id, user_id, workout_id, workout_exercise_id, exercise_name,
               previous_weight_kg, current_weight_kg, weight_increase_pct)
            values (ch.id, m.user_id, r.workout_id, r.we_id, r.exercise_name,
                    v_prev_metric, v_cur_metric, v_pct);
          elsif v_pct > 0 then
            v_pts := (cfg->>'full_exercise_value')::numeric;
          end if;
        end if;

      else
        if r.prev_w is not null and r.prev_w > 0 and r.cur_w is not null then
          v_pct := (r.cur_w - r.prev_w) / r.prev_w * 100;

          if v_pct > 100 then
            -- Almost certainly a typo. Log it, score nothing, stay visible.
            insert into training_volume_anomalies
              (challenge_id, user_id, workout_id, workout_exercise_id, exercise_name,
               previous_weight_kg, current_weight_kg, weight_increase_pct)
            values (ch.id, m.user_id, r.workout_id, r.we_id, r.exercise_name,
                    r.prev_w, r.cur_w, v_pct);

          elsif v_pct > 50 then
            v_pts := (cfg->>'full_exercise_value')::numeric;      -- bonus tier

          elsif v_pct >= 21 then
            -- allowed rep drop scales linearly 21% -> 3 reps, 50% -> 6 reps
            v_allowed := 3 + (v_pct - 21) * 3 / 29;
            if coalesce(r.cur_r, 0) >= coalesce(r.prev_r, 0) - v_allowed then
              v_pts := (cfg->>'full_exercise_value')::numeric;
            end if;

          elsif v_pct > 0 then
            if coalesce(r.cur_r, 0) >= coalesce(r.prev_r, 0) then
              v_pts := (cfg->>'full_exercise_value')::numeric;
            end if;

          elsif v_pct = 0 and coalesce(r.cur_r, 0) > coalesce(r.prev_r, 0) then
            v_pts := least((cfg->>'full_exercise_value')::numeric,
                           (cfg->>'per_rep_value')::numeric * (r.cur_r - r.prev_r));
          end if;
        end if;
        -- No prior session => no progression to measure => 0. Deliberate: any
        -- baseline award here would be farmable by inventing new exercise names.
      end if;

      v_raw := v_raw + v_pts;
    end loop;

    v_max_raw := (cfg->>'max_raw_points_per_week')::numeric
                 * greatest(1, ceil((v_score_end - v_win_start + 1) / 7.0));
    v_training := least(1.0, v_raw / nullif(v_max_raw, 0))
                  * coalesce((v_weights->>'training_volume')::numeric, 0);

    -- ---- 3. Nutrition (never eliminates) ----------------------------------
    v_days := 0; v_compliant := 0;
    v_day := v_win_start;
    while v_day <= v_score_end loop
      v_target := belt_daily_calorie_target(m.user_id, v_day);
      if v_target is not null then
        v_days := v_days + 1;
        select coalesce(sum(calories), 0) into v_intake
        from meal_logs
        where user_id = m.user_id
          and (logged_at at time zone v_tz)::date = v_day;
        if v_intake > 0
           and v_intake between v_target * (1 - (cfg->>'nutrition_band_pct')::numeric)
                            and v_target * (1 + (cfg->>'nutrition_band_pct')::numeric) then
          v_compliant := v_compliant + 1;
        end if;
      end if;
      v_day := v_day + 1;
    end loop;
    v_nutrition := case when v_days = 0 then 0
                        else v_compliant::numeric / v_days
                             * coalesce((v_weights->>'nutrition')::numeric, 0) end;

    -- ---- 4. Steps — intentional no-op ------------------------------------
    -- Weight defaults to 0. To enable: update the circle's category_weights and
    -- replace this line with a relative-ranking calculation over step_logs.

    insert into title_challenge_scores
      (challenge_id, user_id, login_streak_points, training_volume_points,
       nutrition_points, steps_points, is_eliminated, eliminated_at,
       eliminated_reason, updated_at)
    values (ch.id, m.user_id, v_login, v_training, v_nutrition, 0,
            v_elim_date is not null,
            case when v_elim_date is not null then v_elim_date::timestamptz end,
            v_elim_reason, now())
    on conflict (challenge_id, user_id) do update
      set login_streak_points    = excluded.login_streak_points,
          training_volume_points = excluded.training_volume_points,
          nutrition_points       = excluded.nutrition_points,
          steps_points           = excluded.steps_points,
          is_eliminated          = excluded.is_eliminated,
          eliminated_at          = excluded.eliminated_at,
          eliminated_reason      = excluded.eliminated_reason,
          updated_at             = now();
  end loop;  -- members

  -- ---- Resolution ---------------------------------------------------------
  if now() >= ch.ends_at then
    select max(total_points) into v_top
    from title_challenge_scores where challenge_id = ch.id and not is_eliminated;

    if v_top is null then
      -- Everyone eliminated: extend a day and keep scoring.
      update title_challenges set status = 'extended', ends_at = ends_at + interval '1 day'
      where id = ch.id;
    else
      select count(*) into v_tied
      from title_challenge_scores
      where challenge_id = ch.id and not is_eliminated and total_points = v_top;

      if v_tied > 1 then
        -- TODO: circle council/vote tie-break plugs in here.
        update title_challenges set status = 'extended', ends_at = ends_at + interval '1 day'
        where id = ch.id;
      else
        select user_id into v_winner
        from title_challenge_scores
        where challenge_id = ch.id and not is_eliminated and total_points = v_top;

        update title_challenges
          set status = 'resolved', winner_user_id = v_winner, resolved_at = now()
        where id = ch.id;

        select * into v_belt from circle_belts where circle_id = ch.circle_id;

        insert into championship_records (user_id, total_reigns, first_won_at)
        values (v_winner, 0, now())
        on conflict (user_id) do nothing;

        if v_belt.current_champion_id = v_winner then
          -- Successful defence: reign continues.
          update championship_records
            set total_defenses = total_defenses + 1,
                current_streak_as_champion = current_streak_as_champion + 1,
                longest_reign_cycles = greatest(longest_reign_cycles,
                                                current_streak_as_champion + 1),
                updated_at = now()
          where user_id = v_winner;
        else
          -- Belt changes hands. The outgoing champion keeps their totals as
          -- permanent history; only the live streak resets.
          if v_belt.current_champion_id is not null then
            update championship_records
              set current_streak_as_champion = 0, updated_at = now()
            where user_id = v_belt.current_champion_id;
          end if;
          update championship_records
            set total_reigns = total_reigns + 1,
                current_streak_as_champion = 1,
                longest_reign_cycles = greatest(longest_reign_cycles, 1),
                first_won_at = coalesce(first_won_at, now()),
                updated_at = now()
          where user_id = v_winner;

          -- Only a title CHANGE is worth waking people up for; a successful
          -- defence is not news to the rest of the circle. Fire-and-forget via
          -- pg_net, and never let it affect the crowning.
          perform belt_notify_champion(ch.circle_id, v_winner);
        end if;

        update circle_belts
          set current_champion_id = v_winner,
              reign_started_at = case when current_champion_id is distinct from v_winner
                                      then now() else reign_started_at end,
              current_cycle_started_at = now()
        where circle_id = ch.circle_id;

        -- Open the next defence cycle immediately.
        perform belt_open_challenge(ch.circle_id);
      end if;
    end if;
  end if;
end loop;  -- challenges
end $$;

revoke all on function calculate_belt_scores() from public, anon, authenticated;
