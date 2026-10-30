import { describe, expect, it } from "vitest";
import { avatarObjectPath, avatarPublicUrl, sniffImageType } from "@/lib/profile/avatar";
import { mentorProfileSchema, parseList, slugify } from "@/lib/profile/schemas";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

describe("sniffImageType", () => {
  it("recognises PNG, JPEG and WebP by their first bytes", () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });

  it("rejects anything else, whatever the file is called", () => {
    // An SVG (which can contain scripts) or HTML renamed photo.png.
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<!doctype html><script>"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("avatar paths", () => {
  it("stores each upload in the user's folder under a new name", () => {
    expect(avatarObjectPath("u-1", "image/webp", 1730280000000)).toBe("u-1/avatar-1730280000000.webp");
    expect(avatarObjectPath("u-1", "image/jpeg", 1)).toBe("u-1/avatar-1.jpg");
  });

  it("builds no URL when there is no avatar", () => {
    expect(avatarPublicUrl(null)).toBeNull();
  });
});

describe("parseList", () => {
  it("trims, drops empty entries and removes case-insensitive duplicates", () => {
    expect(parseList(" React, TypeScript ,, react ,  Node   js ")).toEqual(["React", "TypeScript", "Node js"]);
    expect(parseList(undefined)).toEqual([]);
  });
});

describe("slugify", () => {
  it("turns a display name into a URL-safe address", () => {
    expect(slugify("Inès Martin")).toBe("ines-martin");
    expect(slugify("  Amina   Diallo-Touré! ")).toBe("amina-diallo-toure");
  });
});

describe("mentorProfileSchema", () => {
  const valid = {
    slug: "ines-martin",
    display_name: "Inès Martin",
    headline: "Senior React developer",
    bio: "Ten years of front-end work.",
    skills: "React, TypeScript",
    languages: "French, English",
    timezone: "Europe/Paris",
    is_published: "on",
  };

  it("accepts a valid profile and converts lists and the switch", () => {
    const result = mentorProfileSchema.parse(valid);
    expect(result.skills).toEqual(["React", "TypeScript"]);
    expect(result.is_published).toBe(true);
  });

  it("treats a missing switch as unpublished", () => {
    const { is_published: _ignored, ...rest } = valid;
    expect(mentorProfileSchema.parse(rest).is_published).toBe(false);
  });

  it("rejects bad slugs, too many skills and unknown time zones", () => {
    expect(mentorProfileSchema.safeParse({ ...valid, slug: "Inès--Martin" }).success).toBe(false);
    expect(mentorProfileSchema.safeParse({ ...valid, slug: "-ines" }).success).toBe(false);
    const skills = Array.from({ length: 11 }, (_, i) => `skill${i}`).join(",");
    expect(mentorProfileSchema.safeParse({ ...valid, skills }).success).toBe(false);
    expect(mentorProfileSchema.safeParse({ ...valid, timezone: "Mars/Olympus" }).success).toBe(false);
  });
});
