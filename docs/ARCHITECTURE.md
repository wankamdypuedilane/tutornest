# TutorNest architecture

## Modules and dependency rules

```
src/app/          routes: pages, layouts, Server Actions, Route Handlers (thin)
src/components/   UI components; no data access except through props and actions
src/lib/<domain>/ domain logic and data access: auth, mentors, scheduling,
                  notifications, livekit, security, email, supabase
src/emails/       e-mail templates (React Email)
supabase/         migrations (the schema is the source of truth for data rules)
```

- `src/app` may import `src/lib` and `src/components`; `src/lib` imports neither.
- Pure rules (slots, join window, CSP, policies) have no I/O: they take "now" and data
  as parameters and are unit-tested.
- Data access goes through small query modules per domain (`src/lib/mentors/queries.ts`,
  `src/lib/scheduling/queries.ts`), using the user's Supabase client so that Row Level
  Security applies.
- The secret-key client (`src/lib/supabase/admin.ts`) is used only by:
  `src/lib/notifications/outbox.ts`, `src/lib/security/rate-limit.ts`,
  `src/app/api/cron/**`, `src/app/(app)/settings/actions.ts` (account deletion).
- These rules are enforced by `eslint.config.mjs` and tested in `tests/unit/architecture.test.ts`.

## Caching

| Data | Where | Freshness | Invalidation |
|------|-------|-----------|--------------|
| Mentor directory, profiles | `"use cache"` in `src/lib/mentors/queries.ts` | `cacheLife("minutes")` | `updateTag("mentors")`, `updateTag("mentor:<slug>")` on profile and avatar changes |
| Landing page, sitemap | static (prerendered) | per deployment | redeploy |
| Anything per user (sessions, bookings, notifications) | never cached | request time | n/a |

## Performance notes (measured)

Directory queries on a copy of the schema with 20,000 mentor profiles (15,943 published),
PostgreSQL 16, `EXPLAIN ANALYZE`:

| Query | Before | After 20261112090000 indexes |
|-------|--------|------------------------------|
| Published, language "Portuguese", by name, limit 50 | 4.5 ms, sequential scan + sort | 0.57 ms, index scan on (display_name) where published |
| Published, by name, limit 50 | 7.2 ms, sequential scan + sort | 0.05 ms, same index |

## Scaling notes

- Vercel functions are stateless: no in-memory state across requests (rate limits live in
  PostgreSQL, sessions in cookies).
- The app talks to PostgreSQL through Supabase's HTTP API, not direct connections, so
  serverless concurrency does not exhaust database connections. Scripts and migrations
  that connect directly should use the connection pooler.
- Slow work runs outside the request: e-mails through the outbox and the cron job.
- Next steps if load grows: compute size, read replicas for the directory, a queue for
  e-mails, CDN caching of public pages (already static).

## Observability

Logs: `src/lib/log.ts` (JSON, redacted). Errors: `onRequestError` in `src/instrumentation.ts`.
Traces: OpenTelemetry via `@vercel/otel` (`register()` in `src/instrumentation.ts`), custom
spans with `withSpan()` from `src/lib/tracing.ts`. Uptime: `/api/health`.
