// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// A configured project with a signed-out visitor: getClaims finds no claims.
vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseEnv: true,
  supabaseUrl: "https://example.supabase.co",
  supabasePublishableKey: "sb_publishable_test",
}));
const setAllHeaders = { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0" };
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: object[], headers: Record<string, string>) => void } }) => ({
    auth: {
      getClaims: async () => {
        // As when a token is refreshed: new cookies, with the headers that forbid caching.
        options.cookies.setAll([{ name: "sb-test", value: "v", options: {} }], setAllHeaders);
        return { data: null };
      },
    },
  }),
}));

const { updateSession } = await import("@/lib/supabase/proxy");
const visit = (path: string) => updateSession(new NextRequest(`http://localhost${path}`));

describe("proxy", () => {
  it("sends signed-out visitors of private paths to sign-in, keeping the path", async () => {
    for (const path of ["/mentor", "/mentor/profile", "/dashboard", "/settings/account"]) {
      const response = await visit(path);
      expect(response.status, path).toBe(307);
      expect(response.headers.get("location"), path).toContain(`/sign-in?next=${encodeURIComponent(path)}`);
    }
  });

  it("leaves public paths that merely start like a private one alone", async () => {
    for (const path of ["/mentors", "/mentors/ada-lovelace", "/"]) {
      expect((await visit(path)).status, path).toBe(200);
    }
  });

  it("forbids caching a response that sets auth cookies", async () => {
    const response = await visit("/mentors");
    expect(response.headers.get("cache-control")).toBe(setAllHeaders["Cache-Control"]);
    expect(response.cookies.get("sb-test")?.value).toBe("v");
  });
});
