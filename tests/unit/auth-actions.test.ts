import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake Supabase client: each test decides what the auth calls return.
const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithOAuth: vi.fn(),
};
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));

// next/navigation's redirect() throws to stop rendering; we record the target instead.
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url), notFound: vi.fn() }));

// Requests come from a fixed address; the rate limiter answers what each test decides.
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }));
const rateLimit = vi.fn<(limit: { key: string }) => Promise<boolean>>(async () => true);
vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: (limit: { key: string }) => rateLimit(limit),
  hashKey: (value: string) => `hash(${value})`,
}));

const { signIn, signUp, requestPasswordReset, signInWithGoogle } = await import(
  "@/app/(auth)/actions"
);

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("signIn", () => {
  it("returns field errors without calling Supabase when input is invalid", async () => {
    const state = await signIn({ status: "idle" }, form({ email: "not-an-email", password: "" }));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBeDefined();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("gives the same message for unknown e-mail and wrong password", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const state = await signIn({ status: "idle" }, form({ email: "a@example.com", password: "x" }));
    expect(state.message).toBe("Invalid e-mail or password.");
  });

  it("refuses without calling Supabase after too many attempts, per address and per account", async () => {
    rateLimit.mockImplementation(async ({ key }) => !key.startsWith("sign-in:account:"));
    const state = await signIn({ status: "idle" }, form({ email: "a@example.com", password: "x" }));
    expect(state.message).toBe("Too many attempts. Please wait a few minutes and try again.");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(rateLimit.mock.calls.map(([limit]) => limit.key)).toEqual([
      "sign-in:ip:203.0.113.7",
      "sign-in:account:hash(a@example.com)",
    ]);
    rateLimit.mockImplementation(async () => true);
  });

  it("redirects to a safe next path after success", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      signIn({ status: "idle" }, form({ email: "a@example.com", password: "x", next: "//evil.example" })),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });
});

describe("signUp", () => {
  it("sends the name and intent as user metadata", async () => {
    auth.signUp.mockResolvedValue({ error: null });
    await expect(
      signUp(
        { status: "idle" },
        form({
          fullName: "Marc Leroy",
          email: "marc@example.com",
          password: "a long and memorable phrase",
          intent: "mentor",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/check-email?email=marc%40example.com");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "marc@example.com",
      password: "a long and memorable phrase",
      options: { data: { full_name: "Marc Leroy", intent: "mentor" } },
    });
  });
});

describe("requestPasswordReset", () => {
  it("answers the same way whether or not the account exists", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const state = await requestPasswordReset({ status: "idle" }, form({ email: "nobody@example.com" }));
    expect(state).toEqual({
      status: "success",
      message: "If an account exists for this address, we have sent a reset link.",
    });
  });
});

describe("signInWithGoogle", () => {
  it("asks Supabase for a Google URL with a safe callback, then redirects to it", async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=demo" },
      error: null,
    });
    await expect(signInWithGoogle(form({ next: "https://evil.example" }))).rejects.toThrow(
      "REDIRECT:https://accounts.google.com/o/oauth2/v2/auth?client_id=demo",
    );
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback?next=%2Fdashboard" },
    });
  });
});
