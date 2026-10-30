import { z } from "zod";

// Checkboxes and switches send "on" when checked and nothing when unchecked.
const toggle = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const notificationSettingsSchema = z.object({
  email_booking_updates: toggle,
  email_reminders: toggle,
  email_product_news: toggle,
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const defaultNotificationSettings: NotificationSettings = {
  email_booking_updates: true,
  email_reminders: true,
  email_product_news: false,
};

// The user must type the confirmation word: a deliberate act, not a slip.
export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", { error: 'Type "DELETE" to confirm.' }),
});
