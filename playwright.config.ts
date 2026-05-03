import { defineConfig, devices } from "@playwright/test";

const smokePort = 3100;
const smokeHost = "127.0.0.1";
const smokeBaseUrl = `http://${smokeHost}:${smokePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: smokeBaseUrl,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname ${smokeHost} --port ${smokePort}`,
    url: smokeBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
