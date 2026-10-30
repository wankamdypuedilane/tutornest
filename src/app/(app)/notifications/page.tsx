import type { Metadata } from "next";
import { refresh } from "next/cache";
import { Suspense } from "react";
import { SessionTime } from "@/components/booking/local-time";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

const TITLES = {
  booking_confirmed: "Session booked",
  booking_cancelled: "Session cancelled",
  session_reminder: "Session tomorrow",
} as const;

async function markAllRead() {
  "use server";
  const user = await requireUser("/notifications");
  const supabase = await createClient();
  // RLS limits the update to the user's rows; column privileges to read_at.
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  refresh();
}

export default function NotificationsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Notifications</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <NotificationList />
      </Suspense>
    </main>
  );
}

async function NotificationList() {
  const user = await requireUser("/notifications");
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, read_at, booking:bookings (starts_at, ends_at, learner_id, learner_name, mentor:mentor_profiles (display_name))")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = data ?? [];
  if (items.length === 0) return <p className="text-muted-foreground">Nothing yet.</p>;

  return (
    <>
      <form action={markAllRead}>
        <Button type="submit" variant="outline" size="sm">
          Mark all as read
        </Button>
      </form>
      <ul className="divide-y rounded-lg border">
        {items.map((item) => {
          const booking = item.booking as unknown as {
            starts_at: string;
            ends_at: string;
            learner_id: string;
            learner_name: string;
            mentor: { display_name: string };
          };
          const other = booking.learner_id === user.id ? booking.mentor.display_name : booking.learner_name;
          return (
            <li key={item.id} className="flex items-start justify-between gap-4 p-4">
              <div className="space-y-1">
                <p className={item.read_at ? "" : "font-semibold"}>
                  {TITLES[item.kind as keyof typeof TITLES]} with {other}
                  {!item.read_at && <span className="sr-only"> (unread)</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  <SessionTime start={booking.starts_at} end={booking.ends_at} />
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
