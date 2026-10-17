import { defineConfig, devices, chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

// E2E runs against the built app (next build + next start) unless E2E_BASE_URL points at a running server.
// When Playwright's own Chromium is not downloaded, the locally installed Google Chrome is used instead.
const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const bundled = (() => { try { return existsSync(chromium.executablePath()); } catch { return false; } })();

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, ...(bundled ? {} : { channel: 'chrome' }) } }],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `${baseURL}/w/e2e-boot/daniel`,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
