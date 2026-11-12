import { expect, test } from "@playwright/test";

// Các trang công khai, không cần đăng nhập và không phụ thuộc bài học trong DB
const ROUTES = [
  "/",
  "/vocab",
  "/vocab/decks/goethe-a1",
  "/games",
  "/games/der-die-das",
  "/games/word-match",
  "/leaderboard",
  "/login",
  "/register",
  "/sprechen",
];

for (const route of ROUTES) {
  test(`${route} không cuộn ngang`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, `scrollWidth ${scroll} > viewport ${client}`).toBeLessThanOrEqual(client);
  });

  test(`${route} ảnh baseline`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot({ fullPage: true, mask: [page.locator("iframe"), page.locator("nextjs-portal")] });
  });
}
