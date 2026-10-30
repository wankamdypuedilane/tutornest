-- Avatars: a public Storage bucket, one folder per user, and the path saved
-- on the profile (and on the public mentor profile).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/png', 'image/jpeg', 'image/webp']);

-- Each user may write only inside the folder named after their user id:
--   avatars/<user-id>/avatar-1730280000000.webp
create policy "Users upload avatars into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users replace or delete their own avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Public bucket: files are served by URL without a policy. Listing the bucket
-- through the API still needs a select policy; we allow users to list their own folder.
create policy "Users list their own avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.profiles
  add column avatar_path text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+$');
alter table public.mentor_profiles
  add column avatar_path text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+$');

-- The path must point into the user's own folder.
alter table public.profiles
  add constraint profiles_avatar_in_own_folder check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);
alter table public.mentor_profiles
  add constraint mentor_profiles_avatar_in_own_folder check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);

grant update (avatar_path) on public.profiles to authenticated;
grant update (avatar_path) on public.mentor_profiles to authenticated;
