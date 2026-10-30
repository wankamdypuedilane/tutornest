import { describe, expect, it } from "vitest";
import { parseDirectoryFilters } from "@/lib/mentors/filters";
import { initials } from "@/components/mentors/mentor-card";

describe("parseDirectoryFilters", () => {
  it("normalizes a valid skill and keeps a known language", () => {
    expect(parseDirectoryFilters({ skill: "  React ", language: "French" })).toEqual({
      skill: "react",
      language: "French",
    });
  });

  it("drops values that are not acceptable filters", () => {
    expect(
      parseDirectoryFilters({ skill: "<script>alert(1)</script>", language: "Klingon" }),
    ).toEqual({ skill: null, language: null });
  });

  it("uses the first value when a parameter is repeated", () => {
    expect(parseDirectoryFilters({ skill: ["sql", "react"] }).skill).toBe("sql");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two names", () => {
    expect(initials("amina  diallo touré")).toBe("AD");
  });
});
