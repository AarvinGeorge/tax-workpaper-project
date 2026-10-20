// One answer to "is this check still open", wherever a line is shown; and a line in the side panel links to its place
// in its form on the Return overview, from any screen.
import { expect, test, type APIRequestContext } from '@playwright/test';

const ws = (n: string) => `e2e-sp-${n}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const post = (rq: APIRequestContext, w: string, role: string, data: Record<string, unknown>) =>
  rq.post(`/api/w/${w}/events`, { data: { role, ...data } });
const adjustCa = (rq: APIRequestContext, w: string) =>
  post(rq, w, 'daniel', { type: 'adjustment', claimId: 'line:F540NR.72', payload: { value: 10500, reason: 'The 15 Sep 2025 payment is designated tax year 2024 (D68).' } });

test('an adjusted line reads Adjusted on the Forms tab, and its form no longer counts it as open', async ({ page }) => {
  const w = ws('forms');
  await page.goto(`/w/${w}/daniel/return?open=F540NR`);
  const form = page.getByRole('group', { name: 'Form 540NR' });
  const row = form.getByRole('row', { name: /F540NR\.72/ });
  await expect(row).toContainText('Blocking');
  await expect(form).toContainText('2 with open checks');
  expect((await adjustCa(page.request, w)).ok()).toBeTruthy();
  await page.reload();
  await expect(row).toContainText('Adjusted');
  await expect(row).not.toContainText('Blocking');
  await expect(form).toContainText('1 with open checks');
});

test('the side panel says the checks on an adjusted line are Adjusted, as Checks does', async ({ page }) => {
  const w = ws('drawer');
  expect((await adjustCa(page.request, w)).ok()).toBeTruthy();
  await page.goto(`/w/${w}/daniel/return?claim=line:F540NR.72`);
  const panel = page.getByRole('region', { name: 'Where this number came from' });
  const ours = panel.locator('.drw-sec', { hasText: 'Our checks on this' });
  await expect(ours.locator('.srcitem')).toHaveCount(2);
  await expect(ours).not.toContainText('Blocking');
  await expect(ours.locator('.srcitem .tag', { hasText: 'Adjusted' })).toHaveCount(2);
});

test('a line in the side panel links to its place in its form, from Checks', async ({ page }) => {
  const w = ws('place');
  await page.goto(`/w/${w}/daniel/checks?claim=line:F540NR.72`);
  const panel = page.getByRole('region', { name: 'Where this number came from' });
  const place = panel.getByRole('link', { name: /^F540NR\.72 · Form 540NR/ });
  await expect(place).toHaveAttribute('href', `/w/${w}/daniel/return?claim=line%3AF540NR.72`);
  await place.click();
  await expect(page).toHaveURL(new RegExp(`/w/${w}/daniel/return\\?claim=line%3AF540NR\\.72$`));
  await expect(page.getByRole('group', { name: 'Form 540NR' }).locator('tr[aria-current="true"]')).toContainText('F540NR.72');
});

test('roles without the Return overview get the line id as plain text', async ({ page }) => {
  const w = ws('irs');
  await page.goto(`/w/${w}/irs?claim=line:F540NR.72`);
  await expect(page.getByRole('region', { name: 'Where this number came from' }).getByRole('link', { name: /^F540NR\.72 · Form 540NR/ })).toHaveCount(0);
});

test('an adjusted line that also carries an engine warning reads Adjusted on the Forms tab', async ({ page }) => {
  const w = ws('diag');
  await page.goto(`/w/${w}/daniel/return?open=SchC`);
  const row = page.getByRole('group', { name: 'Schedule C' }).getByRole('row', { name: /SchC\.30\b/ });
  const before = await row.innerText();
  expect((await post(page.request, w, 'daniel', { type: 'adjustment', claimId: 'line:SchC.30', payload: { value: 0, reason: 'Test: the home-office deduction is reviewed.' } })).ok()).toBeTruthy();
  await page.reload();
  await expect(row, `before: ${before}`).toContainText('Adjusted');
});
