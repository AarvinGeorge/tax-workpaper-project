import { expect, test } from '@playwright/test';

// Return overview: Home, Return, Areas and Documents are one staff screen with three figure cards, the blocking list
// (rows open Checks) and tabs Forms | Areas | Documents. Every old address still works and lands on its tab.
const ws = () => `e2e-ov-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test('the overview: three figures from the return, Start here, blockers that open Checks, tabs, no leftover buttons', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Return overview');
  const kpis = page.getByTestId('kpis');
  await expect(kpis).toContainText('Adjusted gross income');
  await expect(kpis).toContainText('445,590');
  await expect(kpis).toContainText('Federal tax');
  await expect(kpis).toContainText('81,962');
  await expect(kpis).toContainText('California tax');
  await expect(kpis).toContainText('18,874');
  await expect(kpis).toContainText(/as computed/);
  await expect(page.getByTestId('counts')).toBeVisible(); // Start here kept
  const tabs = main.getByRole('navigation', { name: 'Return overview tabs' });
  await expect(tabs.getByRole('link', { name: 'Forms' })).toHaveAttribute('aria-current', 'page');
  await expect(tabs.getByRole('link', { name: 'Areas' })).toBeVisible();
  await expect(tabs.getByRole('link', { name: 'Documents' })).toBeVisible();
  const blocker = main.locator('section[aria-label="Blocking approval"] a.qrow').first();
  await expect(blocker).toHaveAttribute('href', /\/checks\?claim=/);
  for (const gone of ['Open all checks', 'Open the return', 'Open the documents']) await expect(main.getByRole('link', { name: gone })).toHaveCount(0);
  await blocker.click();
  await expect(page).toHaveURL(/\/checks\?claim=/);
  // After an adjustment the figures say they include it.
  expect((await page.request.post(`/api/w/${w}/events`, { data: { role: 'daniel', type: 'adjustment', claimId: 'line:F540NR.72', payload: { value: 10500, reason: 'payment for 2024' } } })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel`);
  await expect(kpis).toContainText(/plus 1 adjustment/);
  await expect(kpis).toContainText('18,874'); // a payment changes the balance due, not the tax
});

test('Forms tab: every form starts collapsed; the picker shows one form and "All forms" removes it', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/return`);
  await expect(page.locator('a[data-line]')).toHaveCount(0);
  const picker = page.getByLabel('Form to compare');
  const one = (await picker.locator('option').allInnerTexts()).find((o) => /Form 1040$/.test(o) || /^Form 1040\b/.test(o))!;
  await picker.selectOption({ label: one });
  await expect(page).toHaveURL(/form=F1040(&|$)/);
  await expect(page.locator('section.form, details.form')).toHaveCount(1);
  await expect(page.locator('a[data-line]').first()).toBeVisible();
  await page.getByLabel('Form to compare').selectOption({ label: 'All forms' });
  await expect(page).not.toHaveURL(/form=/);
  expect(await page.locator('section.form, details.form').count()).toBeGreaterThan(5);
});

test('Areas and Documents are tabs of the overview; the old addresses land on them; one nav entry for staff', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/priya/areas`);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Return overview');
  await expect(main.getByRole('navigation', { name: 'Return overview tabs' }).getByRole('link', { name: 'Areas' })).toHaveAttribute('aria-current', 'page');
  await expect(main.locator('section[aria-label="Blocking approval"]')).toHaveCount(0); // the list lives on Forms
  await main.getByRole('navigation', { name: 'Return overview tabs' }).getByRole('link', { name: 'Documents' }).click();
  await expect(page).toHaveURL(/\/priya\/documents/);
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Return overview');
  const nav = page.getByRole('navigation', { name: 'Screens' });
  await expect(nav.getByRole('link', { name: /Return overview/ })).toHaveAttribute('aria-current', 'page');
  for (const old of [/^Return(?! overview)/, /^Areas\b/, /^Documents\b/]) await expect(nav.getByRole('link', { name: old })).toHaveCount(0);
  // Clients keep their own screens.
  await page.goto(`/w/${w}/ngozi`);
  await expect(page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: /documents/i })).toBeVisible();
  await expect(page.getByTestId('kpis')).toHaveCount(0);
});

test('review fixes: the picker keeps the open line, the compare buttons keep the form, a comparison opens the forms that differ', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/return?cmp=v2&claim=line:F540NR.72`);
  await expect(page.locator('main table').first()).toContainText('v2'); // forms with differences open
  const picker = page.getByLabel('Form to compare');
  const opt = (await picker.locator('option').allInnerTexts()).find((o) => /\(F1040\)$/.test(o))!;
  await picker.selectOption({ label: opt });
  await expect(page).toHaveURL(/form=F1040/);
  await expect(page).toHaveURL(/claim=line%3AF540NR\.72/);
  await expect(page.getByTestId('drawer').getByTestId('claim-value')).toBeVisible();
  const nothing = page.getByRole('link', { name: 'Nothing', exact: true });
  await expect(nothing).toHaveAttribute('href', /form=F1040/);
  // The tabs sit right under the figures, so the current tab is on the first screen.
  const tabs = page.getByRole('navigation', { name: 'Return overview tabs' });
  const box = (await tabs.boundingBox())!;
  expect(box.y).toBeLessThan(900);
  await expect(page.getByRole('main')).toHaveAttribute('aria-label', 'Return overview');
});
