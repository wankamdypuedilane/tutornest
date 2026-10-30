import type { Metadata } from "next";
import type { WeeklyRule } from "@/lib/scheduling/slots";
import { BookingPreview } from "./preview";

// A static preview of the booking page with sample data, for design reviews and
// end-to-end tests: a mentor in Paris, seen in the browser's own time zone.
export const metadata: Metadata = { title: "Booking preview", robots: { index: false } };

const rules: WeeklyRule[] = [
  { weekday: 2, start: "18:00", end: "20:00" }, // Tuesday evening, Paris time
  { weekday: 4, start: "12:00", end: "13:00" }, // Thursday lunch
];
// Fixed dates, so that the preview and its tests do not depend on today's date.
const now = "2026-11-16T09:00:00.000Z"; // Monday 16 November 2026
const busy = [{ start: "2026-11-17T18:00:00.000Z", end: "2026-11-17T19:00:00.000Z" }]; // already booked

export default function BookingPreviewPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-12">
      <h1 className="text-3xl font-semibold">Book a session with Marc Leroy</h1>
      <BookingPreview rules={rules} busy={busy} now={now} />
    </main>
  );
}
