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
