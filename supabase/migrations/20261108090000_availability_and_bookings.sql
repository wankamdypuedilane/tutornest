-- TutorNest: mentor availability and session bookings.

-- btree_gist lets a GiST index combine "same mentor" (=) with "overlapping
-- time" (&&) in one exclusion constraint. Supabase keeps extensions in their
-- own schema.
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Weekly availability, in the mentor's own time zone (mentor_profiles.timezone).
-- weekday follows ISO 8601: 1 = Monday ... 7 = Sunday.
-- ---------------------------------------------------------------------------
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentor_profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint availability_in_order check (end_time > start_time),
  -- Slots start on the hour or the half hour.
  constraint availability_on_half_hours check (
    extract(minute from start_time) in (0, 30) and extract(second from start_time) = 0
    and extract(minute from end_time) in (0, 30) and extract(second from end_time) = 0
  )
);

create index availability_rules_mentor_idx on public.availability_rules (mentor_id, weekday);

alter table public.availability_rules enable row level security;

create policy "Anyone reads the availability of published mentors"
  on public.availability_rules for select
  to anon, authenticated
  using (exists (
    select 1 from public.mentor_profiles m
    where m.id = availability_rules.mentor_id and m.is_published
  ));

create policy "Mentors read their own availability"
  on public.availability_rules for select
  to authenticated
  using ((select auth.uid()) = mentor_id);

create policy "Mentors manage their own availability"
  on public.availability_rules for insert
  to authenticated
  with check ((select auth.uid()) = mentor_id);

create policy "Mentors delete their own availability"
  on public.availability_rules for delete
  to authenticated
  using ((select auth.uid()) = mentor_id);

revoke insert, update, delete on public.availability_rules from anon, authenticated;
grant insert (mentor_id, weekday, start_time, end_time) on public.availability_rules to authenticated;
grant delete on public.availability_rules to authenticated;

-- ---------------------------------------------------------------------------
-- Bookings. Times are stored as instants (timestamptz, UTC inside PostgreSQL);
-- time zones only matter when a person reads or chooses them.
-- ---------------------------------------------------------------------------
create type public.booking_status as enum ('confirmed', 'cancelled', 'completed');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentor_profiles (id) on delete cascade,
  learner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'confirmed',
  -- The mentor needs the learner's name, not access to their private profile.
  learner_name text not null default '',
  created_at timestamptz not null default now(),
  constraint booking_length check (ends_at - starts_at in (interval '30 minutes', interval '60 minutes')),
  constraint booking_not_with_self check (learner_id <> mentor_id),
  -- The heart of the chapter: two confirmed bookings of the same mentor can
  -- never overlap, whatever the application does. '[)' = end excluded, so
  -- back-to-back sessions (17:00-18:00, 18:00-19:00) are allowed.
  constraint no_double_booking_for_mentor exclude using gist (
    mentor_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed'),
  constraint no_double_booking_for_learner exclude using gist (
    learner_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed')
);

create index bookings_learner_idx on public.bookings (learner_id, starts_at);

-- Copies the learner's name when the booking is made (profiles stay private).
create function private.set_learner_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.full_name into new.learner_name from public.profiles p where p.id = new.learner_id;
  new.learner_name := coalesce(new.learner_name, '');
  return new;
end;
$$;

revoke execute on function private.set_learner_name() from public, anon, authenticated;

create trigger bookings_set_learner_name
  before insert on public.bookings
  for each row execute function private.set_learner_name();

-- Does [starts_at, ends_at) fall inside one of the mentor's weekly rules, read
-- in the mentor's time zone? PostgreSQL's time zone database handles daylight
-- saving time: 18:00 in Paris is 17:00 UTC in winter and 16:00 UTC in summer.
create function private.fits_availability(mentor uuid, starts_at timestamptz, ends_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.mentor_profiles m
    join public.availability_rules r on r.mentor_id = m.id
    cross join lateral (
      select starts_at at time zone m.timezone as local_start,
             ends_at at time zone m.timezone as local_end
    ) t
    where m.id = mentor
      and m.is_published
      and extract(isodow from t.local_start) = r.weekday
      and t.local_start::date = t.local_end::date
      and t.local_start::time >= r.start_time
      and t.local_end::time <= r.end_time
      and extract(minute from t.local_start) in (0, 30)
      and extract(second from t.local_start) = 0
  );
$$;

revoke execute on function private.fits_availability(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function private.fits_availability(uuid, timestamptz, timestamptz) to authenticated;

alter table public.bookings enable row level security;

create policy "Participants read their bookings"
  on public.bookings for select
  to authenticated
  using ((select auth.uid()) in (learner_id, mentor_id));

-- Rules that depend on the current time cannot be CHECK constraints (they must
-- be immutable): they live in the policy.
create policy "Learners book available slots"
  on public.bookings for insert
  to authenticated
  with check (
    learner_id = (select auth.uid())
    and starts_at >= now() + interval '1 hour'
    and private.fits_availability(mentor_id, starts_at, ends_at)
  );

create policy "Participants cancel more than 24 hours ahead"
  on public.bookings for update
  to authenticated
  using (
    (select auth.uid()) in (learner_id, mentor_id)
    and status = 'confirmed'
    and starts_at > now() + interval '24 hours'
  )
  with check (status = 'cancelled');

revoke insert, update, delete on public.bookings from anon, authenticated;
revoke select on public.bookings from anon;
grant insert (mentor_id, starts_at, ends_at) on public.bookings to authenticated;
grant update (status) on public.bookings to authenticated;

-- Busy times of a mentor, without saying who booked them: what the public
-- booking page needs, and nothing more. At most 62 days per call.
create function public.mentor_busy_times(mentor uuid, from_time timestamptz, to_time timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.starts_at, b.ends_at
  from public.bookings b
  where b.mentor_id = mentor
    and b.status = 'confirmed'
    and tstzrange(b.starts_at, b.ends_at, '[)')
        && tstzrange(from_time, least(to_time, from_time + interval '62 days'), '[)')
  order by b.starts_at;
$$;

revoke execute on function public.mentor_busy_times(uuid, timestamptz, timestamptz) from public;
grant execute on function public.mentor_busy_times(uuid, timestamptz, timestamptz) to anon, authenticated;
