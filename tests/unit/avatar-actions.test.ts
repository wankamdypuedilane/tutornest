import { beforeEach, describe, expect, it, vi } from "vitest";

// A fake Supabase client that records storage and table calls.
const upload = vi.fn();
const remove = vi.fn();
const update = vi.fn();
const single = vi.fn();
const fakeClient = {
  storage: { from: () => ({ upload, remove }) },
  from: () => ({
    select: () => ({ eq: () => ({ single }) }),
    update: (values: unknown) => ({ eq: () => update(values) }),
  }),
};
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("@/lib/auth/current-user", () => ({ requireUser: async () => ({ id: "user-1", email: "a@example.com" }) }));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

const { uploadAvatar } = await import("@/app/(app)/settings/avatar-actions");

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function form(file: File | null) {
  const data = new FormData();
  if (file) data.set("avatar", file);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ error: null });
  update.mockResolvedValue({ error: null });
  single.mockResolvedValue({ data: { avatar_path: "user-1/avatar-old.png" } });
});

describe("uploadAvatar", () => {
  it("refuses a file whose content is not an image, even if named .png", async () => {
    const fake = new File(["<svg onload='alert(1)'>"], "photo.png", { type: "image/png" });
    const state = await uploadAvatar({ status: "idle" }, form(fake));
    expect(state.fieldErrors?.avatar).toEqual(["Use a PNG, JPEG or WebP image."]);
    expect(upload).not.toHaveBeenCalled();
  });

  it("refuses files over 2 MB before reading them", async () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png");
    const state = await uploadAvatar({ status: "idle" }, form(big));
    expect(state.fieldErrors?.avatar?.[0]).toMatch(/2 MB/);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads into the user's folder with the detected type, then deletes the old file", async () => {
    // Declared as JPEG by the browser, but the bytes say PNG: the bytes win.
    const file = new File([new Uint8Array([...PNG, 0, 0, 0, 0])], "me.jpg", { type: "image/jpeg" });
    const state = await uploadAvatar({ status: "idle" }, form(file));
    expect(state).toEqual({ status: "success", message: "Photo updated." });
    const [path, , options] = upload.mock.calls[0]!;
    expect(path).toMatch(/^user-1\/avatar-\d+\.png$/);
    expect(options).toMatchObject({ contentType: "image/png", upsert: false });
    expect(update).toHaveBeenCalledWith({ avatar_path: path });
    expect(remove).toHaveBeenCalledWith(["user-1/avatar-old.png"]);
  });

  it("removes the new file if the profile cannot be updated", async () => {
    update.mockResolvedValueOnce({ error: { message: "boom" } });
    const file = new File([new Uint8Array([...PNG, 0, 0])], "me.png");
    const state = await uploadAvatar({ status: "idle" }, form(file));
    expect(state.status).toBe("error");
    const [path] = upload.mock.calls[0]!;
    expect(remove).toHaveBeenCalledWith([path]);
  });
});
