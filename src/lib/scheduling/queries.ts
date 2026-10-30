import "server-only";
import { connection } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { TimeRange, WeeklyRule } from "./slots";

const BOOKING_HORIZON_DAYS = 28;

/** What the booking page needs: rules and busy times change constantly, so no cache. */
export async function getBookingData(mentorId: string) {
  await connection(); // request-time data: never prerendered
  if (!hasSupabaseEnv) return { rules: [], busy: [], now: new Date() };
  const now = new Date();
  const until = new Date(now.getTime() + BOOKING_HORIZON_DAYS * 86_400_000);
  const supabase = createPublicClient();
  const [{ data: rules }, { data: busy }] = await Promise.all([
    supabase.from("availability_rules").select("weekday, start_time, end_time").eq("mentor_id", mentorId),
    supabase.rpc("mentor_busy_times", { mentor: mentorId, from_time: now.toISOString(), to_time: until.toISOString() }),
  ]);
  return {
    rules: (rules ?? []).map(toRule),
    busy: ((busy ?? []) as { starts_at: string; ends_at: string }[]).map(toRange),
    now,
  };
}

export type SessionItem = {
  id: string;
  start: Date;
  end: Date;
  status: "confirmed" | "cancelled" | "completed";
  role: "learner" | "mentor";
  otherName: string;
};

const CANCEL_NOTICE_MS = 24 * 3600_000; // same rule as the update policy

/** Upcoming confirmed sessions of the signed-in user, as learner or as mentor. */
export async function getUpcomingSessions(userId: string) {
  const now = new Date();
  const sessions = await getMySessions(userId, now);
  return sessions.map((s) => ({ ...s, cancellable: s.start.getTime() - now.getTime() > CANCEL_NOTICE_MS }));
}

/** The user's confirmed sessions that have not ended (RLS returns only theirs). */
export async function getMySessions(userId: string, now = new Date()): Promise<SessionItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, learner_id, learner_name, mentor:mentor_profiles (display_name)")
    .eq("status", "confirmed")
    .gt("ends_at", now.toISOString())
    .order("starts_at");
  if (error) throw new Error("Could not load sessions");
  return data.map((row) => {
    const role = row.learner_id === userId ? "learner" : "mentor";
    const mentor = row.mentor as unknown as { display_name: string } | null;
    return {
      id: row.id,
      ...toRange(row),
      status: row.status,
      role,
      otherName: (role === "learner" ? mentor?.display_name : row.learner_name) || "Former member",
    };
  });
}

export async function getMyRules(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_rules")
    .select("id, weekday, start_time, end_time")
    .eq("mentor_id", userId)
    .order("weekday")
    .order("start_time");
  return (data ?? []).map((row) => ({ id: row.id as string, ...toRule(row) }));
}

function toRule(row: { weekday: number; start_time: string; end_time: string }): WeeklyRule {
  // PostgreSQL returns "18:00:00"; the rules use "18:00".
  return { weekday: row.weekday, start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) };
}

function toRange(row: { starts_at: string; ends_at: string }): TimeRange {
  return { start: new Date(row.starts_at), end: new Date(row.ends_at) };
}
