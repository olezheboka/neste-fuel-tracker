import { defineConfig, devices } from '@playwright/test';

// E2E runs against the BUILT client served by `vite preview`, with every /api/**
// request mocked from fixtures (see e2e/fixtures/mock-api.js) so the suite is
// deterministic and needs no DB/network. Keep this suite small (see the plan):
// these are the most expensive tests to maintain.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/e2e-junit.xml' }]]
    : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    // Assumes the client is already built (CI builds it first; locally run
    // `npm run build:client`). Serves dist/ on a fixed port.
    command: 'npm --prefix client run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
