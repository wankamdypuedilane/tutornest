import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// /robots.txt: what search engines may crawl. This is a request, not a
// protection: private pages are protected by authentication and RLS.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/settings", "/sessions", "/notifications", "/mentor/", "/design"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
