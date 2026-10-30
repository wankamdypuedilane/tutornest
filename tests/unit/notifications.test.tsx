// @vitest-environment node
import { render } from "@react-email/render";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingEmail, type BookingEmailProps, bookingEmailSubject, formatSessionTime } from "@/emails/booking-email";
import { type DeliveryDeps, deliverEmails, MAX_ATTEMPTS, type OutboxRow } from "@/lib/notifications/deliver";

const props: BookingEmailProps = {
  kind: "booking_confirmed",
  recipientName: "Inès",
  otherName: "Marc Leroy",
  role: "learner",
  start: "2026-11-17T17:00:00.000Z",
  end: "2026-11-17T18:00:00.000Z",
  timeZone: "Europe/London",
  sessionUrl: "https://tutornest.example/sessions/b1",
  settingsUrl: "https://tutornest.example/settings",
};

describe("booking e-mails", () => {
  it("write the time in the recipient's zone, with the zone's name", () => {
    expect(formatSessionTime(props)).toBe("Tuesday 17 November 2026, 17:00–18:00 (Europe/London)");
    expect(formatSessionTime({ ...props, timeZone: "Europe/Paris" })).toBe("Tuesday 17 November 2026, 18:00–19:00 (Europe/Paris)");
  });

  it("adapt the subject to the event and the recipient", () => {
    expect(bookingEmailSubject(props)).toBe("Session confirmed with Marc Leroy");
    expect(bookingEmailSubject({ ...props, kind: "session_reminder" })).toBe("Reminder: session with Marc Leroy tomorrow");
  });

  it("render to HTML and to plain text, with the link and the preferences link", async () => {
    const html = await render(createElement(BookingEmail, props));
    const text = await render(createElement(BookingEmail, { ...props, role: "mentor", recipientName: "Marc", otherName: "Inès" }), {
      plainText: true,
    });
    expect(html).toContain('href="https://tutornest.example/sessions/b1"');
    expect(html).toContain("Choose which e-mails you receive");
    expect(text).toContain("Inès booked a session with you.");
    expect(text).not.toContain("<");
  });
});

const row = (n: number, attempts = 1): OutboxRow => ({
  id: `n${n}`,
  user_id: "u1",
  booking_id: "b1",
  kind: "booking_confirmed",
  email_attempts: attempts,
});

function fakeDeps(rows: OutboxRow[], overrides: Partial<DeliveryDeps> = {}) {
  const finished: [string, unknown][] = [];
  const deps: DeliveryDeps = {
    claim: vi.fn(async () => rows),
    compose: vi.fn(async () => ({ to: "ines@example.com", subject: "Hello", react: createElement("p") })),
    send: vi.fn(async () => ({ ok: true as const, id: "email-1" })),
    finish: vi.fn(async (id, update) => void finished.push([id, update])),
    now: () => new Date("2026-11-16T09:00:00Z"),
    ...overrides,
  };
  return { deps, finished };
}

describe("deliverEmails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends each claimed e-mail with the notification's idempotency key and records it", async () => {
    const { deps, finished } = fakeDeps([row(1)]);
    expect(await deliverEmails(deps)).toEqual({ sent: 1, retrying: 0, failed: 0, skipped: 0 });
    expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({ to: "ines@example.com" }), "notification-n1");
    expect(finished).toEqual([["n1", { email_status: "sent", email_message_id: "email-1", email_sent_at: "2026-11-16T09:00:00.000Z" }]]);
  });

  it("puts a failed send back in the queue, then gives up after the last attempt", async () => {
    const send = vi.fn(async () => ({ ok: false as const, error: "rate_limit_exceeded: Too many requests" }));
    const { deps, finished } = fakeDeps([row(1, 1), row(2, MAX_ATTEMPTS)], { send });
    expect(await deliverEmails(deps)).toMatchObject({ retrying: 1, failed: 1 });
    expect(finished.map(([, u]) => (u as { email_status: string }).email_status)).toEqual(["pending", "failed"]);
  });

  it("skips a notification whose recipient no longer exists", async () => {
    const { deps, finished } = fakeDeps([row(1)], { compose: vi.fn(async () => null) });
    expect(await deliverEmails(deps)).toMatchObject({ skipped: 1 });
    expect(deps.send).not.toHaveBeenCalled();
    expect(finished[0]![1]).toMatchObject({ email_status: "skipped" });
  });

  it("passes the booking filter to the claim", async () => {
    const { deps } = fakeDeps([]);
    await deliverEmails(deps, "b1");
    expect(deps.claim).toHaveBeenCalledWith("b1");
  });
});

// The scheduled job's route, with Supabase and e-mail replaced by fakes.
const env: Record<string, unknown> = {};
vi.mock("@/lib/env.server", () => ({ serverEnv: env }));
const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));
vi.mock("@/lib/email/resend", () => ({ emailConfigured: () => false }));
vi.mock("@/lib/notifications/outbox", () => ({ createOutboxDeps: vi.fn() }));

describe("GET /api/cron/notifications", () => {
  const SECRET = "test-cron-secret-0123456789";
  const call = async (authorization?: string) => {
    const { GET } = await import("@/app/api/cron/notifications/route");
    return GET(new Request("http://localhost/api/cron/notifications", { headers: authorization ? { authorization } : {} }));
  };

  beforeEach(() => {
    Object.assign(env, { CRON_SECRET: SECRET, SUPABASE_SECRET_KEY: "sb_secret_test", REMINDER_WINDOW_HOURS: 24 });
    rpc.mockResolvedValue({ data: 2, error: null });
  });

  it("refuses requests without the shared secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call(`Bearer ${SECRET}x`)).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("queues reminders for the configured window", async () => {
    const response = await call(`Bearer ${SECRET}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ remindersQueued: 2, delivery: null, rateLimitWindowsPurged: 2 });
    expect(rpc).toHaveBeenCalledWith("queue_session_reminders", { within: "24 hours" });
    expect(rpc).toHaveBeenCalledWith("purge_rate_limits");
  });

  it("answers 503 when the job is not configured", async () => {
    env.CRON_SECRET = undefined;
    expect((await call(`Bearer ${SECRET}`)).status).toBe(503);
  });
});
