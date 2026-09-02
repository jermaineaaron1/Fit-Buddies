-- Re-assert the "join circle" insert policy: live testing found that joining
-- a circle via invite code (POST circle_members with user_id = self) was
-- being rejected with a row-level security violation, even though this
-- policy is defined in 001_initial_schema.sql. Likely lost when an earlier
-- migration run stopped partway through, same class of gap fixed for
-- profiles (002) and circles (003).
drop policy if exists "join circle" on circle_members;

create policy "join circle"
  on circle_members for insert
  with check (user_id = auth.uid());
