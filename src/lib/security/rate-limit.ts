import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Limit = { key: string; limit: number; windowSeconds: number };

/**
 * Counts one request and says whether it is allowed (see the rate_limits
 * migration). If the counter itself fails, `onError` decides: "allow" keeps the
 * feature available (sign-in fails anyway if the database is down), "deny"
 * protects expensive or dangerous operations.
 */
export async function rateLimit(
  { key, limit, windowSeconds }: Limit,
  onError: "allow" | "deny" = "allow",
): Promise<boolean> {
  // Local previews without a secret key have no counter. Production must set it.
  if (!serverEnv.SUPABASE_SECRET_KEY) return true;
  try {
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error(`[rate-limit] counter unavailable for ${key.split(":")[0]}`, error);
    return onError === "allow";
  }
}

/** Counters never store e-mail addresses: a hash is enough to tell them apart. */
export function hashKey(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}
