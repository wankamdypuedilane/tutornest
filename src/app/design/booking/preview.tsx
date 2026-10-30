"use client";

import { SlotPicker } from "@/components/booking/slot-picker";
import type { WeeklyRule } from "@/lib/scheduling/slots";

// Booking succeeds in memory: no database, no account needed.
export function BookingPreview(props: { rules: WeeklyRule[]; busy: { start: string; end: string }[]; now: string }) {
  return (
    <SlotPicker
      mentorId="00000000-0000-4000-8000-0000000000a1"
      mentorName="Marc"
      mentorTimeZone="Europe/Paris"
      signedIn
      signInHref="/sign-in"
      onBook={async () => ({ ok: true, bookingId: "00000000-0000-4000-8000-0000000000b1" })}
      {...props}
    />
  );
}
