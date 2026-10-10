/** @file 配置浏览器测试、预览服务器、桌面和手机视口、超时、重试以及失败截图和追踪文件的位置。 */
import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
const artifacts = resolve(process.env.QA_ARTIFACTS_DIR ?? resolve(tmpdir(), "rctools-quality"));
const baseURL = process.env.QA_BASE_URL ?? "http://127.0.0.1:4173";
const previewPort = new URL(baseURL).port || "4173";
export default defineConfig({
  testDir: "./quality/browser",
  outputDir: resolve(artifacts, "results"),
  reporter: [["list"]],
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    browserName: "chromium",
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: `npm run preview -- --port ${previewPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
