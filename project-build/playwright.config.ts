import { defineConfig, devices, chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeAiFixture } from './tests/fixtures/ai-payload';

// E2E runs against the built app (next build + next start) unless E2E_BASE_URL points at a running server.
// When Playwright's own Chromium is not downloaded, the locally installed Google Chrome is used instead.
const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// The app under test reads the AI fixture (tests/fixtures/ai-payload.ts) instead of ai/eval/ai-suggestions.json, so the AI
// spec is deterministic and every other spec also runs with AI suggestions present. Unset when E2E_BASE_URL is given.
const AI_PAYLOAD = process.env.E2E_BASE_URL ? undefined : writeAiFixture(path.join(tmpdir(), 'taxmark-ai-payload.e2e.json'));
const bundled = (() => { try { return existsSync(chromium.executablePath()); } catch { return false; } })();

export default defineConfig({
  testDir: 'tests/e2e',
  // The acceptance walk follows the dry-run checklist against a deployed app; run it only with E2E_BASE_URL set.
  testIgnore: process.env.E2E_BASE_URL ? [] : ['**/acceptance-walk.spec.ts'],
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
    env: { AI_PAYLOAD_PATH: AI_PAYLOAD ?? '' },
    timeout: 300_000,
  },
});
