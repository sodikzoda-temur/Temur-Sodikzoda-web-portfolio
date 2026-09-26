import { defineConfig, devices } from '@playwright/test';
import { SITE } from './src/config.ts';

// A dedicated port, away from the dev and preview default (4321). The server is
// never reused, so every run builds and tests the current source.
const PORT = 4891;
const HOST = '127.0.0.1';
const baseURL = `http://${HOST}:${PORT}${SITE.base}`;

// Optional path to a locally installed Chromium, for machines where
// `npx playwright install` is not possible. CI installs browsers normally.
const chromiumPath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  // Tests run against a fresh production build, served under the same base
  // path as on GitHub Pages. `--ignore-lock` keeps `astro preview` in the
  // foreground (it can otherwise detach), so the server stops with the run.
  webServer: {
    command: `npm run build && npm run preview -- --host ${HOST} --port ${PORT} --ignore-lock`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
