import { expect, test } from "@playwright/test";

test("the mentor directory keeps its filters in a shareable URL", async ({ page }) => {
  await page.goto("/mentors");
  await expect(page.getByRole("heading", { level: 1, name: "Find a mentor" })).toBeVisible();
  await page.getByLabel("Skill").fill("react");
  await page.getByLabel("Language").selectOption("French");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/skill=react&language=French/);
  await expect(page.getByLabel("Skill")).toHaveValue("react");
  await expect(page.getByRole("status")).toHaveText("0 mentors");
});

test("an unknown mentor shows the not-found page and is kept out of search engines", async ({ page }) => {
  // notFound() runs inside a streamed Suspense boundary, after the 200 status was sent,
  // so Next.js marks the page "noindex" instead of changing the status code.
  await page.goto("/mentors/nobody-here");
  await expect(page.getByRole("heading", { name: "We could not find this page" })).toBeVisible();
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("unknown routes return a real 404", async ({ page }) => {
  const response = await page.goto("/no/such/route");
  expect(response?.status()).toBe(404);
});

test("settings are private", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fsettings/);
});
