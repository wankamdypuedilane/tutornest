import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MentorProfileForm } from "@/components/profile/mentor-profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/current-user";
import type { MentorProfileInput } from "@/lib/profile/schemas";
import { slugify } from "@/lib/profile/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mentor profile", robots: { index: false } };

export default function MentorProfilePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Your mentor profile</h1>
        <p className="text-muted-foreground">
          This is what learners see in the directory. Your photo is managed in{" "}
          <Link href="/settings" className="underline underline-offset-4">Settings</Link>.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
        <ProfileEditor />
      </Suspense>
    </main>
  );
}

async function ProfileEditor() {
  // Learners get a 404: the page does not exist for them.
  const profile = await requireRole("/mentor/profile", ["mentor"]);
  if (profile.mentor_status !== "approved") {
    return (
      <p role="status" className="rounded-lg border p-4">
        Your application is under review. You can write your profile once it is approved.
      </p>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("mentor_profiles")
    .select("slug, display_name, headline, bio, skills, languages, timezone, is_published")
    .eq("id", profile.id)
    .maybeSingle<MentorProfileInput>();

  const initial: MentorProfileInput = data ?? {
    slug: slugify(profile.full_name),
    display_name: profile.full_name,
    headline: "",
    bio: "",
    skills: [],
    languages: [],
    timezone: "Europe/Paris",
    is_published: false,
  };
  return <MentorProfileForm initial={initial} />;
}
