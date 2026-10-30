import { z } from "zod";

// Server-only configuration. Values are optional at this stage so that the
// app builds without secrets; each feature checks for the keys it needs.
export const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z
    .string()
    .startsWith("sb_secret_", "must be a Supabase secret key (sb_secret_...)")
    .optional(),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  // LiveKit (video sessions). The URL is sent to the browser by the token route:
  // wss:// in production, ws://localhost:7880 for `livekit-server --dev`.
  LIVEKIT_URL: z
    .url()
    .refine((url) => url.startsWith("wss://") || /^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url), {
      message: "must be a wss:// URL (ws:// only for a local server)",
    })
    .optional(),
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    // Name the variable, never print its value: it may be a secret.
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${problems}`);
  }
  return result.data;
}
