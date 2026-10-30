import { z } from "zod";

const id = z.uuid("Invalid identifier.");
const halfHour = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|30)$/, "Use a time on the hour or the half hour, such as 18:00 or 18:30.");

export const bookSessionSchema = z.object({
  mentorId: id,
  startsAt: z.iso.datetime({ offset: true, message: "Invalid start time." }),
  minutes: z.union([z.literal(30), z.literal(60)]),
});
export type BookSessionInput = z.infer<typeof bookSessionSchema>;

export const availabilityRuleSchema = z
  .object({
    weekday: z.coerce.number().int().min(1).max(7),
    start: halfHour,
    end: halfHour,
  })
  .refine((rule) => rule.end > rule.start, { message: "The end must be after the start.", path: ["end"] });
