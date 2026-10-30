-- Profiles: one row per user, created automatically at sign-up.

create type public.user_role as enum ('learner', 'mentor', 'admin');
create type public.mentor_status as enum ('none', 'pending', 'approved');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  role public.user_role not null default 'learner',
  mentor_status public.mentor_status not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application data about each user. Private: only the owner can read it.';

-- 1. Row Level Security: deny everything, then allow precise cases.
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 2. Column privileges: RLS decides WHICH ROWS, grants decide WHICH COLUMNS.
-- Without this, a user could update their own row and set role = 'admin'.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 3. Keep updated_at current.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4. Create the profile when Supabase Auth creates a user.
-- The requested role is never trusted: everyone starts as a learner, and a
-- request to mentor is recorded as 'pending' for a coordinator to approve.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, mentor_status)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100),
    case when new.raw_user_meta_data ->> 'intent' = 'mentor'
         then 'pending'::public.mentor_status
         else 'none'::public.mentor_status end
  );
  return new;
end;
$$;

-- Only the trigger may run this function.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
