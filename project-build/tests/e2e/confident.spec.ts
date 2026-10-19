// The finding panel names a confident mistake: "Confidence gave no warning" when every value behind it was read at
// 0.95 or above; never when a value was read lower, and never for clients. Ids may appear in tests.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ws = () => `e2e-conf-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const lastAt = () => (JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'packet.json'), 'utf8')) as { timeline: { at: string }[] })
  .timeline.map((t) => t.at).sort().pop()!;
async function moveClock(page: Page, w: string, to: string) {
  expect((await page.request.post(`/api/w/${w}/events`, { data: { role: 'jo', type: 'clock_moved', payload: { to } } })).ok()).toBeTruthy();
}

test('a confident mistake says confidence gave no warning, with the read range', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/checks?claim=${encodeURIComponent('finding:CHK-PAYMENT-TAX-YEAR:line:F540NR.72')}`);
  const note = page.getByTestId('confident-note');
  await expect(note).toContainText('Confidence gave no warning.');
  await expect(note).toContainText('read at 0.98 to 0.99');
  await expect(note).toContainText('This check is what caught it.');
});

test('a finding resting on a low-confidence read shows no note', async ({ page }) => {
  const w = ws();
  await moveClock(page, w, lastAt());
  await page.goto(`/w/${w}/daniel/checks?claim=${encodeURIComponent('finding:CHK-ANSWER-AFTER-COMPUTATION:line:F8949.H.C6')}`);
  await expect(page.getByText('Pipeline read 0.60 to 0.99')).toBeVisible();
  await expect(page.getByTestId('confident-note')).toHaveCount(0);
});

test('clients do not see the note', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/ngozi?claim=${encodeURIComponent('finding:CHK-IDENTITY-VS-DOCUMENTS:line:F8812.4')}`);
  await expect(page.locator('.drw')).toContainText('CHK-IDENTITY-VS-DOCUMENTS');
  await expect(page.getByTestId('confident-note')).toHaveCount(0);
});
