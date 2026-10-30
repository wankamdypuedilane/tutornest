"use client";

import { useActionState, useState } from "react";
import { saveMentorProfile } from "@/app/(app)/mentor/profile/actions";
import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/auth/schemas";
import { type MentorProfileInput, slugify, TIMEZONES } from "@/lib/profile/schemas";

type MentorProfileFormProps = { initial: MentorProfileInput };

export function MentorProfileForm({ initial }: MentorProfileFormProps) {
  const [state, formAction, pending] = useActionState(saveMentorProfile, initialFormState);
  const [bio, setBio] = useState(initial.bio);
  const [slug, setSlug] = useState(initial.slug);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <FormField
        name="display_name"
        label="Display name"
        defaultValue={initial.display_name}
        errors={errors.display_name}
        required
        onBlur={(event) => {
          // Suggest an address the first time only; never overwrite a chosen one.
          if (!slug) setSlug(slugify(event.target.value));
        }}
      />
      <FormField
        name="slug"
        label="Profile address"
        hint={`tutornest.example/mentors/${slug || "your-name"}`}
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
        errors={errors.slug}
        required
      />
      <FormField
        name="headline"
        label="Headline"
        defaultValue={initial.headline}
        maxLength={120}
        errors={errors.headline}
        hint="One line shown in the directory, for example “Senior React developer”."
      />
      <div className="space-y-2">
        <Label htmlFor="bio">About you</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={8}
          maxLength={2000}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          aria-describedby="bio-count"
          aria-invalid={errors.bio ? true : undefined}
        />
        <p id="bio-count" className="text-xs text-muted-foreground">
          {bio.length} / 2,000 characters{errors.bio ? ` — ${errors.bio[0]}` : ""}
        </p>
      </div>
      <FormField
        name="skills"
        label="Skills"
        defaultValue={initial.skills.join(", ")}
        errors={errors.skills}
        hint="Separate with commas. Up to 10."
      />
      <FormField
        name="languages"
        label="Languages"
        defaultValue={initial.languages.join(", ")}
        errors={errors.languages}
        hint="Separate with commas. Up to 6."
      />
      <div className="space-y-2">
        <Label htmlFor="timezone">Time zone</Label>
        {/* A native select: accessible, works before JavaScript loads, sends its value. */}
        <select
          id="timezone"
          name="timezone"
          defaultValue={initial.timezone}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>{zone.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <Label htmlFor="is_published">Published</Label>
          <p id="is_published-description" className="text-sm text-muted-foreground">
            Visible in the public directory.
          </p>
        </div>
        <Switch
          id="is_published"
          name="is_published"
          defaultChecked={initial.is_published}
          aria-describedby="is_published-description"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
