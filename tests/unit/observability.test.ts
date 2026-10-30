// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { log, redact } from "@/lib/log";

afterEach(() => vi.restoreAllMocks());

describe("redact", () => {
  it("masks secrets and personal data at any depth, and keeps the rest", () => {
    expect(
      redact({
        bookingId: "b1",
        email: "ines@example.com",
        headers: { authorization: "Bearer x", cookie: "sb=1", accept: "text/html" },
        attempts: [{ apiKey: "re_123", status: 500 }],
      }),
    ).toEqual({
      bookingId: "b1",
      email: "[redacted]",
      headers: { authorization: "[redacted]", cookie: "[redacted]", accept: "text/html" },
      attempts: [{ apiKey: "[redacted]", status: 500 }],
    });
  });
});

describe("log", () => {
  it("writes one JSON line per event", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log("error", "Delivery failed", { notificationId: "n1", token: "secret" });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line).toMatchObject({ level: "error", message: "Delivery failed", notificationId: "n1", token: "[redacted]" });
    expect(Date.parse(line.time)).not.toBeNaN();
  });
});

describe("GET /api/health", () => {
  it("answers 200 without a database to check, and is never cached", async () => {
    vi.doMock("@/lib/supabase/env", () => ({ hasSupabaseEnv: false }));
    vi.doMock("next/server", () => ({ connection: async () => {} }));
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok", database: "not configured", version: "local" });
  });

  it("answers 503 when the database does not answer", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/env", () => ({ hasSupabaseEnv: true }));
    vi.doMock("next/server", () => ({ connection: async () => {} }));
    const failing = { select: () => ({ limit: async () => ({ error: { message: "timeout" } }) }) };
    vi.doMock("@/lib/supabase/public", () => ({ createPublicClient: () => ({ from: () => failing }) }));
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: "error", database: "down" });
  });
});
