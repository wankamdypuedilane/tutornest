# Architecture decision records

Each decision records the context, the choice and its consequences, so that
future contributors (human or AI) understand why the code looks the way it does.

## ADR-001 Use Next.js (App Router) with TypeScript
- Context: one developer, needs front end and back end in one code base, good SEO for public mentor pages.
- Decision: Next.js 16 App Router, TypeScript in strict mode, deployed on Vercel.
- Consequences: Server Components by default; server code in Server Actions and Route Handlers; Vercel preview deployment for every pull request.

## ADR-002 Use Supabase for database, auth and storage
- Context: relational data (users, availability, bookings), strict per-user privacy, small budget.
- Decision: Supabase (PostgreSQL 17) with Row Level Security on every table; schema managed as SQL migrations in `supabase/migrations`.
- Consequences: authorization is enforced in the database as well as in the application; the publishable key can be exposed to the browser.

## ADR-003 Tailwind CSS and shadcn/ui
- Context: consistent, accessible UI without a dedicated front-end team.
- Decision: Tailwind CSS 4 with semantic design tokens; shadcn/ui components copied into `src/components/ui` and owned by the project.
- Consequences: components can be modified freely; tokens in `globals.css` are the single source of truth for colours, radius and fonts.

## ADR-004 Self-host fonts
- Context: GDPR concerns about sending visitors' IP addresses to third-party font servers; offline builds.
- Decision: install fonts from npm (Fontsource) and import them in the root layout.
- Consequences: no external font requests; fonts are versioned with the code.

## ADR-005 Test strategy
- Decision: Vitest + Testing Library for units and components; Playwright for end-to-end flows against a production build; SQL tests for Row Level Security policies.

## 2026-11-05: Avatars in a public bucket, one folder per user
- Bucket `avatars` is public (photos are shown to visitors); writes are restricted by storage policies to `<user-id>/...`.
- File type is detected from the bytes, never from the name or the browser-provided type. SVG is refused.
- A new object name per upload (no overwrite) so CDN and browser caches never serve a stale photo.
- Uploads go through a Server Action (limit raised to 3 MB); direct browser uploads are an option if files grow.

## 2026-11-08: Times are instants; time zones only at the edges
- Bookings store `starts_at` / `ends_at` as `timestamptz`. Availability rules are weekly local times
  interpreted in `mentor_profiles.timezone`; slots are computed in pure functions with `@date-fns/tz`
  and shown in the viewer's browser time zone.
- PostgreSQL re-checks a booking against the rules in the mentor's zone (`private.fits_availability`).

## 2026-11-08: Double bookings are impossible in the database
- Exclusion constraints (btree_gist) on `(mentor_id, tstzrange(starts_at, ends_at, '[)'))` and on the
  learner, for confirmed bookings. The Server Action never checks availability first: it inserts and
  translates `23P01` into a message. Time-dependent rules (notice, 24-hour cancellation) live in policies.
- The mentor sees the learner's name through `bookings.learner_name`, copied by a trigger; profiles stay private.

## 2026-11-08: One LiveKit room per booking, tokens from a Route Handler
- `POST /api/sessions/[bookingId]/token` checks the user, the booking (RLS) and the join window
  (10 minutes before to 15 minutes after), then signs a token for room `session-<bookingId>` only,
  valid until the window closes. The API secret never leaves the server.
