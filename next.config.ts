import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const headers = securityHeaders({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  livekitUrl: process.env.LIVEKIT_URL,
  isDev: process.env.NODE_ENV !== "production",
  https: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://"),
});

const nextConfig: NextConfig = {
  // Security headers on every response (chapter 19).
  async headers() {
    return [{ source: "/:path*", headers }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Avatars may be up to 2 MB; multipart encoding adds a little overhead.
    serverActions: { bodySizeLimit: "3mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
