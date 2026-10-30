import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect } from "./helpers";

let db: Client;

/** Runs as trusted server code (secret key = role service_role), then rolls back. */
async function asServer<T>(client: Client, fn: () => Promise<T>) {
  await client.query("begin");
  try {
    await client.query("set local role service_role");
    return await fn();
  } finally {
    await client.query("rollback");
  }
}

const hit = (client: Client, key: string, limit: number, seconds = 60) =>
  client
    .query("select public.hit_rate_limit($1, $2, $3) as allowed", [key, limit, seconds])
    .then((r) => r.rows[0].allowed as boolean);

beforeAll(async () => {
  db = await connect();
});

afterAll(async () => {
  await db.query("delete from private.rate_limits where key like 'test:%'");
  await db.end();
});

describe("rate limits", () => {
  it("allow requests up to the limit in a window, then refuse", async () => {
    await asServer(db, async () => {
      const answers = [];
      for (let i = 0; i < 4; i++) answers.push(await hit(db, "test:sign-in:203.0.113.7", 3));
      expect(answers).toEqual([true, true, true, false]);
    });
  });

  it("count each key separately", async () => {
    await asServer(db, async () => {
      expect(await hit(db, "test:a", 1)).toBe(true);
      expect(await hit(db, "test:a", 1)).toBe(false);
      expect(await hit(db, "test:b", 1)).toBe(true);
    });
  });

  it("let only one of two simultaneous requests through when one is left", async () => {
    const other = await connect();
    try {
      await db.query("begin; set local role service_role");
      await other.query("begin; set local role service_role");
      expect(await hit(db, "test:race", 1)).toBe(true);
      // The second request waits for the first transaction's row lock...
      const second = hit(other, "test:race", 1);
      await db.query("commit");
      // ...then sees its count, instead of a stale one.
      expect(await second).toBe(false);
      await other.query("commit");
    } finally {
      await other.end();
    }
  });

  it("forget windows older than a day", async () => {
    await db.query("insert into private.rate_limits (key, window_start, hits) values ('test:old', now() - interval '2 days', 50)");
    await asServer(db, async () => {
      const { rows } = await db.query("select public.purge_rate_limits() as deleted");
      expect(rows[0].deleted).toBeGreaterThanOrEqual(1);
    });
    await db.query("select public.purge_rate_limits()");
    const { rows } = await db.query("select count(*)::int as n from private.rate_limits where key = 'test:old'");
    expect(rows[0].n).toBe(0);
  });

  it("can only be used by the server", async () => {
    const { rows } = await db.query(
      `select has_function_privilege('anon', 'public.hit_rate_limit(text, integer, integer)', 'execute') as anon,
              has_function_privilege('authenticated', 'public.hit_rate_limit(text, integer, integer)', 'execute') as users,
              has_function_privilege('service_role', 'public.hit_rate_limit(text, integer, integer)', 'execute') as server`,
    );
    expect(rows[0]).toEqual({ anon: false, users: false, server: true });
  });
});
