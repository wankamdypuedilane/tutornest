-- TutorNest: notifications (in the app and by e-mail) for bookings.

-- E-mails show times in the learner's zone: the browser sends it with the booking.
alter table public.bookings
  add column learner_timezone text not null default 'UTC'
    check (learner_timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$');
grant insert (learner_timezone) on public.bookings to authenticated;

create type public.notification_kind as enum ('booking_confirmed', 'booking_cancelled', 'session_reminder');
create type public.email_status as enum ('pending', 'sending', 'sent', 'skipped', 'failed');

-- One row per person and event. It is both the in-app notification and the
-- e-mail to send (an "outbox"): it is written in the same transaction as the
-- booking, so an event is never lost, even if the e-mail provider is down.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind public.notification_kind not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  email_status public.email_status not null default 'pending',
  email_attempts smallint not null default 0,
  email_claimed_at timestamptz,
  email_sent_at timestamptz,
  email_message_id text,
  email_error text,
  -- Retries, double clicks and concurrent jobs can never create a duplicate.
  constraint one_notification_per_event unique (user_id, booking_id, kind)
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_outbox_idx on public.notifications (created_at)
  where email_status in ('pending', 'sending');

-- Bookings create notifications for both participants, respecting their
-- e-mail preferences (a missing settings row means the defaults: yes).
create function private.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event public.notification_kind;
begin
  if tg_op = 'INSERT' and new.status = 'confirmed' then
    event := 'booking_confirmed';
  elsif tg_op = 'UPDATE' and old.status = 'confirmed' and new.status = 'cancelled' then
    event := 'booking_cancelled';
  else
    return new;
  end if;

  insert into public.notifications (user_id, booking_id, kind, email_status)
  select p.user_id, new.id, event,
         case when coalesce(s.email_booking_updates, true) then 'pending' else 'skipped' end::public.email_status
  from (values (new.learner_id), (new.mentor_id)) as p (user_id)
  left join public.user_settings s on s.user_id = p.user_id
  on conflict on constraint one_notification_per_event do nothing;
  return new;
end;
$$;

revoke execute on function private.notify_booking_change() from public, anon, authenticated;

create trigger bookings_notify
  after insert or update of status on public.bookings
  for each row execute function private.notify_booking_change();

alter table public.notifications enable row level security;

create policy "Users read their notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users mark their notifications as read"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Functions for the scheduled job, which runs with the secret key
-- (role service_role). Nobody else may call them.
-- ---------------------------------------------------------------------------

-- Reminders for confirmed sessions starting within the window. Running it twice
-- does nothing the second time: the unique constraint absorbs the duplicates.
create function public.queue_session_reminders(within interval default interval '24 hours')
returns integer
language sql
security definer
set search_path = ''
as $$
  with inserted as (
    insert into public.notifications (user_id, booking_id, kind, email_status)
    select p.user_id, b.id, 'session_reminder',
           case when coalesce(s.email_reminders, true) then 'pending' else 'skipped' end::public.email_status
    from public.bookings b
    cross join lateral (values (b.learner_id), (b.mentor_id)) as p (user_id)
    left join public.user_settings s on s.user_id = p.user_id
    where b.status = 'confirmed' and b.starts_at > now() and b.starts_at <= now() + within
    on conflict on constraint one_notification_per_event do nothing
    returning 1
  )
  select count(*)::integer from inserted;
$$;

-- Claims a batch of e-mails to send. "for update skip locked" lets several
-- workers run at once without taking the same rows; a row left in 'sending'
-- by a crashed worker becomes claimable again after 10 minutes.
create function public.claim_notification_emails(batch_size integer default 20, only_booking uuid default null)
returns setof public.notifications
language sql
security definer
set search_path = ''
as $$
  update public.notifications n
  set email_status = 'sending', email_claimed_at = now(), email_attempts = n.email_attempts + 1
  where n.id in (
    select c.id from public.notifications c
    where (c.email_status = 'pending'
           or (c.email_status = 'sending' and c.email_claimed_at < now() - interval '10 minutes'))
      and c.email_attempts < 5
      and (only_booking is null or c.booking_id = only_booking)
    order by c.created_at
    limit batch_size
    for update skip locked
  )
  returning n.*;
$$;

revoke execute on function public.queue_session_reminders(interval) from public, anon, authenticated;
revoke execute on function public.claim_notification_emails(integer, uuid) from public, anon, authenticated;
grant execute on function public.queue_session_reminders(interval) to service_role;
grant execute on function public.claim_notification_emails(integer, uuid) to service_role;
