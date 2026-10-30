import { expect, test } from "@playwright/test";

test("home page shows the value proposition", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("TutorNest");
  await expect(
    page.getByRole("heading", { level: 1, name: /learn faster/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Find a mentor" })).toBeVisible();
});
