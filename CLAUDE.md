@AGENTS.md

# TutorNest: instructions for coding agents

TutorNest is a mentoring platform for Northlight Learning: learners find
mentors, book one-to-one video sessions and track their learning goals.
Read docs/PRD.md for the product requirements before planning a feature.

## Stack
- Next.js 16 (App Router, `src/` directory, Cache Components enabled), React 19, TypeScript 5
- Tailwind CSS 4 with design tokens in `src/app/globals.css`; shadcn/ui components in `src/components/ui`
- Supabase (Postgres, Auth, Storage) through `@supabase/ssr`; clients in `src/lib/supabase/`
- Vitest + Testing Library (`tests/unit`), Playwright (`tests/e2e`)

## Commands
- `npm run dev` - local server on http://localhost:3000
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`
- Run lint, typecheck and tests before saying a task is done, and show the output.

## Rules
- Server Components by default; add "use client" only for interactivity.
- Code that reads cookies or the current user must sit inside a <Suspense> boundary.
- Authorize on the server with `supabase.auth.getClaims()`; never trust `getSession()` on the server.
- Every table has Row Level Security enabled with explicit policies. Schema changes go in `supabase/migrations/`.
- Never read, print or commit `.env*` files except `.env.example`. Never hard-code keys.
- Use semantic design tokens (`bg-primary`, `text-muted-foreground`), never raw colours.
- Validate all user input on the server with zod.
- Store times as timestamptz instants; convert to a time zone only to compute or display. Scheduling
  rules live in pure functions in `src/lib/scheduling/` with tests (including daylight saving time).
- Never check availability and then insert: insert and let the exclusion constraint decide.
- Never send e-mails directly from a feature: write a notification row (trigger or insert) and let the
  outbox worker send it with an idempotency key. Templates live in `src/emails/`.
- Security headers live in `src/lib/security/headers.ts`; a new external service must be added to the
  CSP there, with a test. Never use dangerouslySetInnerHTML with user content.
- Rate-limit endpoints that cost money or guard secrets (`src/lib/security/rate-limit.ts`).
- Log with `log()` from `src/lib/log.ts`; never log tokens, cookies, passwords or e-mail addresses.
- Do not modify tests to make them pass unless the requirement changed; say so explicitly if you do.
- Keep changes small and focused; propose a plan first for anything touching more than three files.
