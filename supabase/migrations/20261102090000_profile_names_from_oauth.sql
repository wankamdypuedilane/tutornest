-- Google (and other OAuth providers) send the user's name as `name` or
-- `full_name` in the identity data. Accept both. Migrations never edit an
-- applied file: they add a new one that replaces the function.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, mentor_status)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      ''
    ), 100),
    case when new.raw_user_meta_data ->> 'intent' = 'mentor'
         then 'pending'::public.mentor_status
         else 'none'::public.mentor_status end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
