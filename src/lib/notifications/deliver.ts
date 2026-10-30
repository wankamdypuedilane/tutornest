import type { ReactElement } from "react";

// Sending e-mails from the outbox, independent of Supabase and Resend: the
// dependencies are passed in, so the rules are tested with fakes.

export type OutboxRow = {
  id: string;
  user_id: string;
  booking_id: string;
  kind: "booking_confirmed" | "booking_cancelled" | "session_reminder";
  email_attempts: number; // already incremented by the claim
};

export type EmailMessage = { to: string; subject: string; react: ReactElement };
export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export type OutboxUpdate =
  | { email_status: "sent"; email_message_id: string; email_sent_at: string }
  | { email_status: "pending" | "failed" | "skipped"; email_error: string };

export type DeliveryDeps = {
  claim: (onlyBooking?: string) => Promise<OutboxRow[]>;
  compose: (row: OutboxRow) => Promise<EmailMessage | null>; // null: nobody to write to
  send: (message: EmailMessage, idempotencyKey: string) => Promise<SendResult>;
  finish: (id: string, update: OutboxUpdate) => Promise<void>;
  now?: () => Date;
};

export const MAX_ATTEMPTS = 5;

/** The idempotency key: one per notification, so a retried send is never delivered twice. */
export const idempotencyKey = (row: OutboxRow) => `notification-${row.id}`;

export async function deliverEmails(deps: DeliveryDeps, onlyBooking?: string) {
  const now = deps.now ?? (() => new Date());
  const summary = { sent: 0, retrying: 0, failed: 0, skipped: 0 };
  for (const row of await deps.claim(onlyBooking)) {
    let message: EmailMessage | null;
    try {
      message = await deps.compose(row);
    } catch (error) {
      await retryOrFail(deps, row, `compose: ${String(error)}`, summary);
      continue;
    }
    if (!message) {
      await deps.finish(row.id, { email_status: "skipped", email_error: "no recipient" });
      summary.skipped++;
      continue;
    }
    const result = await deps.send(message, idempotencyKey(row));
    if (result.ok) {
      await deps.finish(row.id, { email_status: "sent", email_message_id: result.id, email_sent_at: now().toISOString() });
      summary.sent++;
    } else {
      await retryOrFail(deps, row, result.error, summary);
    }
  }
  return summary;
}

async function retryOrFail(deps: DeliveryDeps, row: OutboxRow, error: string, summary: Record<string, number>) {
  const giveUp = row.email_attempts >= MAX_ATTEMPTS;
  await deps.finish(row.id, { email_status: giveUp ? "failed" : "pending", email_error: error.slice(0, 500) });
  summary[giveUp ? "failed" : "retrying"]!++;
}
