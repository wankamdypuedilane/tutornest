"use server";

import { updateTag } from "next/cache";
import type { FormState } from "@/lib/auth/schemas";
import { requireUser } from "@/lib/auth/current-user";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, avatarObjectPath, sniffImageType } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";

export async function uploadAvatar(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/settings");
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", fieldErrors: { avatar: ["Choose an image."] } };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { status: "error", fieldErrors: { avatar: ["The image must be 2 MB or smaller."] } };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) {
    return { status: "error", fieldErrors: { avatar: ["Use a PNG, JPEG or WebP image."] } };
  }

  const supabase = await createClient();
  const path = avatarObjectPath(user.id, type);
  // Uploaded with the user's session: the storage policy checks the folder.
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  if (uploadError) return { status: "error", message: "The image could not be uploaded." };

  const { data: previous } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single<{ avatar_path: string | null }>();

  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) {
    // Do not leave an orphan file behind.
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return { status: "error", message: "The image could not be saved." };
  }
  // Mentors show the same photo in the directory (no row yet: nothing updated).
  await supabase.from("mentor_profiles").update({ avatar_path: path }).eq("id", user.id);
  if (previous?.avatar_path) await supabase.storage.from(AVATAR_BUCKET).remove([previous.avatar_path]);

  updateTag("mentors");
  return { status: "success", message: "Photo updated." };
}

export async function removeAvatar(): Promise<FormState> {
  const user = await requireUser("/settings");
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single<{ avatar_path: string | null }>();
  if (!current?.avatar_path) return { status: "success", message: "No photo to remove." };

  await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  await supabase.from("mentor_profiles").update({ avatar_path: null }).eq("id", user.id);
  await supabase.storage.from(AVATAR_BUCKET).remove([current.avatar_path]);
  updateTag("mentors");
  return { status: "success", message: "Photo removed." };
}
