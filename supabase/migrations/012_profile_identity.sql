alter table public.profiles
  add column if not exists avatar_source text not null default 'photo'
    check (avatar_source in ('photo', 'ai')),
  add column if not exists ai_avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

-- Dropped first so this file stays safe to re-run; bare `create policy`
-- raises 42710 if the policy is already there.
drop policy if exists "authenticated users upload own avatar" on storage.objects;
create policy "authenticated users upload own avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and owner_id = auth.uid()::text);

drop policy if exists "public avatar viewing" on storage.objects;
create policy "public avatar viewing"
on storage.objects for select to public
using (bucket_id = 'avatars');
