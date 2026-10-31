# Technical debt register

Each item: what, why it matters, cost of fixing, and when we will look again.
Reviewed at the start of each iteration; one fifth of each iteration goes to this list.

| # | Item | Impact | Effort | Review |
|---|------|--------|--------|--------|
| 1 | Content Security Policy allows inline scripts (no nonces, see DECISIONS.md) | XSS defence relies on React escaping only | High: dynamic rendering or hashes | When Next.js offers hashes for inline scripts with static shells |
| 2 | Directory search uses array containment and a name index only; no text search | Search by words in headline/bio impossible | Medium: tsvector column + GIN index | At 1,000 mentors |
| 3 | Rate-limit counters in PostgreSQL | One extra write per sign-in | Low to move to a dedicated store | If sign-ins exceed ~50/s |
| 4 | npm audit: 4 low findings via @react-email/render (deepmerge) | Low, no untrusted input | Wait for upstream | Monthly |
| 5 | Notifications delivered once a day on the Hobby cron plan | Reminders up to a day late | Plan upgrade or queue | Before the pilot ends |
| 6 | `@opentelemetry/api` held at 1.9 (Dependabot ignore rule): 1.10 is outside the peer range of `@opentelemetry/resources` 2.12 | No new tracing API until then | Low: remove the rule and update | When `@opentelemetry/resources` accepts 1.10 |
| 7 | TypeScript 7 and ESLint 10 not adopted (Dependabot ignores their major versions) | Tooling one major behind | Medium: check typescript-eslint and eslint-config-next support | Each Next.js minor release |
