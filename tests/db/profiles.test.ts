import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asUser, connect, createUser } from "./helpers";

let db: Client;
let ines: string;
let marc: string;
let amina: string;

beforeAll(async () => {
  db = await connect();
  ines = await createUser(db, "ines@example.com", { full_name: "Inès Martin" });
  marc = await createUser(db, "marc@example.com", { full_name: "Marc Leroy", intent: "mentor" });
  // Google identity data uses `name` rather than `full_name`.
  amina = await createUser(db, "amina@example.com", { name: "Amina Diallo", picture: "https://example.com/a.png" });
});

afterAll(async () => {
  await db.end();
});

describe("profiles", () => {
  it("creates a profile automatically when a user signs up", async () => {
    const { rows } = await db.query(
      "select full_name, role, mentor_status from public.profiles where id = $1",
      [ines],
    );
    expect(rows[0]).toEqual({ full_name: "Inès Martin", role: "learner", mentor_status: "none" });
  });

  it("never trusts the requested role: a would-be mentor starts as a pending learner", async () => {
    const { rows } = await db.query(
      "select role, mentor_status from public.profiles where id = $1",
      [marc],
    );
    expect(rows[0]).toEqual({ role: "learner", mentor_status: "pending" });
  });

  it("reads the name sent by Google sign-in", async () => {
    const { rows } = await db.query("select full_name from public.profiles where id = $1", [amina]);
    expect(rows[0]).toEqual({ full_name: "Amina Diallo" });
  });

  it("lets a user read only their own profile", async () => {
    const rows = await asUser(db, ines, async () =>
      (await db.query("select id from public.profiles")).rows,
    );
    expect(rows).toEqual([{ id: ines }]);
  });

  it("hides every profile from anonymous visitors", async () => {
    const rows = await asAnon(db, async () => (await db.query("select id from public.profiles")).rows);
    expect(rows).toHaveLength(0);
  });

  it("lets a user change their own name", async () => {
    const name = await asUser(db, ines, async () => {
      await db.query("update public.profiles set full_name = 'Inès M.' where id = $1", [ines]);
      return (await db.query("select full_name from public.profiles where id = $1", [ines])).rows[0];
    });
    expect(name).toEqual({ full_name: "Inès M." });
  });

  it("silently ignores attempts to update someone else's profile", async () => {
    const result = await asUser(db, ines, () =>
      db.query("update public.profiles set full_name = 'hacked' where id = $1", [marc]),
    );
    expect(result.rowCount).toBe(0);
  });

  it("refuses privilege escalation: a user cannot make themselves admin", async () => {
    await expect(
      asUser(db, ines, () => db.query("update public.profiles set role = 'admin' where id = $1", [ines])),
    ).rejects.toThrow(/permission denied/);
  });

  it("does not let users insert or delete profiles directly", async () => {
    await expect(
      asUser(db, ines, () => db.query("delete from public.profiles where id = $1", [ines])),
    ).rejects.toThrow(/permission denied/);
  });
});
