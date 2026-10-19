// Checks lists items: one row per line or document, pills for who flagged it (our rule checks, the AI reader) and
// whether every value behind it was read confidently. Ids may appear in tests.
import { expect, test } from '@playwright/test';

const ws = () => `e2e-items-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const item = (k: string) => `[data-item="${k}"]`;

test('two checks on one line are one item, with both titles and both entries', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = page.locator(item('line:F540NR.72'));
  await expect(row).toHaveCount(1);
  await expect(row.locator('summary')).toContainText('includes a payment designated for another tax year');
  await expect(row.locator('summary')).toContainText('10,500 on the FTB');
  await expect(row).toContainText('Blocker');
  await expect(row).toContainText('Confident mistake');
  await expect(row.locator('[data-finding]:not([data-ai])')).toHaveCount(2); // the two checks; AI entries vary with the run
});

test('an item our check and the AI both flagged carries both pills', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = page.locator(item('line:SchE.14A'));
  await expect(row).toContainText('Blocker');
  await expect(row.locator('[data-ai-mark], [aria-hidden="true"]').first()).toBeAttached();
  await expect(row).toContainText(/AI/);
  await row.locator('summary').click();
  expect(await row.locator('[data-finding][data-ai]').count()).toBeGreaterThanOrEqual(1);
  await expect(row.locator('[data-finding][data-severity]')).toHaveCount(1);
});

test('All counts items; the filters keep their meaning', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/checks`);
  const all = Number(await page.getByRole('link', { name: /^All/ }).locator('span').textContent());
  await expect(page.locator('[data-item]')).toHaveCount(all);
  await expect(page.getByTestId('pill-key')).toContainText('Confident mistake');
  await page.goto(`/w/${w}/daniel/checks?sev=blocker`);
  const blk = page.locator('[data-item]');
  expect(await blk.count()).toBeGreaterThan(0);
  expect(await page.locator('[data-item]:not([data-severity="blocker"])').count()).toBe(0);
  await page.goto(`/w/${w}/daniel/checks?sev=ai`);
  const rows = page.locator('[data-item]');
  expect(await rows.count()).toBeGreaterThan(0);
  for (const r of await rows.all()) await expect(r.locator('[data-finding][data-ai]')).not.toHaveCount(0);
});

test('ticking an item selects each of its findings; a missing note opens the item; one undo reverses the batch', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = page.locator(item('line:F540NR.72'));
  await row.locator('input[type="checkbox"]').check();
  await expect(page.getByRole('button', { name: 'Sign off selected (2)' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign off selected (2)' }).click();
  await expect(row.locator('details')).toHaveAttribute('open', '');
  const notes = row.locator('[data-signoff-note]');
  await expect(notes.first()).toBeFocused();
  await notes.nth(0).fill('Tied the payment to the FTB record');
  await notes.nth(1).fill('Read the tax-year field on D68');
  await page.getByRole('button', { name: 'Sign off selected (2)' }).click();
  await expect(page.getByText('2 sign-offs saved together')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('2 sign-offs saved together')).toHaveCount(0);
});

test("the item's pill speaks for what is still open on it", async ({ page }) => {
  const w = ws();
  const res = await page.request.post(`/api/w/${w}/events`, { data: { role: 'daniel', type: 'finding_cleared', claimId: 'finding:CHK-PAYMENTS-VS-AGENCY:line:F540NR.72', payload: { reason: 'Agreed to the FTB account after the client call' } } });
  expect(res.ok()).toBeTruthy();
  await page.goto(`/w/${w}/daniel/checks`);
  const pills = page.locator(item('line:F540NR.72')).locator('span').filter({ hasText: /^(Blocker|Cleared)$/ });
  await expect(pills.first()).toHaveText('Blocker');
  await expect(page.locator(item('line:F540NR.72')).locator('[data-finding]').filter({ hasText: 'Cleared' })).toHaveCount(1);
});

test('a deep link to either finding on the item marks the item and opens it', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks?claim=${encodeURIComponent('finding:CHK-PAYMENT-TAX-YEAR:line:F540NR.72')}`);
  const row = page.locator(item('line:F540NR.72'));
  await expect(row).toHaveAttribute('aria-current', 'true');
  await expect(row.locator('details')).toHaveAttribute('open', '');
  await expect(page.locator('[data-item][aria-current="true"]')).toHaveCount(1);
});

test('the "Confident mistake" pill fits inside its status cell on a wide screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = page.locator(item('line:F540NR.72'));
  const pill = row.getByText('Confident mistake', { exact: true });
  const title = row.locator('summary');
  const a = await pill.boundingBox(); const b = await title.boundingBox();
  expect(a!.x + a!.width).toBeLessThanOrEqual(b!.x - 4);
});

test('an engine warning that names an item shows on its row, quoted inside; others do not', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const d31 = page.locator(item('doc:D31'));
  await expect(d31).toContainText('Engine warning');
  await d31.locator('summary').click();
  await expect(d31.locator('[data-engine-note="BROKER_SUMMARY_DETAIL_MISMATCH"]')).toContainText('The engine\'s own note on this item');
  await expect(page.locator(item('line:F540NR.72'))).not.toContainText('Engine warning');
  await expect(page.getByTestId('pill-key')).toContainText('Engine warning');
  await expect(page.locator('section[aria-labelledby="chk-engine"]')).toContainText('BROKER_SUMMARY_DETAIL_MISMATCH'); // the engine list is unchanged
});

test('on the busiest row every stacked pill stays inside the status cell', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = page.locator(item('line:SchC.30'));
  await expect(row).toContainText('Engine warning');
  const title = await row.locator('summary').boundingBox();
  for (const pill of await row.locator('[class*="tags"] [class*="tag"]').all()) {
    const b = await pill.boundingBox();
    if (b) expect(b.x + b.width).toBeLessThanOrEqual(title!.x - 4);
  }
});
