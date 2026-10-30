import type { Metadata } from "next";
import { Suspense } from "react";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/current-user";
import { defaultNotificationSettings, type NotificationSettings } from "@/lib/settings/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-10 px-6 py-12">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <section aria-labelledby="notifications" className="space-y-4">
        <h2 id="notifications" className="text-xl font-semibold">E-mail notifications</h2>
        <Suspense fallback={<Skeleton className="h-60 w-full" />}>
          <Notifications />
        </Suspense>
      </section>
      <Separator />
      <section aria-labelledby="danger" className="space-y-4">
        <h2 id="danger" className="text-xl font-semibold">Delete account</h2>
        <p className="text-sm text-muted-foreground">
          We delete your personal data immediately; backups are purged within 30 days.
        </p>
        <DeleteAccountDialog />
      </section>
    </main>
  );
}

async function Notifications() {
  const user = await requireUser("/settings");
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("email_booking_updates, email_reminders, email_product_news")
    .eq("user_id", user.id)
    .maybeSingle<NotificationSettings>();
  return <NotificationSettingsForm initial={data ?? defaultNotificationSettings} />;
}
