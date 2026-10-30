"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/auth/schemas";
import { requireUser } from "@/lib/auth/current-user";
import { deleteAccountSchema, notificationSettingsSchema } from "@/lib/settings/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function saveNotificationSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/settings");
  const parsed = notificationSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid settings." };

  const supabase = await createClient();
  // Upsert: create the row the first time, update it afterwards. RLS checks user_id.
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...parsed.data });
  if (error) return { status: "error", message: "Your settings could not be saved." };
  return { status: "success", message: "Settings saved." };
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/settings");
  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    // Deleting the auth user cascades to profiles, mentor profile and settings.
    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch {
    return { status: "error", message: "We could not delete your account. Please contact support." };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
