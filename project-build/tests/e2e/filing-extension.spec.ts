import { expect, test } from '@playwright/test';

// The extension estimate on Filing was computed in April from an earlier version, so its tax differs from the filed
// return. It must say so, and show the filed figures beside it from the same source as the Return overview cards.
test('Filing: the extension estimate names its version and sits beside the filed return figures', async ({ page }) => {
  const w = `e2e-ext-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  await page.goto(`/w/${w}/daniel`);
  expect((await page.request.post(`/api/w/${w}/events?role=jo`, { data: { type: 'clock_moved', payload: { to: '2026-07-16T00:00:00Z' } } })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel`);
  const kpis = page.getByTestId('kpis');
  const fed = (await kpis.locator('.kpi', { hasText: 'Federal tax' }).locator('.kpi-v').innerText()).trim();
  const ca = (await kpis.locator('.kpi', { hasText: 'California tax' }).locator('.kpi-v').innerText()).trim();
  await page.goto(`/w/${w}/daniel/filing`);
  const ext = page.locator('section[aria-labelledby="fil-ext"]');
  await expect(ext).toContainText(/Federal, estimate from v2/);
  await expect(ext).toContainText(/California, estimate from v2/);
  const filed = ext.getByTestId('ext-filed');
  await expect(filed).toContainText(/The filed return \(v3/);
  await expect(filed).toContainText(`Federal tax ${fed}`);
  await expect(filed).toContainText(`California tax ${ca}`);
});

test('Filing: with an applied adjustment the comparison row says not recomputed, as the overview cards do', async ({ page }) => {
  const w = `e2e-ext2-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  await page.goto(`/w/${w}/daniel`);
  expect((await page.request.post(`/api/w/${w}/events`, { data: { role: 'daniel', type: 'adjustment', claimId: 'line:F540NR.72', payload: { value: 10500, reason: 'payment for 2024' } } })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel/filing`);
  await expect(page.getByTestId('ext-filed')).toContainText(/v3 plus 1 adjustment, not recomputed/);
});
