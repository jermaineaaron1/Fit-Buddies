-- ============================================================================
-- InBody / body-composition printout scanning.
--
-- Separate bucket from meal photos: these sheets carry a person's full body
-- composition and often their name and date of birth, so they get their own
-- private, per-user store rather than sharing space with food pictures.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('body-scans', 'body-scans', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "own body scan upload" on storage.objects;
create policy "own body scan upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'body-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "own body scan read" on storage.objects;
create policy "own body scan read"
on storage.objects for select to authenticated
using (
  bucket_id = 'body-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "own body scan delete" on storage.objects;
create policy "own body scan delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'body-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Keeps the source sheet attached to the reading, so a number that looks wrong
-- months later can be checked against the printout it came from.
alter table body_measurements add column if not exists scan_path text;

-- InBody reports Skeletal Muscle Mass, which is a smaller figure than the
-- "muscle mass" some bathroom scales report. Recording which convention a row
-- used stops a device switch from looking like sudden muscle loss.
alter table body_measurements add column if not exists muscle_mass_basis text
  check (muscle_mass_basis is null or muscle_mass_basis in ('skeletal', 'total'));
