// The tool's own accounting, shown where the app already answers the question: proofs in the side panel's "Who checked
// it", and engine-warning coverage in Checks' "From the engine" list. No new rows, tabs or forms.
import { expect, test } from '@playwright/test';

const ws = (n: string) => `e2e-tp-${n}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test('a carryover line shows the tool’s proof under Who checked it', async ({ page }) => {
  await page.goto(`/w/${ws('carry')}/daniel/return?claim=line:SchD.6`);
  const proofs = page.getByTestId('drawer').getByTestId('tool-proofs');
  await expect(proofs).toContainText('Checked by Taxmark');
  await expect(proofs).toContainText('Equals last year’s carryover record');
  await expect(proofs).toContainText('3,200');
});

test('a line our checks dispute shows no proof, only that its sources match and a check disputes it', async ({ page }) => {
  await page.goto(`/w/${ws('dispute')}/daniel/return?claim=line:SchC.44a`);
  const proofs = page.getByTestId('drawer').getByTestId('tool-proofs');
  await expect(proofs).toContainText('but our check disputes it');
  await expect(proofs).not.toContainText('Equals its');
});

test('after an adjustment the panel shows no proof of the old figure', async ({ page }) => {
  const w = ws('adj');
  expect((await page.request.post(`/api/w/${w}/events`, { data: { role: 'daniel', type: 'adjustment', claimId: 'line:SchD.6', payload: { value: -3100, reason: 'Test: carryover corrected.' } } })).ok()).toBeTruthy();
  await page.goto(`/w/${w}/daniel/return?claim=line:SchD.6`);
  const proofs = page.getByTestId('drawer').getByTestId('tool-proofs');
  await expect(proofs).toContainText('Adjusted');
  await expect(proofs).not.toContainText('Equals last year');
});

test('each engine warning says whether one of our checks covers it', async ({ page }) => {
  await page.goto(`/w/${ws('cover')}/daniel/checks`);
  const amt = page.locator('[data-diag="CA_AMT_NOT_COMPUTED"]');
  await expect(amt).toContainText('Covered by our check');
  await expect(amt.getByRole('link', { name: /never computed/ })).toBeVisible();
  await expect(page.locator('[data-diag="FORM_1099_FILING"]')).toContainText('Not covered by our checks');
});
