import { TZDate, tz } from "@date-fns/tz";
import { addDays, addMinutes, format, getISODay, startOfDay } from "date-fns";

// Scheduling rules as pure functions: no database, no clock (the caller passes
// "now"), so every rule, daylight saving time included, is easy to test.

/** A weekly window in the mentor's time zone. weekday: 1 = Monday ... 7 = Sunday. */
export type WeeklyRule = { weekday: number; start: string; end: string };
export type TimeRange = { start: Date; end: Date };
export type SessionLength = 30 | 60;

export type SlotOptions = {
  timeZone: string; // the mentor's IANA time zone, e.g. "Europe/Paris"
  from: Date; // first day to consider (any instant during that day)
  days: number;
  minutes: SessionLength;
  busy: TimeRange[];
  notBefore: Date; // usually now + the minimum notice
};

const STEP_MINUTES = 30; // slots start on the hour and the half hour

function hoursAndMinutes(time: string): [number, number] {
  const [hours, minutes] = time.split(":").map(Number);
  return [hours ?? 0, minutes ?? 0];
}

/** Bookable slots, as instants, sorted. Times are built in the mentor's zone. */
export function generateSlots(rules: WeeklyRule[], options: SlotOptions): TimeRange[] {
  const { timeZone, from, days, minutes, busy, notBefore } = options;
  const firstDay = startOfDay(new TZDate(from, timeZone));
  const slots = new Map<number, TimeRange>(); // keyed by start: overlapping rules give no duplicates

  for (let offset = 0; offset < days; offset++) {
    const day = addDays(firstDay, offset);
    for (const rule of rules.filter((r) => r.weekday === getISODay(day))) {
      const at = (time: string) =>
        new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), ...hoursAndMinutes(time), timeZone);
      const windowEnd = at(rule.end);
      for (let start = at(rule.start); addMinutes(start, minutes) <= windowEnd; start = addMinutes(start, STEP_MINUTES)) {
        const end = addMinutes(start, minutes);
        if (start < notBefore) continue;
        if (busy.some((b) => b.start < end && start < b.end)) continue; // [start, end) overlaps
        slots.set(start.getTime(), { start: new Date(start.getTime()), end: new Date(end.getTime()) });
      }
    }
  }
  return [...slots.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Slots grouped by day, as the viewer sees them in their own time zone. */
export function groupByDay(slots: TimeRange[], viewerTimeZone: string) {
  const groups = new Map<string, { label: string; slots: TimeRange[] }>();
  for (const slot of slots) {
    const key = format(slot.start, "yyyy-MM-dd", { in: tz(viewerTimeZone) });
    const label = format(slot.start, "EEEE d MMMM", { in: tz(viewerTimeZone) });
    const group = groups.get(key) ?? { label, slots: [] };
    group.slots.push(slot);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** "17:00–18:00" in the viewer's time zone. */
export function formatTimeRange(range: TimeRange, viewerTimeZone: string): string {
  const time = (date: Date) => format(date, "HH:mm", { in: tz(viewerTimeZone) });
  return `${time(range.start)}–${time(range.end)}`;
}

/** Participants may join from 10 minutes before the start to 15 minutes after the end. */
export function joinWindow(range: TimeRange): TimeRange {
  return { start: addMinutes(range.start, -10), end: addMinutes(range.end, 15) };
}

export function canJoin(range: TimeRange, now: Date): boolean {
  const window = joinWindow(range);
  return now >= window.start && now < window.end;
}
