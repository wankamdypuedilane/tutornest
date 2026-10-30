import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile, requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-12">
      <Suspense fallback={<Skeleton className="h-24 w-full max-w-md" />}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  // Second line of defence after the proxy: the page itself checks the user.
  const user = await requireUser("/dashboard");
  const profile = await getProfile();
  const name = profile?.full_name || user.email;

  return (
    <section className="space-y-3">
      <h1 className="text-3xl font-semibold">Welcome, {name}</h1>
      <div className="flex gap-2">
        <Badge variant="secondary">{profile?.role ?? "learner"}</Badge>
        {profile?.mentor_status === "pending" && (
          <Badge variant="warning">Mentor application under review</Badge>
        )}
      </div>
    </section>
  );
}
