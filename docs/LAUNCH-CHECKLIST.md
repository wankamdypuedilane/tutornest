# TutorNest launch checklist

Tick every line before announcing the pilot. Each item says how to check it.

## Code and tests
- [ ] CI is green on `main`: lint, typecheck, unit, database, advisors, build, end-to-end.
- [ ] `npm audit --omit=dev` has no high or critical finding (accepted lows are listed in DECISIONS.md).
- [ ] Accessibility tests (axe) pass in light and dark mode; keyboard walk-through of booking and session pages done.
- [ ] Every migration has been applied to the staging project with `supabase db push`, then tested there.

## Supabase (production project, separate from staging)
- [ ] Security Advisor shows no warning; every table in `public` has RLS (CI also checks).
- [ ] Auth > URL configuration: Site URL and redirect URLs list only production and preview domains.
- [ ] Auth > SMTP uses our Resend domain (chapter 16); e-mail templates reviewed.
- [ ] Auth > rate limits and minimum password length reviewed; CAPTCHA considered for sign-up.
- [ ] Database: SSL enforcement on; network restrictions considered.
- [ ] Backups: plan with daily backups (or PITR) chosen; restore drill run (`scripts/restore-drill.sh`) and dated.
- [ ] MFA on every Supabase, Vercel, GitHub, Resend and LiveKit account of the team.

## Vercel
- [ ] Production environment variables set (see `.env.example`); secrets only in Production/Preview scopes they need.
- [ ] Preview deployments use the staging Supabase project, never production.
- [ ] Domain `tutornest.example` and `www` verified, HTTPS active, redirect to the canonical host.
- [ ] Security headers present (`curl -I https://tutornest.example`), CSP without violations in the console.
- [ ] Cron job visible in the project settings; `CRON_SECRET` set.

## Monitoring and operations
- [ ] Uptime monitor on `/api/health` (every few minutes), alerts to the on-call e-mail and phone.
- [ ] Log search tested: find an error by its digest.
- [ ] RUNBOOK.md read by everyone on call: rollback, key rotation, restore, contacts.
- [ ] Legal pages (privacy, terms) published; data processing documented.

## Launch day
- [ ] Final production deployment promoted; smoke test: sign up, book, cancel, join a test room.
- [ ] Team available for the first hours; error rate and latency watched.
