"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { type BookSessionInput, bookSessionSchema } from "@/lib/scheduling/schemas";
import { deliverPendingEmails } from "@/lib/notifications/outbox";
import { createClient } from "@/lib/supabase/server";

export type BookingResult = { ok: true; bookingId: string } | { ok: false; message: string };

export async function bookSession(input: BookSessionInput): Promise<BookingResult> {
  await requireUser("/mentors");
  const parsed = bookSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "This slot is not valid." };
  const { mentorId, startsAt, minutes, timeZone } = parsed.data;
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + minutes * 60_000);

  const supabase = await createClient();
  // No availability check here: the insert policy and the exclusion constraint
  // decide, atomically. Checking first would only open a race window.
  const { data, error } = await supabase
    .from("bookings")
    .insert({ mentor_id: mentorId, starts_at: start.toISOString(), ends_at: end.toISOString(), learner_timezone: timeZone })
    .select("id")
    .single();
  if (error) {
    // 23P01 = exclusion_violation: someone booked an overlapping time first.
    if (error.code === "23P01") {
      return { ok: false, message: "This time was booked by someone else a moment ago. Please choose another slot." };
    }
    // 42501 = the policy refused: outside the availability, too soon, or yourself.
    if (error.code === "42501") return { ok: false, message: "This time is no longer available." };
    return { ok: false, message: "The session could not be booked. Please try again." };
  }
  // The trigger has queued the notifications in the same transaction. Send the
  // e-mails after the response: the learner does not wait for the provider, and
  // if sending fails, the scheduled job retries.
  after(() => deliverPendingEmails(data.id));
  refresh();
  return { ok: true, bookingId: data.id };
}

export async function cancelBooking(bookingId: string): Promise<{ ok: boolean; message?: string }> {
  await requireUser("/sessions");
  if (!z.uuid().safeParse(bookingId).success) return { ok: false, message: "Invalid request." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .select("id");
  if (error || data.length === 0) {
    return { ok: false, message: "Sessions can be cancelled up to 24 hours before they start." };
  }
  after(() => deliverPendingEmails(bookingId));
  refresh();
  return { ok: true };
}
