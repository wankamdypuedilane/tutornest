import { expect, test } from "@playwright/test";

// The booking preview shows a mentor in Paris (Tuesdays 18:00-20:00, Paris time)
// with fixed sample dates. Playwright sets the browser's time zone per test group.

test.describe("a learner in London", () => {
  test.use({ timezoneId: "Europe/London" });

  test("sees the Paris 18:00 slot at 17:00 London time", async ({ page }) => {
    await page.goto("/design/booking");
    await expect(page.getByText("Times are shown in your time zone (Europe/London).")).toBeVisible();
    const tuesday = page.getByRole("group", { name: "Tuesday 17 November" });
    await expect(tuesday.getByText("17:00–18:00")).toBeVisible();
    // 17:30 and 18:00 UTC overlap a booked session: not offered.
    await expect(tuesday.getByText("18:00–19:00")).toHaveCount(0);
  });

  test("can choose and book a slot with the keyboard", async ({ page }) => {
    await page.goto("/design/booking");
    const tuesday = page.getByRole("group", { name: "Tuesday 24 November" });
    await tuesday.getByRole("radio", { name: "17:00–18:00" }).focus();
    await page.keyboard.press("ArrowRight"); // radio groups move with the arrow keys
    await expect(tuesday.getByRole("radio", { name: "17:30–18:30" })).toBeChecked();
    await page.getByRole("button", { name: "Book this session" }).click();
    await expect(page.getByRole("status")).toContainText("Booked.");
  });
});

test.describe("a learner in New York", () => {
  test.use({ timezoneId: "America/New_York" });

  test("sees the same slot at noon", async ({ page }) => {
    await page.goto("/design/booking");
    await expect(page.getByRole("group", { name: "Tuesday 17 November" }).getByText("12:00–13:00")).toBeVisible();
  });
});

test.describe("private pages and the token route", () => {
  test("sessions require an account", async ({ page }) => {
    await page.goto("/sessions");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fsessions/);
  });

  test("no video token without a session", async ({ request }) => {
    const response = await request.post("/api/sessions/00000000-0000-4000-8000-000000000001/token");
    expect(response.status()).toBe(401);
  });
});

test.describe("notifications and the scheduled job", () => {
  test("notifications require an account", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fnotifications/);
  });

  test("the job refuses to run without its configuration", async ({ request }) => {
    const response = await request.get("/api/cron/notifications", { headers: { authorization: "Bearer guess" } });
    expect(response.status()).toBe(503);
  });
});
