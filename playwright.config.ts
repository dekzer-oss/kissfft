import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = resolve(__dirname, 'tests/e2e');
const PORT = 4178;

export default defineConfig({
  testDir: TEST_DIR,
  testMatch: ['**/*.spec.ts'], // or narrow: ['**/*.pw.spec.ts'] if you rename
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 45_000,
  reporter: [['list']],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },

  webServer: {
    command: `node ${resolve(TEST_DIR, 'serve.mjs')}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
