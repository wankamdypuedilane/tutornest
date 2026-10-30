import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, connect, createUser } from "./helpers";

let db: Client;
let marc: string; // mentor
let ines: string; // learner, wants e-mails
let leo: string; // learner, turned booking e-mails off
let soon: string; // Inès's booking in 5 hours
let later: string; // Léo's booking in 3 days

const hours = (n: number) => new Date(Date.now() + n * 3600_000).toISOString();

/** Runs as the scheduled job (secret key = role service_role), then rolls back. */
async function asJob<T>(fn: () => Promise<T>) {
  await db.query("begin");
  try {
    await db.query("set local role service_role");
    return await fn();
  } finally {
    await db.query("rollback");
  }
}

// Bookings are inserted as the database owner: these tests are about what follows.
const insertBooking = (learner: string, startsInHours: number) => {
  const start = new Date(hours(startsInHours));
  return db
    .query(
      "insert into public.bookings (mentor_id, learner_id, starts_at, ends_at) values ($1, $2, $3, $4) returning id",
      [marc, learner, start.toISOString(), new Date(start.getTime() + 3600_000).toISOString()],
    )
    .then((r) => r.rows[0].id as string);
};

const notificationsFor = (booking: string) =>
  db
    .query("select user_id, kind, email_status from public.notifications where booking_id = $1 order by kind, user_id", [booking])
    .then((r) => r.rows);

beforeAll(async () => {
  db = await connect();
  marc = await createUser(db, "marc.notify@example.com", { full_name: "Marc Leroy", intent: "mentor" });
  ines = await createUser(db, "ines.notify@example.com", { full_name: "Inès Martin" });
  leo = await createUser(db, "leo.notify@example.com", { full_name: "Léo Dubois" });
  await db.query("update public.profiles set mentor_status = 'approved', role = 'mentor' where id = $1", [marc]);
  await db.query("insert into public.mentor_profiles (id, slug, display_name, is_published) values ($1, 'marc-notify', 'Marc Leroy', true)", [marc]);
  await db.query("insert into public.user_settings (user_id, email_booking_updates) values ($1, false)", [leo]);
  soon = await insertBooking(ines, 5);
  later = await insertBooking(leo, 72);
});

afterAll(async () => {
  await db.query("delete from public.mentor_profiles where id = $1", [marc]);
  await db.end();
});

describe("booking notifications", () => {
  it("are created for both participants in the booking's transaction", async () => {
    const rows = await notificationsFor(soon);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.kind === "booking_confirmed" && r.email_status === "pending")).toBe(true);
  });

  it("respect the e-mail preference, without losing the in-app notification", async () => {
    const rows = await notificationsFor(later);
    expect(rows.find((r) => r.user_id === leo)?.email_status).toBe("skipped");
    expect(rows.find((r) => r.user_id === marc)?.email_status).toBe("pending");
  });

  it("follow a cancellation, once", async () => {
    await db.query("begin");
    await db.query("update public.bookings set status = 'cancelled' where id = $1", [later]);
    await db.query("update public.bookings set status = 'cancelled' where id = $1", [later]); // no change: no event
    const kinds = (await notificationsFor(later)).map((r) => r.kind);
    await db.query("rollback");
    expect(kinds.filter((k) => k === "booking_cancelled")).toHaveLength(2);
  });

  it("are private to their recipient, who may only mark them as read", async () => {
    await asUser(db, ines, async () => {
      const { rows } = await db.query("select user_id from public.notifications");
      expect(rows.every((r) => r.user_id === ines)).toBe(true);
      expect((await db.query("update public.notifications set read_at = now() where booking_id = $1", [soon])).rowCount).toBe(1);
      await expect(db.query("update public.notifications set email_status = 'sent'")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("reminders", () => {
  it("are queued for sessions within the window, only once", async () => {
    await asJob(async () => {
      expect((await db.query("select public.queue_session_reminders()")).rows[0].queue_session_reminders).toBe(2);
      expect((await db.query("select public.queue_session_reminders()")).rows[0].queue_session_reminders).toBe(0);
      const kinds = (await notificationsFor(soon)).map((r) => r.kind);
      expect(kinds.filter((k) => k === "session_reminder")).toHaveLength(2);
      expect((await notificationsFor(later)).some((r) => r.kind === "session_reminder")).toBe(false);
    });
  });

  it("can only be queued by the scheduled job", async () => {
    await expect(asUser(db, ines, () => db.query("select public.queue_session_reminders()"))).rejects.toThrow(/permission denied/);
  });
});

describe("the e-mail outbox", () => {
  it("hands each pending e-mail to one worker, even when two claim at once", async () => {
    const other = await connect();
    try {
      await db.query("begin");
      await db.query("set local role service_role");
      await other.query("begin");
      await other.query("set local role service_role");
      const first = (await db.query("select id, email_status, email_attempts from public.claim_notification_emails(2)")).rows;
      const second = (await other.query("select id from public.claim_notification_emails(10)")).rows;
      expect(first).toHaveLength(2);
      expect(first.every((r) => r.email_status === "sending" && r.email_attempts === 1)).toBe(true);
      // The other worker skips the locked rows instead of waiting or taking them twice.
      expect(second.map((r) => r.id)).not.toContain(first[0].id);
      expect(second.map((r) => r.id)).not.toContain(first[1].id);
    } finally {
      await db.query("rollback");
      await other.query("rollback");
      await other.end();
    }
  });

  it("can be limited to one booking, for an immediate send after booking", async () => {
    await asJob(async () => {
      const { rows } = await db.query("select booking_id from public.claim_notification_emails(20, $1)", [soon]);
      expect(rows.length).toBe(2);
      expect(rows.every((r) => r.booking_id === soon)).toBe(true);
    });
  });

  it("is not available to users", async () => {
    await expect(asUser(db, ines, () => db.query("select * from public.claim_notification_emails()"))).rejects.toThrow(/permission denied/);
  });
});
