-- ============================================================================
-- Photo-based meal logging.
--
-- Photos of your own food are personal, so this bucket is PRIVATE and scoped to
-- a per-user folder (<user_id>/<file>). The app reads them back through signed
-- URLs; the analysis Edge Function reads them server-side with the service role.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Dropped first so this file stays re-runnable; bare `create policy` raises
-- 42710 when the policy already exists.
drop policy if exists "own meal photo upload" on storage.objects;
create policy "own meal photo upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "own meal photo read" on storage.objects;
create policy "own meal photo read"
on storage.objects for select to authenticated
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "own meal photo delete" on storage.objects;
create policy "own meal photo delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- The storage path, kept separate from food_image_url — that column holds
-- public URLs from the food database, whereas this one needs signing.
alter table meal_logs add column if not exists photo_path text;

-- Every analysis is recorded: it makes bad estimates diagnosable after the
-- fact, and lets us compare what the model said against what the user
-- corrected — which is the only honest way to know if the feature is any good.
create table if not exists meal_photo_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  photo_path text not null,
  model text not null,
  items jsonb not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_meal_analyses_user
  on meal_photo_analyses (user_id, created_at desc);

alter table meal_photo_analyses enable row level security;
revoke all on meal_photo_analyses from anon, authenticated;
grant select on meal_photo_analyses to authenticated;

create policy "own analyses" on meal_photo_analyses
  for select to authenticated using (user_id = auth.uid());
