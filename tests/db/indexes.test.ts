import type { Client } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { connect } from "./helpers";

let db: Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

// Each index serves a query of the application (docs/ARCHITECTURE.md). Dropping
// one by accident in a later migration should fail a test, not slow production.
it("keeps the indexes that the directory and schedule queries rely on", async () => {
  const { rows } = await db.query(
    `select indexname, indexdef from pg_indexes
      where schemaname = 'public' and tablename in ('mentor_profiles', 'bookings')`,
  );
  const defs = Object.fromEntries(rows.map((r) => [r.indexname, r.indexdef]));
  expect(defs.mentor_profiles_languages_idx).toMatch(/USING gin \(languages\)/);
  expect(defs.mentor_profiles_skills_idx).toMatch(/USING gin \(skills\)/);
  expect(defs.mentor_profiles_published_name_idx).toMatch(/\(display_name\) WHERE is_published/);
  expect(defs.bookings_mentor_starts_idx).toMatch(/\(mentor_id, starts_at\)/);
});
