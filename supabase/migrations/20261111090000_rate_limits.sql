-- Rate limiting (chapter 19): counts requests per key in fixed time windows.
-- Kept in PostgreSQL because serverless functions share no memory: a counter
-- in one instance would not see the requests handled by another.

create table private.rate_limits (
  key text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);

-- Counts one request for `p_key` and says whether it is allowed: at most
-- `p_limit` requests per window of `p_window_seconds`. One atomic statement,
-- so two simultaneous requests cannot both read the same count.
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language sql
security definer
set search_path = ''
as $$
  insert into private.rate_limits as r (key, window_start, hits)
  values (
    p_key,
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds),
    1
  )
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits <= p_limit;
$$;

-- Old windows are useless: the daily job deletes them.
create function public.purge_rate_limits()
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from private.rate_limits where window_start < now() - interval '1 day' returning 1
  )
  select count(*)::integer from deleted;
$$;

-- Only the server, with the secret key, counts requests.
revoke execute on function public.hit_rate_limit(text, integer, integer), public.purge_rate_limits()
  from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer), public.purge_rate_limits()
  to service_role;
