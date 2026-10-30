// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mentors/queries", () => ({
  getPublishedMentorSlugs: async () => [{ slug: "marc-leroy", updated_at: "2026-11-05T10:00:00Z" }],
}));

const { default: robots } = await import("@/app/robots");
const { default: sitemap } = await import("@/app/sitemap");

describe("robots.txt", () => {
  it("allows public pages, asks crawlers to skip private ones, and points to the sitemap", () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0]! : result.rules;
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual(expect.arrayContaining(["/dashboard", "/sessions", "/api/"]));
    expect(result.sitemap).toBe("http://localhost:3000/sitemap.xml");
  });
});

describe("sitemap.xml", () => {
  it("lists the home page, the directory and every published mentor with absolute URLs", async () => {
    const entries = await sitemap();
    expect(entries.map((e) => e.url)).toEqual([
      "http://localhost:3000/",
      "http://localhost:3000/mentors",
      "http://localhost:3000/mentors/marc-leroy",
    ]);
    expect(entries[2]!.lastModified).toBe("2026-11-05T10:00:00Z");
  });
});
