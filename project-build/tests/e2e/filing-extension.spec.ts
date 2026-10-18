import { expect, test } from '@playwright/test';

// The extension estimate was computed in April from an earlier version, so its tax differs from the filed return. It
// must say so. Staff Filing is retired (plan B7): the estimate's version is named in the filing status line under the
// overview cards, and the cards beside it carry the return's own figures and their basis (the old "For comparison" row).
test('Overview: the extension estimate names its version and sits beside the filed return figures', async ({ page }) => {
  const w = `e2e-ext-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  await page.goto(`/w/${w}/daniel`);
  expect((await page.request.post(`/api/w/${w}/events?role=jo`, { data: { type: 'clock_moved', payload: { to: '2026-07-16T00:00:00Z' } } })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel`);
  const kpis = page.getByTestId('kpis');
  await expect(kpis.locator('.kpi', { hasText: 'Federal tax' })).toContainText(/v3, as computed/);
  await expect(kpis.locator('.kpi', { hasText: 'California tax' })).toContainText(/v3, as computed/);
  await expect(page.getByTestId('filing-status')).toContainText(/Extension.*Filed .* estimated from v2/);
});

test('Overview: with an applied adjustment the figures beside the extension name it', async ({ page }) => {
  const w = `e2e-ext2-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  await page.goto(`/w/${w}/daniel`);
  expect((await page.request.post(`/api/w/${w}/events`, { data: { role: 'daniel', type: 'adjustment', claimId: 'line:F540NR.72', payload: { value: 10500, reason: 'payment for 2024' } } })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel`);
  // Every figure the payment change reaches is recomputed (plain sums), so nothing is left for the engine.
  await expect(page.getByTestId('kpis')).toContainText(/v3 plus 1 adjustment/);
  await expect(page.getByTestId('kpis')).not.toContainText(/not recomputed|need the engine/);
  await expect(page.getByTestId('filing-status')).toContainText(/Extension.*Filed .* estimated from v2/);
});
