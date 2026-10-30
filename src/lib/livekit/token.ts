import "server-only";
import { AccessToken } from "livekit-server-sdk";
import { joinWindow, type TimeRange } from "@/lib/scheduling/slots";

export type SessionTokenInput = {
  apiKey: string;
  apiSecret: string;
  bookingId: string;
  session: TimeRange;
  user: { id: string; name: string };
  now: Date;
};

/** One room per booking, named after it: no guessing, no sharing between sessions. */
export const roomName = (bookingId: string) => `session-${bookingId}`;

/**
 * A LiveKit access token: a JWT signed with the API secret, which allows this
 * user, and only this user, into this booking's room until the join window closes.
 */
export async function createSessionToken({ apiKey, apiSecret, bookingId, session, user, now }: SessionTokenInput) {
  const closes = joinWindow(session).end;
  const ttlSeconds = Math.max(60, Math.ceil((closes.getTime() - now.getTime()) / 1000));
  const token = new AccessToken(apiKey, apiSecret, { identity: user.id, name: user.name, ttl: ttlSeconds });
  token.addGrant({
    roomJoin: true,
    room: roomName(bookingId),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt(); // asynchronous since livekit-server-sdk 2
}
