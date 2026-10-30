import type { MetadataRoute } from "next";
import { getPublishedMentorSlugs } from "@/lib/mentors/queries";
import { siteUrl } from "@/lib/site";

// /sitemap.xml: the public pages we want search engines to find, including
// every published mentor profile.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const mentors = await getPublishedMentorSlugs();
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/mentors`, changeFrequency: "daily", priority: 0.8 },
    ...mentors.map((mentor) => ({
      url: `${siteUrl}/mentors/${mentor.slug}`,
      lastModified: mentor.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
