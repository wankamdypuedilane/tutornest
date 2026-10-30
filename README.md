# TutorNest

Mentoring platform for **Northlight Learning** (a fictional organization):
learners find mentors, book one-to-one video sessions and track their goals.

This is the companion project of the book *Mastering AI-Assisted Full-Stack
Application Development* by WANKAM Dypue Dilane Junior (2026). Each Git tag
`chNN-end` matches the state of the code at the end of chapter NN.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui ·
Supabase (Postgres, Auth, Storage) · LiveKit · Resend · Vitest · Playwright

## Getting started

Requirements: Node.js 22 or later (26 LTS recommended), npm, Git.

```bash
git clone https://github.com/wankamdypuedilane/tutornest.git
cd tutornest
npm install
cp .env.example .env.local   # then fill in your own values
npm run dev                  # http://localhost:3000
```

The home page works without any configuration. Features that use Supabase
need a Supabase project (see chapter 6 of the book) or the local stack
(`npx supabase start`, requires Docker).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next.js route types, then run `tsc` |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright, builds the app first) |

If Playwright cannot download a browser (offline machine), point it to an
installed Chromium: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm run test:e2e`.

## Project documents

- `docs/PRD.md` - product requirements
- `docs/DECISIONS.md` - architecture decision records
- `CLAUDE.md` / `AGENTS.md` - instructions for AI coding agents
- `.claude/settings.json` - permission policy for Claude Code

## Security

Never commit `.env.local` or any real key. Report security issues privately.

## License

MIT - see `LICENSE`.
