import { defineConfig, devices } from "@playwright/test";

const serverPort = process.env.EDA_E2E_PORT ?? "4173";
const baseURL = process.env.EDA_E2E_BASE_URL ?? `http://127.0.0.1:${serverPort}`;

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.EDA_E2E_BASE_URL ? undefined : {
    command: "npm run build && npx tsx test/e2e/serve-e2e.ts",
    url: `${baseURL}/api/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NODE_ENV: "test",
      EDA_PORT: serverPort,
      EDA_HOST: "127.0.0.1",
      EDA_E2E_ADMIN_PASSWORD: "E2e-admin-only-correct-horse-battery-staple",
      EDA_E2E_USER_PASSWORD: "E2e-user-only-correct-horse-battery-staple",
      VITE_BASE_PATH: "/",
      VITE_READ_ONLY_DEMO: "false",
    },
  },
});
