"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/auth/schemas";
import { requireRole } from "@/lib/auth/current-user";
import { mentorProfileSchema } from "@/lib/profile/schemas";
import { createClient } from "@/lib/supabase/server";

export async function saveMentorProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireRole("/mentor/profile", ["mentor"]);
  const parsed = mentorProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  // The previous slug, so that its cached page can be invalidated too.
  const { data: previous } = await supabase
    .from("mentor_profiles")
    .select("slug")
    .eq("id", profile.id)
    .maybeSingle<{ slug: string }>();

  // Insert the first time (the policy requires an approved mentor), update afterwards.
  const { error } = await supabase.from("mentor_profiles").upsert({ id: profile.id, ...parsed.data });
  if (error) {
    // 23505 = unique_violation: the only unique column we write is the slug.
    if (error.code === "23505") {
      return { status: "error", fieldErrors: { slug: ["This address is already taken."] } };
    }
    if (error.code === "42501") {
      return { status: "error", message: "Your mentor application has not been approved yet." };
    }
    return { status: "error", message: "Your profile could not be saved." };
  }

  // Read-your-own-writes: the directory and both slugs are fresh on the next render.
  updateTag("mentors");
  updateTag(`mentor:${parsed.data.slug}`);
  if (previous && previous.slug !== parsed.data.slug) updateTag(`mentor:${previous.slug}`);

  return { status: "success", message: parsed.data.is_published ? "Profile published." : "Draft saved." };
}
