-- Baseline-relative ranking: rank members by improvement over their own
-- starting point instead of raw weekly XP, so newer/less-experienced members
-- can compete fairly against long-time members.
alter table profiles add column if not exists baseline_weekly_xp numeric;
