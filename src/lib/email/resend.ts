import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env.server";
import type { EmailMessage, SendResult } from "@/lib/notifications/deliver";

/** E-mail is optional in development: without a key, nothing is sent. */
export const emailConfigured = () => Boolean(serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM);

export async function sendEmail(message: EmailMessage, idempotencyKey: string): Promise<SendResult> {
  const resend = new Resend(serverEnv.RESEND_API_KEY);
  const { data, error } = await resend.emails.send(
    { from: serverEnv.EMAIL_FROM!, to: message.to, subject: message.subject, react: message.react },
    // Sent as the Idempotency-Key header: Resend ignores a repeated request with
    // the same key, so a retry after a timeout never sends the e-mail twice.
    { idempotencyKey },
  );
  if (error) return { ok: false, error: `${error.name}: ${error.message}` };
  return { ok: true, id: data.id };
}
