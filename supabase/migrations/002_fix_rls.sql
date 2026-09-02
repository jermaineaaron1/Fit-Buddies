-- Fix profile insert policy to allow signup flow
drop policy if exists "insert own profile" on profiles;

create policy "insert own profile"
  on profiles for insert
  with check (id = auth.uid());
