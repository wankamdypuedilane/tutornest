"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/auth/schemas";
import { requireRole } from "@/lib/auth/current-user";
import { availabilityRuleSchema } from "@/lib/scheduling/schemas";
import { createClient } from "@/lib/supabase/server";

export async function addAvailability(_prev: FormState, formData: FormData): Promise<FormState> {
  const mentor = await requireRole("/mentor/availability", ["mentor"]);
  const parsed = availabilityRuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { weekday, start, end } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_rules")
    .insert({ mentor_id: mentor.id, weekday, start_time: start, end_time: end });
  if (error) return { status: "error", message: "This time could not be added." };
  refresh();
  return { status: "success", message: "Availability added." };
}

export async function removeAvailability(ruleId: string): Promise<{ ok: boolean }> {
  await requireRole("/mentor/availability", ["mentor"]);
  if (!z.uuid().safeParse(ruleId).success) return { ok: false };
  const supabase = await createClient();
  // Booked sessions are not affected: they are stored as instants.
  const { data, error } = await supabase.from("availability_rules").delete().eq("id", ruleId).select("id");
  if (error || data.length === 0) return { ok: false };
  refresh();
  return { ok: true };
}
