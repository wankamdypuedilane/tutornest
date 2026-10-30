import type { Metadata } from "next";
import { Suspense } from "react";
import { AvailabilityEditor } from "@/components/booking/availability-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/current-user";
import { getMyRules } from "@/lib/scheduling/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Availability", robots: { index: false } };

export default function AvailabilityPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Your weekly availability</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Editor />
      </Suspense>
    </main>
  );
}

async function Editor() {
  const mentor = await requireRole("/mentor/availability", ["mentor"]);
  const supabase = await createClient();
  const [{ data: profile }, rules] = await Promise.all([
    supabase.from("mentor_profiles").select("timezone").eq("id", mentor.id).maybeSingle<{ timezone: string }>(),
    getMyRules(mentor.id),
  ]);
  if (!profile) return <p>Create your public mentor profile first: learners book through it.</p>;
  return <AvailabilityEditor rules={rules} timeZone={profile.timezone} />;
}
