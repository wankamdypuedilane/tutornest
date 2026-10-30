import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CancelButton } from "@/components/booking/cancel-button";
import { SessionTime } from "@/components/booking/local-time";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/current-user";
import { getUpcomingSessions } from "@/lib/scheduling/queries";

export const metadata: Metadata = { title: "Your sessions", robots: { index: false } };

export default function SessionsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Your sessions</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <SessionList />
      </Suspense>
    </main>
  );
}

async function SessionList() {
  const user = await requireUser("/sessions");
  const upcoming = await getUpcomingSessions(user.id);
  if (upcoming.length === 0) {
    return (
      <p className="text-muted-foreground">
        No upcoming session. <Link href="/mentors" className="text-primary underline underline-offset-4">Find a mentor</Link>.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-lg border">
      {upcoming.map((session) => {
        return (
          <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="space-y-1">
              <p className="font-medium">
                <SessionTime start={session.start.toISOString()} end={session.end.toISOString()} />
              </p>
              <p className="text-sm text-muted-foreground">
                {session.role === "learner" ? "With your mentor" : "With your learner"} {session.otherName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{session.role}</Badge>
              <Link href={`/sessions/${session.id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                Open
              </Link>
              {/* Offered up to 24 hours before; the update policy enforces it. */}
              {session.cancellable && <CancelButton bookingId={session.id} label={session.otherName} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
