"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/app/(app)/settings/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { initialFormState } from "@/lib/auth/schemas";

// Radix Dialog traps focus, closes on Escape and restores focus on close.
export function DeleteAccountDialog() {
  const [state, formAction, pending] = useActionState(deleteAccount, initialFormState);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete my account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Your profile, bookings history and settings will be permanently deleted. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <FormMessage state={state} />
          <FormField
            name="confirmation"
            label='Type "DELETE" to confirm'
            autoComplete="off"
            errors={state.fieldErrors?.confirmation}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
