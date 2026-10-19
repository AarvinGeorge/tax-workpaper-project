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
  await expect(row).toContainText('Confident read');
  await expect(row.locator('[data-finding]')).toHaveCount(2);
});

test('an item our check and the AI both flagged carries both pills', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = page.locator(item('line:SchE.14A'));
  await expect(row).toContainText('Blocker');
  await expect(row.locator('[data-ai-mark], [aria-hidden="true"]').first()).toBeAttached();
  await expect(row).toContainText(/AI/);
  await row.locator('summary').click();
  await expect(row.locator('[data-finding][data-ai]')).toHaveCount(1);
  await expect(row.locator('[data-finding][data-severity]')).toHaveCount(1);
});

test('All counts items; the filters keep their meaning', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/checks`);
  const all = Number(await page.getByRole('link', { name: /^All/ }).locator('span').textContent());
  await expect(page.locator('[data-item]')).toHaveCount(all);
  await expect(page.getByTestId('pill-key')).toContainText('Confident read');
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
