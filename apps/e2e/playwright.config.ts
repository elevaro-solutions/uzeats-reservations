import { defineConfig, devices } from '@playwright/test';

const webBase = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
const dashboardBase = process.env.E2E_DASHBOARD_URL ?? 'http://localhost:3001';

/**
 * Browser E2E against running web/dashboard (local or staging).
 * Set E2E_WEB_URL / E2E_DASHBOARD_URL / credential envs for non-local runs.
 * CI skips this package unless E2E_ENABLED=1.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'diner-web',
      testMatch: /diner-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: webBase,
      },
    },
    {
      name: 'partner-hub',
      testMatch: /partner-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: dashboardBase,
      },
    },
    {
      name: 'admin',
      testMatch: /admin-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: dashboardBase,
      },
    },
  ],
});
