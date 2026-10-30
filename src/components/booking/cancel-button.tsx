"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cancelBooking } from "@/app/(app)/sessions/actions";
import { Button } from "@/components/ui/button";

export function CancelButton({ bookingId, label }: { bookingId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={`Cancel the session with ${label}`}
      onClick={() =>
        startTransition(async () => {
          const result = await cancelBooking(bookingId);
          if (result.ok) toast.success("Session cancelled.");
          else toast.error(result.message ?? "The session could not be cancelled.");
        })
      }
    >
      {pending ? "Cancelling…" : "Cancel"}
    </Button>
  );
}
