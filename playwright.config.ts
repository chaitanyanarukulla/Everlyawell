import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration
 *
 * Design decisions:
 * - Tests use page.setContent() to load the checkout HTML directly —
 *   no web server required. All API calls are intercepted via page.route().
 * - Single Chromium worker, serial execution — avoids shared mock state races.
 * - retries=1 in CI for infrastructure tolerance, not test logic flakiness.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
});
