import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke tests run against the production build served by
 * `vite preview` under the GitHub-Pages base path, so the same path
 * handling is exercised as on the live site.
 */
const basePath = process.env.BASE_PATH ?? '/50hz-of-grey/';
const port = 4173;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}${basePath}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // route interception must see every request – the service worker is tested manually
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: `http://localhost:${port}${basePath}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    // Phones first – mobile is the primary target. (The iPhone-SE profile runs in Chromium so the suite
    // works without a WebKit download; the viewport/touch emulation is what matters here.)
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, testIgnore: /responsive\.spec\.ts/ },
    { name: 'small-phone', use: { ...devices['iPhone SE'], browserName: 'chromium', defaultBrowserType: 'chromium' }, testIgnore: /responsive\.spec\.ts/ },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
