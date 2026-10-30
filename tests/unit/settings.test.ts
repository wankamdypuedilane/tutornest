import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccountSchema, notificationSettingsSchema } from "@/lib/settings/schemas";

describe("notificationSettingsSchema", () => {
  it("turns checked switches into true and missing ones into false", () => {
    expect(notificationSettingsSchema.parse({ email_reminders: "on" })).toEqual({
      email_booking_updates: false,
      email_reminders: true,
      email_product_news: false,
    });
  });
});

describe("deleteAccountSchema", () => {
  it("accepts only the exact confirmation word", () => {
    expect(deleteAccountSchema.safeParse({ confirmation: "DELETE" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ confirmation: "delete" }).success).toBe(false);
  });
});

// --- deleteAccount action ---------------------------------------------------
const deleteUser = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/auth/current-user", () => ({
  requireUser: async () => ({ id: "user-1", email: "ines@example.com" }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { admin: { deleteUser } } }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signOut } }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const { deleteAccount } = await import("@/app/(app)/settings/actions");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("deleteAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing without the confirmation word", async () => {
    const state = await deleteAccount({ status: "idle" }, form({ confirmation: "yes" }));
    expect(state.fieldErrors?.confirmation?.[0]).toBe('Type "DELETE" to confirm.');
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes the current user only, signs out and redirects", async () => {
    deleteUser.mockResolvedValue({ error: null });
    await expect(deleteAccount({ status: "idle" }, form({ confirmation: "DELETE" }))).rejects.toThrow(
      "REDIRECT:/?account=deleted",
    );
    expect(deleteUser).toHaveBeenCalledWith("user-1");
    expect(signOut).toHaveBeenCalled();
  });
});
