import { expect, test, type Page } from '@playwright/test';

// UX audit tiers 1 and 2 (docs/reviews/2026-10-17-ux-audit.md): broken review steps fixed, redundant UI removed.
const ws = () => `e2e-ux-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const post = (page: Page, w: string, role: string, body: object) =>
  page.request.post(`/api/w/${w}/events`, { data: { role, ...body } });

test('T1: a preparer\'s proposed adjustment reaches Review, where the reviewer applies it', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/priya/return?claim=line:SchA.5b`);
  const acts = page.getByTestId('drawer-actions');
  await acts.getByRole('button', { name: 'Adjust', exact: true }).click();
  await page.locator('#adj-v').fill('6508');
  await page.locator('#adj-r').fill('Only the buyers\' share is deductible');
  await acts.locator('.drw-panel').getByRole('button', { name: 'Save' }).click();
  await expect(acts.getByRole('status')).toContainText('proposed');
  // The panel says it is proposed, not "As computed".
  await page.goto(`/w/${w}/daniel/return?claim=line:SchA.5b`);
  await expect(page.getByTestId('drawer')).toContainText(/Proposed 6,508 by Priya/);
  await page.goto(`/w/${w}/daniel/review`);
  const main = page.getByRole('main');
  await expect(main.getByRole('link', { name: /^Adjustments 1/ }).or(main.getByRole('button', { name: /^Adjustments 1/ })).first()).toBeVisible();
  await expect(main).toContainText('Proposed');
  await main.getByRole('button', { name: 'Apply' }).click();
  await expect(main).toContainText('Applied');
});

test('T3: a document\'s panel lists the checks that cite it', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/documents?claim=doc:D54`);
  const drawer = page.getByTestId('drawer');
  await expect(drawer).toContainText(/Checks that cite this document/);
  await expect(drawer).toContainText(/other party.s share credited at closing/);
  await expect(drawer).not.toContainText('No open checks');
});

test('T4: after filing the client sees no "Not signed" and no stale asks; before filing the asks show', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/ngozi`);
  await expect(page.getByRole('main')).toContainText('Needed');
  // Move the story to after acceptance (as Jo, on Firm).
  await page.goto(`/w/${w}/jo/firm`);
  const pick = page.getByLabel(/Move story time to/);
  const options = await pick.locator('option').allInnerTexts();
  const accepted = options.find((o) => /accepted California/i.test(o));
  expect(accepted, 'a California acceptance in the timeline').toBeTruthy();
  await pick.selectOption({ label: accepted! });
  await page.getByRole('button', { name: 'Move clock' }).click();
  await expect(page.getByText(/As filed, locked/).first()).toBeVisible();
  await page.goto(`/w/${w}/ngozi/filing`);
  await expect(page.getByRole('main')).toContainText('You approved the return and signed');
  await expect(page.getByRole('main')).not.toContainText('Not signed');
  await page.goto(`/w/${w}/ngozi`);
  await expect(page.getByRole('main')).not.toContainText('Needed');
  void post;
});
