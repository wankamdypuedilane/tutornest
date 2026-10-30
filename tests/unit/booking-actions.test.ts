// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { availabilityRuleSchema, bookSessionSchema } from "@/lib/scheduling/schemas";

const single = vi.fn();
const updateSelect = vi.fn();
const insert = vi.fn((row: unknown) => (void row, { select: () => ({ single }) }));
const supabase = {
  from: vi.fn(() => ({ insert, update: () => ({ eq: () => ({ select: updateSelect }) }) })),
};
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase }));
vi.mock("@/lib/auth/current-user", () => ({ requireUser: async () => ({ id: "learner-1", email: null }) }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const { bookSession, cancelBooking } = await import("@/app/(app)/sessions/actions");

const MENTOR = "3f0c6a51-8d2e-4b7a-9c41-2e5d8f1a7b90";
const input = { mentorId: MENTOR, startsAt: "2026-11-17T17:00:00.000Z", minutes: 60 as const };

beforeEach(() => vi.clearAllMocks());

describe("bookSession", () => {
  it("sends instants for both ends; the database decides the rest", async () => {
    single.mockResolvedValue({ data: { id: "booking-1" }, error: null });
    expect(await bookSession(input)).toEqual({ ok: true, bookingId: "booking-1" });
    expect(insert).toHaveBeenCalledWith({
      mentor_id: MENTOR,
      starts_at: "2026-11-17T17:00:00.000Z",
      ends_at: "2026-11-17T18:00:00.000Z",
    });
  });

  it("explains an exclusion violation as a slot taken a moment ago", async () => {
    single.mockResolvedValue({ data: null, error: { code: "23P01", message: "conflicting key value violates exclusion constraint" } });
    expect(await bookSession(input)).toMatchObject({ ok: false, message: expect.stringContaining("booked by someone else") });
  });

  it("explains a policy refusal as a time that is no longer available", async () => {
    single.mockResolvedValue({ data: null, error: { code: "42501", message: "new row violates row-level security policy" } });
    expect(await bookSession(input)).toEqual({ ok: false, message: "This time is no longer available." });
  });

  it("refuses other lengths before contacting the database", async () => {
    expect((await bookSession({ ...input, minutes: 45 as 60 })).ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("cancelBooking", () => {
  it("reports the 24-hour rule when the policy matches no row", async () => {
    updateSelect.mockResolvedValue({ data: [], error: null });
    expect(await cancelBooking("a8b2c4d6-1e3f-4a5b-8c7d-9e0f1a2b3c4d")).toEqual({
      ok: false,
      message: "Sessions can be cancelled up to 24 hours before they start.",
    });
  });
});

describe("schemas", () => {
  it("accept availability on the hour or half hour, in order", () => {
    expect(availabilityRuleSchema.safeParse({ weekday: "2", start: "18:00", end: "20:30" }).success).toBe(true);
    expect(availabilityRuleSchema.safeParse({ weekday: "2", start: "18:15", end: "20:00" }).success).toBe(false);
    expect(availabilityRuleSchema.safeParse({ weekday: "2", start: "20:00", end: "18:00" }).success).toBe(false);
    expect(availabilityRuleSchema.safeParse({ weekday: "8", start: "18:00", end: "19:00" }).success).toBe(false);
  });

  it("require a start time with an explicit offset", () => {
    expect(bookSessionSchema.safeParse({ ...input, startsAt: "2026-11-17 18:00" }).success).toBe(false);
  });
});
