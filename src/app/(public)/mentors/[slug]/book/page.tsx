import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMentorBySlug } from "@/lib/mentors/queries";
import { getBookingData } from "@/lib/scheduling/queries";

export const metadata: Metadata = { title: "Book a session", robots: { index: false } };

export default function BookPage({ params }: PageProps<"/mentors/[slug]/book">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Booking params={params} />
      </Suspense>
    </main>
  );
}

async function Booking({ params }: { params: PageProps<"/mentors/[slug]/book">["params"] }) {
  const { slug } = await params;
  const mentor = await getMentorBySlug(slug); // cached public profile
  if (!mentor) notFound();
  // Availability and the visitor's session are request-time data.
  const [user, { rules, busy, now }] = await Promise.all([getCurrentUser(), getBookingData(mentor.id)]);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href={`/mentors/${mentor.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {mentor.display_name}
        </Link>
        <h1 className="text-3xl font-semibold">Book a session with {mentor.display_name}</h1>
      </div>
      <SlotPicker
        mentorId={mentor.id}
        mentorName={mentor.display_name}
        mentorTimeZone={mentor.timezone}
        rules={rules}
        busy={busy.map((b) => ({ start: b.start.toISOString(), end: b.end.toISOString() }))}
        now={now.toISOString()}
        signedIn={user !== null}
        signInHref={`/sign-in?next=${encodeURIComponent(`/mentors/${mentor.slug}/book`)}`}
      />
    </div>
  );
}
