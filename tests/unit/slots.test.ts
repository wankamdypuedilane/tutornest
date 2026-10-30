import { describe, expect, it } from "vitest";
import { canJoin, formatTimeRange, generateSlots, groupByDay, type WeeklyRule } from "@/lib/scheduling/slots";

const tuesdayEvening: WeeklyRule[] = [{ weekday: 2, start: "18:00", end: "20:00" }];
const iso = (d: Date) => d.toISOString();
const base = { timeZone: "Europe/Paris", days: 7, busy: [], notBefore: new Date("2026-01-01T00:00:00Z") };

describe("generateSlots", () => {
  it("builds 60-minute slots every half hour inside the window", () => {
    const slots = generateSlots(tuesdayEvening, { ...base, from: new Date("2026-11-16T12:00:00Z"), minutes: 60 });
    // Tuesday 17 November 2026, Paris is UTC+1: 18:00 local = 17:00 UTC.
    expect(slots.map((s) => iso(s.start))).toEqual([
      "2026-11-17T17:00:00.000Z",
      "2026-11-17T17:30:00.000Z",
      "2026-11-17T18:00:00.000Z",
    ]);
    expect(iso(slots[2]!.end)).toBe("2026-11-17T19:00:00.000Z");
  });

  it("follows daylight saving time: 18:00 in Paris is 16:00 UTC in summer", () => {
    const slots = generateSlots(tuesdayEvening, { ...base, from: new Date("2027-04-05T12:00:00Z"), minutes: 60 });
    expect(iso(slots[0]!.start)).toBe("2027-04-06T16:00:00.000Z");
  });

  it("keeps the local time across the change of time in March", () => {
    // Paris moves to summer time on Sunday 28 March 2027 at 02:00.
    const sundays: WeeklyRule[] = [{ weekday: 7, start: "10:00", end: "11:00" }];
    const slots = generateSlots(sundays, { ...base, from: new Date("2027-03-20T12:00:00Z"), days: 14, minutes: 60 });
    expect(slots.map((s) => iso(s.start))).toEqual(["2027-03-21T09:00:00.000Z", "2027-03-28T08:00:00.000Z"]);
  });

  it("skips busy times and times before the notice period", () => {
    const busy = [{ start: new Date("2026-11-17T17:30:00Z"), end: new Date("2026-11-17T18:00:00Z") }];
    const slots = generateSlots(tuesdayEvening, {
      ...base,
      busy,
      from: new Date("2026-11-16T12:00:00Z"),
      minutes: 30,
      notBefore: new Date("2026-11-17T17:15:00Z"),
    });
    expect(slots.map((s) => iso(s.start))).toEqual(["2026-11-17T18:00:00.000Z", "2026-11-17T18:30:00.000Z"]);
  });

  it("gives no duplicates when rules overlap", () => {
    const rules = [...tuesdayEvening, { weekday: 2, start: "19:00", end: "21:00" }];
    const slots = generateSlots(rules, { ...base, from: new Date("2026-11-16T12:00:00Z"), minutes: 60 });
    expect(new Set(slots.map((s) => s.start.getTime())).size).toBe(slots.length);
    expect(slots).toHaveLength(5); // 18:00, 18:30, 19:00, 19:30, 20:00
  });
});

describe("display in the viewer's time zone", () => {
  // PRD acceptance criterion: Tuesday 18:00-19:00 Europe/Paris is 17:00-18:00 for a learner in London.
  const slot = { start: new Date("2026-11-17T17:00:00Z"), end: new Date("2026-11-17T18:00:00Z") };

  it("shows the mentor's 18:00 as 17:00 in London and 12:00 in New York", () => {
    expect(formatTimeRange(slot, "Europe/London")).toBe("17:00–18:00");
    expect(formatTimeRange(slot, "America/New_York")).toBe("12:00–13:00");
    expect(formatTimeRange(slot, "Europe/Paris")).toBe("18:00–19:00");
  });

  it("groups slots by the viewer's day, which may differ from the mentor's", () => {
    const late = { start: new Date("2026-11-17T23:30:00Z"), end: new Date("2026-11-18T00:30:00Z") };
    expect(groupByDay([slot, late], "Europe/Paris").map((g) => g.label)).toEqual(["Tuesday 17 November", "Wednesday 18 November"]);
    expect(groupByDay([slot, late], "America/New_York").map((g) => g.label)).toEqual(["Tuesday 17 November"]);
  });
});

describe("canJoin", () => {
  const session = { start: new Date("2026-11-17T17:00:00Z"), end: new Date("2026-11-17T18:00:00Z") };
  it("opens 10 minutes before and closes 15 minutes after the session", () => {
    expect(canJoin(session, new Date("2026-11-17T16:49:00Z"))).toBe(false);
    expect(canJoin(session, new Date("2026-11-17T16:50:00Z"))).toBe(true);
    expect(canJoin(session, new Date("2026-11-17T18:14:00Z"))).toBe(true);
    expect(canJoin(session, new Date("2026-11-17T18:15:00Z"))).toBe(false);
  });
});
