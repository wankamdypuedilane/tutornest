# TutorNest runbook

For whoever is on call. Keep calm, write down times and actions in the incident channel.

## 1. Assess (first 10 minutes)
- Is it everyone or some users? Check `/api/health`, the Vercel dashboard (errors, latency) and Supabase status.
- Severity: **SEV1** site down or data exposed; **SEV2** a main feature broken; **SEV3** degraded.
- SEV1/SEV2: tell the team and Northlight's contact; one person leads, one person communicates.

## 2. Mitigate before fixing
- **Bad deployment**: Vercel > project > Instant Rollback to the previous production deployment
  (or `vercel rollback`). Then fix forward on a branch; after the fix, promote it (rollbacks turn off
  automatic production deployments).
- **Leaked secret**: rotate it at its provider (Supabase secret key, Resend, LiveKit, CRON_SECRET),
  update Vercel's environment variables, redeploy, then look for misuse in the provider's logs.
- **Abuse or traffic spike**: tighten rate limits, enable Vercel's firewall rules, contact providers.
- **Bad data or deletion**: stop writes if needed (maintenance page), then restore (section 3).

## 3. Restore the database
- Prefer restoring into a **new** project or branch, check it, then switch, rather than overwriting production.
- Daily backups or point-in-time recovery: Supabase dashboard > Database > Backups.
- Practise with `scripts/restore-drill.sh` every quarter; record the date and duration below.

## 4. After the incident
- Write a blameless post-mortem within a week: timeline, impact, root cause, what went well,
  actions with owners and dates. Add a test or an alert for the cause.

## Drill log
| Date | What | Duration | Result |
|------|------|----------|--------|
| 2026-11-11 | Local restore drill (25 profiles) | < 1 min | Passed |
