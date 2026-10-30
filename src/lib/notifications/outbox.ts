import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { BookingEmail, type BookingEmailProps, bookingEmailSubject } from "@/emails/booking-email";
import { emailConfigured, sendEmail } from "@/lib/email/resend";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type DeliveryDeps, deliverEmails, type OutboxRow } from "./deliver";

// The outbox worker needs the secret key: it reads e-mail addresses (auth.users)
// and updates notifications of every user. It runs only on the server, from
// the scheduled job or right after a booking.

export function createOutboxDeps(admin: SupabaseClient): DeliveryDeps {
  return {
    async claim(onlyBooking) {
      const { data, error } = await admin.rpc("claim_notification_emails", {
        batch_size: 20,
        only_booking: onlyBooking ?? null,
      });
      if (error) throw new Error(`claim failed: ${error.message}`);
      return data as OutboxRow[];
    },

    async compose(row) {
      const [{ data: booking }, { data: user }] = await Promise.all([
        admin
          .from("bookings")
          .select("id, starts_at, ends_at, learner_id, learner_name, learner_timezone, mentor:mentor_profiles (display_name, timezone)")
          .eq("id", row.booking_id)
          .maybeSingle(),
        admin.auth.admin.getUserById(row.user_id),
      ]);
      const email = user?.user?.email;
      if (!booking || !email) return null;
      const mentor = booking.mentor as unknown as { display_name: string; timezone: string };
      const isLearner = row.user_id === booking.learner_id;
      const site = serverEnv.NEXT_PUBLIC_SITE_URL;
      const props: BookingEmailProps = {
        kind: row.kind,
        role: isLearner ? "learner" : "mentor",
        recipientName: isLearner ? booking.learner_name : mentor.display_name,
        otherName: isLearner ? mentor.display_name : booking.learner_name,
        start: booking.starts_at,
        end: booking.ends_at,
        timeZone: isLearner ? booking.learner_timezone : mentor.timezone,
        sessionUrl: row.kind === "booking_cancelled" ? `${site}/mentors` : `${site}/sessions/${booking.id}`,
        settingsUrl: `${site}/settings`,
      };
      return { to: email, subject: bookingEmailSubject(props), react: createElement(BookingEmail, props) };
    },

    send: sendEmail,

    async finish(id, update) {
      const { error } = await admin.from("notifications").update(update).eq("id", id);
      if (error) throw new Error(`finish failed: ${error.message}`);
    },
  };
}

/** Sends what is waiting in the outbox (for one booking, or a batch). No-op without configuration. */
export async function deliverPendingEmails(onlyBooking?: string) {
  if (!emailConfigured() || !serverEnv.SUPABASE_SECRET_KEY) return null;
  return deliverEmails(createOutboxDeps(createAdminClient()), onlyBooking);
}
