import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { serverEnv } from "@/lib/env.server";
import { createSessionToken } from "@/lib/livekit/token";
import { canJoin } from "@/lib/scheduling/slots";
import { createClient } from "@/lib/supabase/server";

const reply = (body: object, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// POST, not GET: a token is created on purpose, by a click, never by a prefetch.
export async function POST(_request: Request, ctx: RouteContext<"/api/sessions/[bookingId]/token">) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Sign in to join this session." }, 401);
  const { bookingId } = await ctx.params;
  if (!z.uuid().safeParse(bookingId).success) return reply({ error: "Session not found." }, 404);

  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = serverEnv;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return reply({ error: "Video sessions are not configured on this server." }, 503);
  }

  // RLS: only the learner and the mentor of this booking get a row.
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, learner_id, learner_name, mentor:mentor_profiles (display_name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.status !== "confirmed") return reply({ error: "Session not found." }, 404);

  const session = { start: new Date(booking.starts_at), end: new Date(booking.ends_at) };
  const now = new Date();
  if (!canJoin(session, now)) {
    return reply({ error: "The room opens 10 minutes before the session and closes 15 minutes after it." }, 403);
  }

  const mentor = booking.mentor as unknown as { display_name: string } | null;
  const name = booking.learner_id === user.id ? booking.learner_name : (mentor?.display_name ?? "Mentor");
  const token = await createSessionToken({
    apiKey: LIVEKIT_API_KEY,
    apiSecret: LIVEKIT_API_SECRET,
    bookingId: booking.id,
    session,
    user: { id: user.id, name },
    now,
  });
  return reply({ token, serverUrl: LIVEKIT_URL }, 200);
}
