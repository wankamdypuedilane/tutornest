import { TZDate } from "@date-fns/tz";
import { addDays, addMinutes, getISODay } from "date-fns";
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asUser, connect, createUser } from "./helpers";

let db: Client;
let marc: string; // approved mentor, time zone Europe/Paris
let ines: string; // learner
let leo: string; // learner

/** The next given weekday at a local time in Paris, at least `minDays` from now. */
function nextParis(weekday: number, hour: number, minDays = 2): Date {
  let day = addDays(new TZDate(Date.now(), "Europe/Paris"), minDays);
  while (getISODay(day) !== weekday) day = addDays(day, 1);
  return new Date(new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, "Europe/Paris").getTime());
}

const book = (start: Date, minutes = 60, mentor = marc) =>
  db.query("insert into public.bookings (mentor_id, starts_at, ends_at) values ($1, $2, $3) returning id", [
    mentor,
    start.toISOString(),
    addMinutes(start, minutes).toISOString(),
  ]);

beforeAll(async () => {
  db = await connect();
  marc = await createUser(db, "marc.book@example.com", { full_name: "Marc Leroy", intent: "mentor" });
  ines = await createUser(db, "ines.book@example.com", { full_name: "Inès Martin" });
  leo = await createUser(db, "leo.book@example.com", { full_name: "Léo Dubois" });
  await db.query("update public.profiles set mentor_status = 'approved', role = 'mentor' where id = $1", [marc]);
  await db.query(
    `insert into public.mentor_profiles (id, slug, display_name, timezone, is_published)
     values ($1, 'marc-book', 'Marc Leroy', 'Europe/Paris', true)`,
    [marc],
  );
  // Marc publishes his availability himself: Tuesdays 18:00-20:00, Saturdays 09:00-12:00.
  await db.query("begin");
  await db.query("set local role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: marc, role: "authenticated" })]);
  await db.query(
    "insert into public.availability_rules (mentor_id, weekday, start_time, end_time) values ($1, 2, '18:00', '20:00'), ($1, 6, '09:00', '12:00')",
    [marc],
  );
  await db.query("commit");
});

afterAll(async () => {
  // Other test files count published mentors: leave the database as we found it.
  await db.query("delete from public.mentor_profiles where id = $1", [marc]);
  await db.end();
});

describe("availability rules", () => {
  it("are public for published mentors", async () => {
    const { rows } = await asAnon(db, () => db.query("select weekday from public.availability_rules order by weekday"));
    expect(rows.map((r) => r.weekday)).toEqual([2, 6]);
  });

  it("can only be created by the mentor", async () => {
    await expect(
      asUser(db, ines, () =>
        db.query("insert into public.availability_rules (mentor_id, weekday, start_time, end_time) values ($1, 1, '08:00', '09:00')", [marc]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("start and end on the hour or the half hour", async () => {
    await expect(
      asUser(db, marc, () =>
        db.query("insert into public.availability_rules (mentor_id, weekday, start_time, end_time) values ($1, 1, '08:15', '09:00')", [marc]),
      ),
    ).rejects.toThrow(/availability_on_half_hours/);
  });
});

describe("booking", () => {
  it("accepts a slot inside the mentor's local availability", async () => {
    await asUser(db, ines, async () => {
      const { rows } = await book(nextParis(2, 18));
      expect(rows).toHaveLength(1);
    });
  });

  it("reads the rule in the mentor's time zone, not in UTC", async () => {
    // 18:00 UTC is 19:00 or 20:00 in Paris: the 60-minute session would end after 20:00.
    const start = nextParis(2, 18);
    await asUser(db, ines, async () => {
      await expect(book(addMinutes(start, 120))).rejects.toThrow(/row-level security/);
    });
  });

  it("refuses times outside the availability, in the past, or off the half hour", async () => {
    for (const start of [nextParis(3, 18), nextParis(2, 18, -7), addMinutes(nextParis(2, 18), 15)]) {
      await asUser(db, ines, async () => {
        await expect(book(start)).rejects.toThrow(/row-level security/);
      });
    }
  });

  it("refuses lengths other than 30 or 60 minutes", async () => {
    await asUser(db, ines, async () => {
      await expect(book(nextParis(2, 18), 90)).rejects.toThrow(/booking_length/);
    });
  });

  it("never lets two learners book overlapping times with the same mentor", async () => {
    const start = nextParis(6, 9);
    await asUser(db, ines, async () => {
      await book(start);
      // Same transaction, as another learner: the exclusion constraint answers.
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: leo, role: "authenticated" })]);
      await expect(book(addMinutes(start, 30), 30)).rejects.toMatchObject({ code: "23P01" });
    });
  });

  it("allows back-to-back sessions", async () => {
    const start = nextParis(6, 10);
    await asUser(db, ines, async () => {
      await book(start, 30);
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: leo, role: "authenticated" })]);
      await expect(book(addMinutes(start, 30), 30)).resolves.toBeDefined();
    });
  });

  it("stays correct when two requests arrive at the same moment", async () => {
    // Two connections, two transactions: the classic race of "check, then insert".
    const other = await connect();
    const start = nextParis(6, 11);
    const begin = async (client: Client, user: string) => {
      await client.query("begin");
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: user, role: "authenticated" })]);
    };
    const insert = (client: Client) =>
      client.query("insert into public.bookings (mentor_id, starts_at, ends_at) values ($1, $2, $3)", [
        marc,
        start.toISOString(),
        addMinutes(start, 60).toISOString(),
      ]);
    try {
      await begin(db, ines);
      await begin(other, leo);
      await insert(db);
      const second = insert(other); // waits for the first transaction to finish
      await db.query("rollback"); // the first one gives up...
      await expect(second).resolves.toBeDefined(); // ...so the second one succeeds
      await other.query("commit");

      await begin(db, ines);
      await expect(insert(db)).rejects.toMatchObject({ code: "23P01" }); // now the slot is taken
      await db.query("rollback");
    } finally {
      await other.end();
    }
  });
});

describe("reading and cancelling", () => {
  let booked: string;

  beforeAll(async () => {
    // Created as the database owner (no RLS), as a fixture.
    const start = nextParis(2, 19, 9);
    booked = (
      await db.query("insert into public.bookings (mentor_id, learner_id, starts_at, ends_at) values ($1, $2, $3, $4) returning id", [
        marc,
        ines,
        start.toISOString(),
        addMinutes(start, 30).toISOString(),
      ])
    ).rows[0].id;
  });

  it("shows a booking to its two participants only", async () => {
    const visible = (user: string) =>
      asUser(db, user, async () => (await db.query("select id from public.bookings where id = $1", [booked])).rowCount);
    expect(await visible(ines)).toBe(1);
    expect(await visible(marc)).toBe(1);
    expect(await visible(leo)).toBe(0);
  });

  it("gives the mentor the learner's name, copied at booking time", async () => {
    const { rows } = await asUser(db, marc, () => db.query("select learner_name from public.bookings where id = $1", [booked]));
    expect(rows[0].learner_name).toBe("Inès Martin");
    // The profile itself stays private.
    const profiles = await asUser(db, marc, () => db.query("select id from public.profiles where id = $1", [ines]));
    expect(profiles.rowCount).toBe(0);
  });

  it("publishes busy times without saying who booked them", async () => {
    const { rows } = await asAnon(db, () =>
      db.query("select * from public.mentor_busy_times($1, now(), now() + interval '30 days')", [marc]),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(Object.keys(rows[0])).toEqual(["starts_at", "ends_at"]);
  });

  it("lets a participant cancel more than 24 hours ahead, which frees the slot", async () => {
    await asUser(db, marc, async () => {
      const { rowCount } = await db.query("update public.bookings set status = 'cancelled' where id = $1", [booked]);
      expect(rowCount).toBe(1);
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: leo, role: "authenticated" })]);
      const { rows } = await db.query("select starts_at from public.mentor_busy_times($1, now(), now() + interval '60 days')", [marc]);
      expect(rows.some((r) => r.starts_at.getTime() === nextParis(2, 19, 9).getTime())).toBe(false);
    });
  });

  it("refuses to cancel within 24 hours, to change the time, or to confirm by hand", async () => {
    const soon = new Date(Date.now() + 3 * 3600_000);
    const id = (
      await db.query("insert into public.bookings (mentor_id, learner_id, starts_at, ends_at) values ($1, $2, $3, $4) returning id", [
        marc,
        ines,
        soon.toISOString(),
        addMinutes(soon, 30).toISOString(),
      ])
    ).rows[0].id;
    await asUser(db, ines, async () => {
      expect((await db.query("update public.bookings set status = 'cancelled' where id = $1", [id])).rowCount).toBe(0);
    });
    await asUser(db, ines, async () => {
      await expect(db.query("update public.bookings set starts_at = now() where id = $1", [booked])).rejects.toThrow(/permission denied/);
    });
    await asUser(db, ines, async () => {
      await expect(db.query("update public.bookings set status = 'completed' where id = $1", [booked])).rejects.toThrow(/row-level security/);
    });
  });
});
