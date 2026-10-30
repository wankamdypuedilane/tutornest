import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { SessionTime } from "@/components/booking/local-time";
import { SessionRoom } from "@/components/booking/session-room";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/current-user";
import { getMySessions } from "@/lib/scheduling/queries";

export const metadata: Metadata = { title: "Session", robots: { index: false } };

export default function SessionPage({ params }: PageProps<"/sessions/[bookingId]">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Session params={params} />
      </Suspense>
    </main>
  );
}

async function Session({ params }: { params: PageProps<"/sessions/[bookingId]">["params"] }) {
  const { bookingId } = await params;
  const user = await requireUser(`/sessions/${bookingId}`);
  if (!z.uuid().safeParse(bookingId).success) notFound();
  const session = (await getMySessions(user.id)).find((s) => s.id === bookingId);
  if (!session) notFound();

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">Session with {session.otherName}</h1>
        <p className="text-muted-foreground">
          <SessionTime start={session.start.toISOString()} end={session.end.toISOString()} />
        </p>
      </div>
      <SessionRoom bookingId={session.id} />
    </>
  );
}
