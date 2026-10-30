-- Public mentor profiles (the directory) and private user settings.

-- Helpers used by policies live in a schema that the Data API does not expose.
create schema private;
grant usage on schema private to authenticated;

create function private.is_approved_mentor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and mentor_status = 'approved'
  );
$$;

revoke execute on function private.is_approved_mentor() from public, anon;
grant execute on function private.is_approved_mentor() to authenticated;

-- What a mentor chooses to make public. Kept apart from `profiles`, which
-- stays private: public and private data never share a table.
create table public.mentor_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  display_name text not null check (char_length(display_name) between 2 and 80),
  headline text not null default '' check (char_length(headline) <= 120),
  bio text not null default '' check (char_length(bio) <= 2000),
  skills text[] not null default '{}' check (cardinality(skills) <= 10),
  languages text[] not null default '{}' check (cardinality(languages) <= 6),
  timezone text not null default 'Europe/Paris',
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

create index mentor_profiles_skills_idx on public.mentor_profiles using gin (skills);
create index mentor_profiles_published_idx on public.mentor_profiles (is_published) where is_published;

create trigger mentor_profiles_set_updated_at
  before update on public.mentor_profiles
  for each row execute function public.set_updated_at();

alter table public.mentor_profiles enable row level security;

create policy "Anyone can read published mentor profiles"
  on public.mentor_profiles for select
  to anon, authenticated
  using (is_published);

create policy "Mentors can read their own profile, even unpublished"
  on public.mentor_profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Approved mentors can create their profile"
  on public.mentor_profiles for insert
  to authenticated
  with check ((select auth.uid()) = id and (select private.is_approved_mentor()));

create policy "Mentors can update their own profile"
  on public.mentor_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Privileges: visitors only read; mentors insert their row (the policy checks
-- approval) and update the public fields, never the id.
revoke insert, update, delete on public.mentor_profiles from anon, authenticated;
grant insert on public.mentor_profiles to authenticated;
grant update (slug, display_name, headline, bio, skills, languages, timezone, is_published)
  on public.mentor_profiles to authenticated;

-- Private notification preferences, one row per user.
create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email_booking_updates boolean not null default true,
  email_reminders boolean not null default true,
  email_product_news boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "Users manage their own settings"
  on public.user_settings for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke delete on public.user_settings from anon, authenticated;
revoke insert, update, select on public.user_settings from anon;
