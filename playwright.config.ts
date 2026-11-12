import { defineConfig, devices } from "@playwright/test";

// Kiểm tra giao diện: không route nào cuộn ngang + ảnh baseline 390px / 1440px.
// Chạy: npm run test:ui (tự bật `next dev` nếu chưa có server ở :3000).
// Cập nhật ảnh baseline sau khi đổi giao diện có chủ đích: npm run test:ui -- --update-snapshots
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" } },
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
