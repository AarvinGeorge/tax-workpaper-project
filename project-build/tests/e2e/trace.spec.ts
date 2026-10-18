import { expect, test, type Page } from '@playwright/test';

// Trace: any number opens its source page and field; roles see different, enforced views.
const ws = (name: string) => `e2e-${name}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const drawer = (page: Page) => page.getByTestId('drawer');
const SSN_SHAPED = /\b\d{3}-\d{2}-\d{4}\b/;

test('Start here shows the packet counts and the roles', async ({ page }) => {
  await page.goto(`/w/${ws('start')}/daniel`);
  const start = page.getByTestId('start-here');
  await expect(start).toBeVisible();
  await expect(page.getByTestId('counts')).toContainText('74 documents');
  await expect(page.getByTestId('counts')).toContainText('3,012 values');
  await expect(page.getByTestId('counts')).toContainText('3 computed versions');
  await expect(start).toContainText('IRS examiner');
});

test('the root link opens a new workspace as Daniel', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/w\/[a-z0-9]{10}\/daniel$/);
});

test('Daniel opens a v3 line and sees its source document page and field', async ({ page }) => {
  await page.goto(`/w/${ws('trace')}/daniel/return?open=F540NR`); // forms start collapsed; open California's
  await page.locator('a[data-line="F540NR.72"]').click();
  await expect(page).toHaveURL(/claim=line%3AF540NR\.72/);
  const d = drawer(page);
  await expect(d.getByTestId('claim-value')).toHaveText('14,000');
  await expect(d).toContainText('R-CA-ESTIMATED-PAYMENTS');
  const src = d.getByTestId('source-page').first();
  await expect(src).toContainText('D68, page 1');
  await expect(src.locator('mark', { hasText: '3,500.00' }).first()).toBeVisible();
  await expect(src.locator('mark', { hasText: '2024' }).first()).toBeVisible();
  await expect(src).toContainText('Field:');
  // a source in the list opens the document itself
  await d.locator('a.srcitem').first().click();
  await expect(page).toHaveURL(/claim=doc%3AD68/);
  await expect(drawer(page)).toContainText('California FTB Web Pay');
});

test('Marcus sees SSNs masked and cannot reveal, with the firm rule quoted', async ({ page }) => {
  await page.goto(`/w/${ws('marcus')}/marcus/documents?claim=doc%3AD08`);
  const d = drawer(page);
  await expect(d.getByTestId('source-page')).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(SSN_SHAPED);
  await expect(d.getByTestId('source-page')).toContainText('•••-••-');
  const reveal = d.getByTestId('reveal').first();
  await expect(reveal).toHaveAttribute('aria-disabled', 'true');
  await expect(d.getByTestId('reveal-reason')).toContainText(/clearance/i);
  await reveal.click({ force: true });
  expect(await page.locator('body').innerText()).not.toMatch(SSN_SHAPED);
});

test('Priya (cleared) can reveal; the view is logged', async ({ page }) => {
  const id = ws('priya');
  await page.goto(`/w/${id}/priya/documents?claim=doc%3AD08`);
  const d = drawer(page);
  await expect(d.getByTestId('reveal').first()).toHaveAttribute('aria-disabled', 'false');
  await d.getByTestId('reveal').first().click();
  await expect(d).toContainText('Revealed, logged');
});

test('Ngozi sees no review notes and no internal screens', async ({ page }) => {
  const id = ws('ngozi');
  const note = `Internal note ${Date.now()}`;
  await page.goto(`/w/${id}/daniel/return?claim=line%3AF540NR.72`);
  const d = drawer(page);
  await d.getByRole('button', { name: 'Leave a review note' }).click();
  await d.locator('#rn-t').fill(note);
  await d.getByRole('button', { name: 'Save' }).click();
  await expect(d).toContainText(note);
  // switch role through the header switcher
  await page.getByTestId('role-switcher').selectOption('ngozi');
  await expect(page).toHaveURL(new RegExp(`/w/${id}/ngozi`));
  await expect(page.getByRole('navigation', { name: 'Screens' })).not.toContainText('Review');
  await page.goto(`/w/${id}/ngozi?claim=line%3AF540NR.72`);
  await expect(drawer(page)).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain(note);
});

test('an adjustment is saved, keeps the original and survives a reload', async ({ page }) => {
  const id = ws('adjust');
  await page.goto(`/w/${id}/priya/return?claim=line%3AF540NR.72`);
  const d = drawer(page);
  await d.getByRole('button', { name: 'Adjust' }).click();
  await d.locator('#adj-v').fill('10500');
  await d.locator('#adj-r').fill('The 15 Sep 2025 payment is designated tax year 2024 (D68).');
  await d.getByRole('button', { name: 'Save' }).click();
  await expect(d).toContainText(/adjust/i);
  await page.reload();
  await expect(drawer(page)).toContainText('The 15 Sep 2025 payment is designated tax year 2024');
});

test('header search finds a line and never searches identifier digits', async ({ page }) => {
  const id = ws('search');
  await page.goto(`/w/${id}/daniel?q=California%20estimated`);
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('F540NR.72');
  await page.goto(`/w/${id}/daniel?q=${encodeURIComponent('123-45-6789')}`);
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('never searchable');
});

test('the product is named Taxmark in the header, the tab and Start here', async ({ page }) => {
  await page.goto(`/w/${ws('brand')}/daniel`);
  await expect(page).toHaveTitle(/^Taxmark/);
  await expect(page.locator('.sh-brand strong')).toHaveText('Taxmark');
  await expect(page.getByTestId('start-here')).toContainText('Taxmark is a web-native workpaper');
});
