import { expect, test } from "@playwright/test";

// Chapter 17: the home page became a landing page with a descriptive title.
test("home page shows the value proposition", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("TutorNest — One-to-one mentoring for career changers in tech");
  await expect(page.getByRole("heading", { level: 1, name: /learn faster/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find a mentor" }).first()).toBeVisible();
});

test("search engines and social networks get complete metadata", async ({ page }) => {
  await page.goto("/");
  const meta = (selector: string) => page.locator(selector).getAttribute("content");
  expect(await meta('meta[name="description"]')).toContain("one-to-one video sessions");
  expect(await meta('meta[property="og:title"]')).toContain("TutorNest");
  expect(await meta('meta[property="og:image"]')).toMatch(/^http:\/\/localhost:3000\/opengraph-image/);
  expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://localhost:3000");
});

test("the Open Graph image is a 1200×630 PNG", async ({ request }) => {
  const response = await request.get("/opengraph-image");
  expect(response.headers()["content-type"]).toBe("image/png");
  const png = await response.body();
  // Width and height are stored at bytes 16-23 of the PNG header (IHDR chunk).
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
});

test("robots.txt and sitemap.xml are served", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /dashboard");
  expect(robots).toContain("Sitemap: http://localhost:3000/sitemap.xml");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>http://localhost:3000/mentors</loc>");
});

test("the header link leads to the how-it-works section", async ({ page }) => {
  await page.goto("/mentors");
  await page.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/\/#how-it-works$/);
  await expect(page.getByRole("heading", { name: "How it works" })).toBeInViewport();
});

test("questions open and close with the keyboard", async ({ page }) => {
  await page.goto("/");
  const summary = page.getByText("What if I cannot attend?");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/up to 24 hours before the start/)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/up to 24 hours before the start/)).toBeHidden();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("nothing overflows horizontally", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});

test("the largest content appears quickly (LCP under 2.5 s on this machine)", async ({ page }) => {
  await page.goto("/");
  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries[entries.length - 1]!.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }),
  );
  expect(lcp).toBeLessThan(2500);
});
