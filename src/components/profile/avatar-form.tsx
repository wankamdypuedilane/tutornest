"use client";

import { useActionState, useState } from "react";
import { removeAvatar, uploadAvatar } from "@/app/(app)/settings/avatar-actions";
import { FormMessage } from "@/components/auth/form-message";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/lib/auth/schemas";
import { AVATAR_MAX_BYTES } from "@/lib/profile/avatar";

type AvatarFormProps = { name: string; path: string | null };

export function AvatarForm({ name, path }: AvatarFormProps) {
  const [state, uploadAction, uploading] = useActionState(uploadAvatar, initialFormState);
  const [removeState, removeAction, removing] = useActionState(removeAvatar, initialFormState);
  const [preview, setPreview] = useState<string | null>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const error = tooLarge ? "The image must be 2 MB or smaller." : state.fieldErrors?.avatar?.[0];

  return (
    <div className="space-y-4">
      <FormMessage state={state} />
      <FormMessage state={removeState} />
      <div className="flex items-center gap-4">
        {preview ? (
          // A local preview (blob: URL) before upload.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <UserAvatar name={name} path={path} className="size-16" />
        )}
        <form action={uploadAction} className="flex flex-1 flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="avatar">Profile photo</Label>
            <Input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "avatar-error" : "avatar-hint"}
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Checked again on the server: this only spares a useless upload.
                setTooLarge(Boolean(file && file.size > AVATAR_MAX_BYTES));
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>
          <Button type="submit" disabled={uploading || tooLarge}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </form>
        {path && (
          <form action={removeAction}>
            <Button type="submit" variant="ghost" disabled={removing}>
              Remove
            </Button>
          </form>
        )}
      </div>
      {error ? (
        <p id="avatar-error" className="text-sm text-destructive">{error}</p>
      ) : (
        <p id="avatar-hint" className="text-xs text-muted-foreground">PNG, JPEG or WebP, 2 MB maximum.</p>
      )}
    </div>
  );
}
