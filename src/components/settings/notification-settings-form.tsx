"use client";

import { useActionState } from "react";
import { saveNotificationSettings } from "@/app/(app)/settings/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { initialFormState } from "@/lib/auth/schemas";
import type { NotificationSettings } from "@/lib/settings/schemas";

const options: { name: keyof NotificationSettings; label: string; description: string }[] = [
  { name: "email_booking_updates", label: "Booking updates", description: "Confirmations, changes and cancellations." },
  { name: "email_reminders", label: "Session reminders", description: "A reminder 24 hours before each session." },
  { name: "email_product_news", label: "Product news", description: "Occasional news about TutorNest. No more than once a month." },
];

export function NotificationSettingsForm({ initial }: { initial: NotificationSettings }) {
  const [state, formAction, pending] = useActionState(saveNotificationSettings, initialFormState);

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      <ul className="divide-y rounded-lg border">
        {options.map((option) => (
          <li key={option.name} className="flex items-center justify-between gap-4 p-4">
            <div>
              <Label htmlFor={option.name}>{option.label}</Label>
              <p id={`${option.name}-description`} className="text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
            <Switch
              id={option.name}
              name={option.name}
              defaultChecked={initial[option.name]}
              aria-describedby={`${option.name}-description`}
            />
          </li>
        ))}
      </ul>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
