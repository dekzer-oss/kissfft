import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,

  use: {
    baseURL: 'http://127.0.0.1:4178',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    // Build the library, then preview the built "dist/" at "/"
    command: 'pnpm run preview:e2e',
    // Point to a guaranteed 200 page so Playwright knows it's ready:
    url: 'http://127.0.0.1:4178/fixtures/umd-basic.html',
    reuseExistingServer: false,
    gracefulShutdown: {
      signal: 'SIGINT',
      timeout: 60_000,
    },
    timeout: 60_000,
  },
});
