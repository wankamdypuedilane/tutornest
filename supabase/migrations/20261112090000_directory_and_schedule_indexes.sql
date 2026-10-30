-- Indexes for the queries that grow with the number of mentors and bookings
-- (chapter 21). Each one serves a query that the application runs; see the
-- EXPLAIN ANALYZE measurements in docs/ARCHITECTURE.md.

-- Directory filter by language: languages @> array['French'] (array containment
-- uses a GIN index, like the existing one on skills).
create index mentor_profiles_languages_idx on public.mentor_profiles using gin (languages);

-- The directory lists published mentors by name, 50 at a time: an index in that
-- order lets PostgreSQL read the first 50 entries instead of sorting all of them.
create index mentor_profiles_published_name_idx on public.mentor_profiles (display_name)
  where is_published;

-- A mentor's schedule: their bookings by start time.
create index bookings_mentor_starts_idx on public.bookings (mentor_id, starts_at);
