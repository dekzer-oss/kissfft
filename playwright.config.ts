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
    // Preview only (build is run by the test:e2e script before Playwright starts)
    command: 'pnpm run preview:e2e',
    // Point to a guaranteed 200 so Playwright knows the server is ready
    url: 'http://127.0.0.1:4178/fixtures/umd-basic.html',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
