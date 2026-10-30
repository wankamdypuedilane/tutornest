import { z } from "zod";

// "React, TypeScript , react" -> ["React", "TypeScript"]: trimmed, de-duplicated
// case-insensitively, empty entries dropped.
export function parseList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of value.split(",")) {
    const item = raw.trim().replace(/\s+/g, " ");
    if (!item || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    items.push(item);
  }
  return items;
}

const list = (max: number, label: string) =>
  z.preprocess(
    parseList,
    z
      .array(z.string().max(30, `Each ${label} must be at most 30 characters.`))
      .max(max, `Add at most ${max} ${label}s.`),
  );

export const TIMEZONES = [
  "Europe/Paris",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Toronto",
  "Africa/Douala",
  "Africa/Dakar",
  "Asia/Singapore",
] as const;

// Mirrors the CHECK constraints of public.mentor_profiles: the form gives
// friendly messages, the database remains the final guard.
export const mentorProfileSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(60, "At most 60 characters.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, digits and single hyphens."),
  display_name: z.string().trim().min(2, "At least 2 characters.").max(80, "At most 80 characters."),
  headline: z.string().trim().max(120, "At most 120 characters."),
  bio: z.string().trim().max(2000, "At most 2,000 characters."),
  skills: list(10, "skill"),
  languages: list(6, "language"),
  timezone: z.enum(TIMEZONES, { error: "Choose a time zone from the list." }),
  is_published: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});

export type MentorProfileInput = z.infer<typeof mentorProfileSchema>;

/** A slug suggestion from a display name: "Inès Martin" -> "ines-martin". */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
