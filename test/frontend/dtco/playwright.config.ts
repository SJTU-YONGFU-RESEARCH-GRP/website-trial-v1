import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: /.*\.browser\.spec\.ts/, workers: 1, timeout: 30000, expect: { timeout: 8000 },
  use: { baseURL: process.env.DTCO_TEST_URL ?? "http://127.0.0.1:3000", headless: true, screenshot: "only-on-failure" },
  outputDir: "../../../test-results/dtco-frontend", reporter: "line",
});
