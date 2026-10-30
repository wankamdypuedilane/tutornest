import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asUser, connect, createUser } from "./helpers";

let db: Client;
let marc: string; // approved mentor
let zoe: string; // mentor application still pending
let ines: string; // learner

beforeAll(async () => {
  db = await connect();
  marc = await createUser(db, "marc.mentor@example.com", { full_name: "Marc Leroy", intent: "mentor" });
  zoe = await createUser(db, "zoe.mentor@example.com", { full_name: "Zoé Petit", intent: "mentor" });
  ines = await createUser(db, "ines.learner@example.com", { full_name: "Inès Martin" });
  // A coordinator approves Marc (administrative change, done as the database owner).
  await db.query("update public.profiles set mentor_status = 'approved', role = 'mentor' where id = $1", [marc]);
});

afterAll(async () => {
  await db.end();
});

const insertProfile = (id: string, slug: string) =>
  db.query(
    `insert into public.mentor_profiles (id, slug, display_name, headline, skills, is_published)
     values ($1, $2, 'Test Mentor', 'Senior developer', '{react,sql}', true)`,
    [id, slug],
  );

describe("mentor profiles", () => {
  it("lets an approved mentor publish a profile that visitors can read", async () => {
    await asUser(db, marc, async () => {
      await insertProfile(marc, "marc-leroy");
      const visible = await db.query("select slug from public.mentor_profiles");
      expect(visible.rows).toEqual([{ slug: "marc-leroy" }]);
    });
  });

  it("refuses a profile from a mentor whose application is pending", async () => {
    await expect(asUser(db, zoe, () => insertProfile(zoe, "zoe-petit"))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("refuses a profile created for somebody else", async () => {
    await expect(asUser(db, ines, () => insertProfile(marc, "fake-marc"))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("hides unpublished profiles from visitors but not from their owner", async () => {
    await db.query(
      `insert into public.mentor_profiles (id, slug, display_name, is_published)
       values ($1, 'marc-draft', 'Marc Leroy', false)`,
      [marc],
    );
    const anon = await asAnon(db, async () => (await db.query("select slug from public.mentor_profiles")).rows);
    const owner = await asUser(db, marc, async () => (await db.query("select slug from public.mentor_profiles")).rows);
    expect(anon).toEqual([]);
    expect(owner).toEqual([{ slug: "marc-draft" }]);
    await db.query("delete from public.mentor_profiles where id = $1", [marc]);
  });

  it("rejects invalid slugs", async () => {
    await expect(insertProfile(marc, "Marc Leroy!")).rejects.toThrow(/mentor_profiles_slug_check/);
  });
});

describe("user settings", () => {
  it("lets users create and read only their own settings", async () => {
    const own = await asUser(db, ines, async () => {
      await db.query("insert into public.user_settings (user_id, email_reminders) values ($1, false)", [ines]);
      return (await db.query("select user_id, email_reminders from public.user_settings")).rows;
    });
    expect(own).toEqual([{ user_id: ines, email_reminders: false }]);
  });

  it("refuses settings written for another user", async () => {
    await expect(
      asUser(db, ines, () => db.query("insert into public.user_settings (user_id) values ($1)", [marc])),
    ).rejects.toThrow(/row-level security/);
  });
});
