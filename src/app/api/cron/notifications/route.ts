import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { emailConfigured } from "@/lib/email/resend";
import { serverEnv } from "@/lib/env.server";
import { deliverEmails } from "@/lib/notifications/deliver";
import { createOutboxDeps } from "@/lib/notifications/outbox";
import { createAdminClient } from "@/lib/supabase/admin";
import { withSpan } from "@/lib/tracing";

const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Compares "Bearer <secret>" in constant time, so timing reveals nothing about the secret. */
export function isAuthorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

// Called by the scheduler (Vercel Cron sends "Authorization: Bearer $CRON_SECRET").
// It queues reminders, then sends what waits in the outbox, retries included.
export async function GET(request: Request) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || !serverEnv.SUPABASE_SECRET_KEY) return reply({ error: "Scheduled jobs are not configured." }, 503);
  if (!isAuthorized(request.headers.get("authorization"), secret)) return reply({ error: "Unauthorized" }, 401);

  const admin = createAdminClient();
  // One span per step: the trace shows which step is slow or failing.
  const { data: queued, error } = await withSpan("cron.queue_reminders", {}, async () =>
    admin.rpc("queue_session_reminders", { within: `${serverEnv.REMINDER_WINDOW_HOURS} hours` }),
  );
  if (error) return reply({ error: "Could not queue reminders." }, 500);

  const delivery = emailConfigured()
    ? await withSpan("cron.deliver_emails", {}, () => deliverEmails(createOutboxDeps(admin)))
    : null;
  // Housekeeping: rate-limit windows older than a day (chapter 19).
  const { data: purged } = await withSpan("cron.purge_rate_limits", {}, async () => admin.rpc("purge_rate_limits"));
  return reply({ remindersQueued: queued, delivery, rateLimitWindowsPurged: purged ?? 0 });
}
