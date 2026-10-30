"use client";

import { useActionState, useTransition } from "react";
import { addAvailability, removeAvailability } from "@/app/(app)/mentor/availability/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/lib/auth/schemas";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

type Rule = { id: string; weekday: number; start: string; end: string };

export function AvailabilityEditor({ rules, timeZone }: { rules: Rule[]; timeZone: string }) {
  const [state, action, pending] = useActionState(addAvailability, initialFormState);
  const [removing, startRemove] = useTransition();
  const select = "h-9 rounded-md border border-input bg-transparent px-3 text-sm";

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        Times are in your time zone, <strong>{timeZone}</strong> (change it in your mentor profile). Learners see them in theirs.
      </p>
      {rules.length === 0 ? (
        <p>No availability yet: learners cannot book you.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between p-3">
              <span>
                {WEEKDAYS[rule.weekday - 1]}, {rule.start}–{rule.end}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={removing}
                aria-label={`Remove ${WEEKDAYS[rule.weekday - 1]} ${rule.start}–${rule.end}`}
                onClick={() => startRemove(async () => void (await removeAvailability(rule.id)))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="space-y-3" noValidate>
        <FormMessage state={state} />
        <div className="flex flex-wrap items-end gap-3">
          {(
            [
              ["weekday", "Day", WEEKDAYS.map((day, i) => [String(i + 1), day])],
              ["start", "From", TIMES.map((t) => [t, t])],
              ["end", "To", TIMES.map((t) => [t, t])],
            ] as const
          ).map(([name, label, options]) => (
            <div key={name} className="space-y-2">
              <Label htmlFor={name}>{label}</Label>
              <select
                id={name}
                name={name}
                className={select}
                defaultValue={name === "start" ? "18:00" : name === "end" ? "20:00" : "1"}
                aria-describedby={state.fieldErrors?.[name] ? `${name}-error` : undefined}
              >
                {options.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.[name] && (
                <p id={`${name}-error`} className="text-sm text-destructive">
                  {state.fieldErrors[name]![0]}
                </p>
              )}
            </div>
          ))}
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>
    </div>
  );
}
