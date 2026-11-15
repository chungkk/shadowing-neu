import { expect, test } from "@playwright/test";

// Leben in Deutschland: mã trạng thái HTTP (proxy.ts), lối vào các bộ câu, phản hồi khi trả lời nằm trong tầm nhìn.
// Chạy với `next dev` (crawl-guard tắt ở dev — bản production chặn trình duyệt headless).

test.describe("LiD — HTTP", () => {
  test("bộ câu không tồn tại → 404 thật", async ({ request }) => {
    for (const path of ["/leben-in-deutschland/xyz", "/leben-in-deutschland/1/2", "/leben-in-deutschland/thi-thu/abc"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(404);
    }
  });

  test("trang cá nhân khi chưa đăng nhập → 307 sang /login", async ({ request }) => {
    for (const path of ["/leben-in-deutschland/cau-sai", "/leben-in-deutschland/danh-dau", "/leben-in-deutschland/thong-ke", "/leben-in-deutschland/thi-thu/12"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers().location, path).toContain(`/login?next=${encodeURIComponent(path)}`);
    }
  });

  test("các trang công khai → 200, có canonical", async ({ request }) => {
    for (const path of ["/leben-in-deutschland", "/leben-in-deutschland/1", "/leben-in-deutschland/by", "/leben-in-deutschland/thi-thu"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(200);
      expect(await res.text(), path).toContain(`rel="canonical"`);
    }
  });
});

test.describe("LiD — giao diện", () => {
  test("trang chủ có lối vào bộ 30 câu và câu của bang", async ({ page }) => {
    await page.goto("/leben-in-deutschland");
    await expect(page.getByRole("link", { name: /Câu 1–30/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /10 câu riêng của/ })).toBeVisible();
  });

  test("trả lời xong thấy ngay phản hồi đúng/sai (không bị thanh dưới che)", async ({ page }) => {
    await page.goto("/leben-in-deutschland/1");
    await page.getByRole("radio").first().click();
    const status = page.getByRole("status").filter({ hasText: /Đúng rồi|Chưa đúng/ });
    await expect(status).toBeInViewport();
  });

  test("khách mở thi thử: mời đăng nhập, không phát đề", async ({ page }) => {
    await page.goto("/leben-in-deutschland/thi-thu/lam-bai");
    await expect(page.getByRole("heading", { name: "Thi thử cần tài khoản" })).toBeVisible();
    await expect(page.getByRole("timer")).toHaveCount(0);
  });
});
