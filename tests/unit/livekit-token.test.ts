// @vitest-environment node
import { TokenVerifier } from "livekit-server-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake values for tests only: never real keys.
const API_KEY = "APItestkey";
const API_SECRET = "test-secret-that-is-at-least-32-characters-long";
const env: Record<string, string | undefined> = {};
vi.mock("@/lib/env.server", () => ({ serverEnv: env }));

let user: { id: string; email: string | null } | null = null;
vi.mock("@/lib/auth/current-user", () => ({ getCurrentUser: async () => user }));

const maybeSingle = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) }),
}));

let allowed = true;
vi.mock("@/lib/security/rate-limit", () => ({ rateLimit: async () => allowed }));

const { POST } = await import("@/app/api/sessions/[bookingId]/token/route");

const BOOKING = "a8b2c4d6-1e3f-4a5b-8c7d-9e0f1a2b3c4d";
const LEARNER = "11111111-1111-4111-8111-111111111111";
const call = () =>
  POST(new Request(`http://localhost/api/sessions/${BOOKING}/token`, { method: "POST" }), {
    params: Promise.resolve({ bookingId: BOOKING }),
  });
const bookingAt = (minutesFromNow: number) => ({
  id: BOOKING,
  starts_at: new Date(Date.now() + minutesFromNow * 60_000).toISOString(),
  ends_at: new Date(Date.now() + (minutesFromNow + 60) * 60_000).toISOString(),
  status: "confirmed",
  learner_id: LEARNER,
  learner_name: "Inès Martin",
  mentor: { display_name: "Marc Leroy" },
});

beforeEach(() => {
  Object.assign(env, { LIVEKIT_URL: "wss://tutornest-test.livekit.cloud", LIVEKIT_API_KEY: API_KEY, LIVEKIT_API_SECRET: API_SECRET });
  user = { id: LEARNER, email: "ines@example.com" };
  maybeSingle.mockReset();
});

describe("POST /api/sessions/[bookingId]/token", () => {
  it("refuses visitors without a session", async () => {
    user = null;
    expect((await call()).status).toBe(401);
  });

  it("answers 404 when RLS hides the booking (not a participant)", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect((await call()).status).toBe(404);
  });

  it("keeps the room closed until 10 minutes before the start", async () => {
    maybeSingle.mockResolvedValue({ data: bookingAt(30) });
    expect((await call()).status).toBe(403);
  });

  it("issues a signed token for this user and this booking's room only", async () => {
    maybeSingle.mockResolvedValue({ data: bookingAt(5) });
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const { token, serverUrl } = await response.json();
    expect(serverUrl).toBe("wss://tutornest-test.livekit.cloud");

    // Verify the signature with the secret, as the LiveKit server will.
    const claims = await new TokenVerifier(API_KEY, API_SECRET).verify(token);
    expect(claims.sub).toBe(LEARNER);
    expect(claims.name).toBe("Inès Martin");
    expect(claims.video).toMatchObject({ roomJoin: true, room: `session-${BOOKING}`, canPublish: true });
    // Valid until the join window closes: 5 + 60 + 15 minutes from now.
    const expiresInMinutes = ((claims.exp ?? 0) * 1000 - Date.now()) / 60_000;
    expect(expiresInMinutes).toBeGreaterThan(78);
    expect(expiresInMinutes).toBeLessThan(82);
    // A token signed with another secret is rejected.
    await expect(new TokenVerifier(API_KEY, "another-secret-of-at-least-32-characters").verify(token)).rejects.toThrow();
  });

  it("says when video is not configured instead of failing obscurely", async () => {
    env.LIVEKIT_API_SECRET = undefined;
    maybeSingle.mockResolvedValue({ data: bookingAt(5) });
    expect((await call()).status).toBe(503);
  });

  it("answers 429 with Retry-After when a user asks too often", async () => {
    allowed = false;
    const response = await call();
    allowed = true;
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(maybeSingle).not.toHaveBeenCalled();
  });
});
