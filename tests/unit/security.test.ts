import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/security/client-ip";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security/headers";

const production = {
  supabaseUrl: "https://abcdefgh.supabase.co",
  livekitUrl: "wss://tutornest-test.livekit.cloud",
  isDev: false,
  https: true,
};

const directives = (policy: string) =>
  Object.fromEntries(policy.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));

describe("Content Security Policy", () => {
  it("lets the browser talk only to our site, Supabase and LiveKit", () => {
    const csp = directives(contentSecurityPolicy(production));
    expect(csp["connect-src"]).toEqual([
      "'self'",
      "https://abcdefgh.supabase.co",
      "wss://abcdefgh.supabase.co",
      "wss://tutornest-test.livekit.cloud",
      "https://tutornest-test.livekit.cloud",
    ]);
    expect(csp["img-src"]).toContain("https://abcdefgh.supabase.co");
  });

  it("forbids plugins, framing by other sites, foreign base URLs and form targets", () => {
    const csp = directives(contentSecurityPolicy(production));
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
    expect(csp["form-action"]).toEqual(["'self'", "https://abcdefgh.supabase.co"]);
    expect(csp["upgrade-insecure-requests"]).toEqual([]);
  });

  it("allows eval only in development", () => {
    expect(directives(contentSecurityPolicy(production))["script-src"]).not.toContain("'unsafe-eval'");
    const dev = directives(contentSecurityPolicy({ ...production, isDev: true, https: false }));
    expect(dev["script-src"]).toContain("'unsafe-eval'");
    expect(dev["upgrade-insecure-requests"]).toBeUndefined();
  });

  it("works with the local Supabase stack and without LiveKit", () => {
    const csp = directives(contentSecurityPolicy({ supabaseUrl: "http://127.0.0.1:54321", isDev: true, https: false }));
    expect(csp["connect-src"]).toEqual(["'self'", "http://127.0.0.1:54321", "ws://127.0.0.1:54321"]);
  });
});

describe("security headers", () => {
  it("send HSTS only over HTTPS", () => {
    const keys = (https: boolean) => securityHeaders({ ...production, https }).map((h) => h.key);
    expect(keys(true)).toContain("Strict-Transport-Security");
    expect(keys(false)).not.toContain("Strict-Transport-Security");
  });

  it("allow the camera and microphone for our own pages only", () => {
    const permissions = securityHeaders(production).find((h) => h.key === "Permissions-Policy");
    expect(permissions?.value).toBe("camera=(self), microphone=(self), geolocation=(), payment=()");
  });
});

describe("clientIp", () => {
  it("takes the first address set by the platform", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("never returns arbitrary text, which would become part of a database key", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "'; drop table x; --" }))).toBe("unknown");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
