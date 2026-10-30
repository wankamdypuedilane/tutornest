import { cacheLife, cacheTag } from "next/cache";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { DirectoryFilters } from "./filters";

export type MentorSummary = {
  slug: string;
  display_name: string;
  headline: string;
  skills: string[];
  languages: string[];
  avatar_path: string | null;
};

export type MentorProfile = MentorSummary & { id: string; bio: string; timezone: string };

/** Published mentors matching the filters. Cached: identical for every visitor. */
export async function getPublishedMentors(filters: DirectoryFilters): Promise<MentorSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("mentors");

  if (!hasSupabaseEnv) return [];
  let query = createPublicClient()
    .from("mentor_profiles")
    .select("slug, display_name, headline, skills, languages, avatar_path")
    .eq("is_published", true)
    .order("display_name")
    .limit(50);
  if (filters.skill) query = query.contains("skills", [filters.skill]);
  if (filters.language) query = query.contains("languages", [filters.language]);

  const { data, error } = await query;
  if (error) throw new Error("Could not load mentors");
  return data;
}

/** One published mentor, or null. */
export async function getMentorBySlug(slug: string): Promise<MentorProfile | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("mentors", `mentor:${slug}`);

  if (!hasSupabaseEnv) return null;
  const { data } = await createPublicClient()
    .from("mentor_profiles")
    .select("id, slug, display_name, headline, bio, skills, languages, timezone, avatar_path")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle<MentorProfile>();
  return data;
}
