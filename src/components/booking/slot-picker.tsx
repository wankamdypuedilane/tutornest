"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { type BookingResult, bookSession } from "@/app/(app)/sessions/actions";
import { Button } from "@/components/ui/button";
import type { BookSessionInput } from "@/lib/scheduling/schemas";
import { formatTimeRange, generateSlots, groupByDay, type SessionLength, type WeeklyRule } from "@/lib/scheduling/slots";
import { useViewerTimeZone } from "@/lib/scheduling/use-viewer-time-zone";
import { cn } from "@/lib/utils";

export type SlotPickerProps = {
  mentorId: string;
  mentorName: string;
  mentorTimeZone: string;
  rules: WeeklyRule[];
  busy: { start: string; end: string }[]; // ISO instants, serializable
  now: string; // the server's clock, so server and browser compute the same slots
  signedIn: boolean;
  signInHref: string;
  onBook?: (input: BookSessionInput) => Promise<BookingResult>;
  viewerTimeZone?: string; // tests only; normally read from the browser
};

const NOTICE_MS = 60 * 60_000; // same minimum notice as the insert policy
const HORIZON_DAYS = 28;

export function SlotPicker(props: SlotPickerProps) {
  const { mentorId, mentorName, mentorTimeZone, rules, busy, now, signedIn, signInHref, onBook = bookSession } = props;
  const browserTimeZone = useViewerTimeZone();
  const viewerTimeZone = props.viewerTimeZone ?? browserTimeZone;
  const [minutes, setMinutes] = useState<SessionLength>(60);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [pending, startTransition] = useTransition();

  const slots = useMemo(() => {
    // Only in the browser: on the server the viewer is unknown, and Next.js
    // refuses to prerender a Client Component that reads the clock.
    if (!viewerTimeZone) return [];
    const start = new Date(now);
    return generateSlots(rules, {
      timeZone: mentorTimeZone,
      from: start,
      days: HORIZON_DAYS,
      minutes,
      busy: busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) })),
      notBefore: new Date(start.getTime() + NOTICE_MS),
    });
  }, [viewerTimeZone, rules, mentorTimeZone, minutes, busy, now]);

  // Server render: the viewer's time zone is unknown, so times are not shown yet.
  if (!viewerTimeZone) return <p className="text-muted-foreground">Loading available times…</p>;
  const days = groupByDay(slots, viewerTimeZone);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    startTransition(async () => {
      const outcome = await onBook({ mentorId, startsAt: selected, minutes });
      setResult(outcome);
      if (outcome.ok) setSelected(null);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Length</legend>
        <div className="flex gap-4">
          {([30, 60] as const).map((length) => (
            <label key={length} className="flex items-center gap-2">
              <input
                type="radio"
                name="length"
                value={length}
                checked={minutes === length}
                onChange={() => {
                  setMinutes(length);
                  setSelected(null);
                }}
              />
              {length} minutes
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-sm text-muted-foreground">
        Times are shown in your time zone ({viewerTimeZone}). {mentorName} works in {mentorTimeZone}.
      </p>

      {days.length === 0 ? (
        <p>No free time in the next four weeks.</p>
      ) : (
        days.map((day) => (
          <fieldset key={day.label} className="space-y-2">
            <legend className="font-medium">{day.label}</legend>
            <div className="flex flex-wrap gap-2">
              {day.slots.map((slot) => {
                const value = slot.start.toISOString();
                return (
                  <label
                    key={value}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-1.5 text-sm tabular-nums has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                      selected === value ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary",
                    )}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={value}
                      checked={selected === value}
                      onChange={() => setSelected(value)}
                      className="sr-only"
                    />
                    {formatTimeRange(slot, viewerTimeZone)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))
      )}

      {signedIn ? (
        <Button type="submit" disabled={!selected || pending}>
          {pending ? "Booking…" : "Book this session"}
        </Button>
      ) : (
        <Button asChild>
          <Link href={signInHref}>Sign in to book</Link>
        </Button>
      )}

      <p role="status" className={cn("text-sm", result && !result.ok && "text-destructive")}>
        {result?.ok && (
          <>
            Booked. You will find the session in <Link href="/sessions" className="underline">your sessions</Link>.
          </>
        )}
        {result && !result.ok && result.message}
      </p>
    </form>
  );
}
