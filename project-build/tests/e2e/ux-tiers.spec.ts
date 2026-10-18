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

test('T5: the panel names what its actions act on, puts them first, and offers only actions that fit', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/return?claim=line:SchA.5b`);
  const drawer = page.getByTestId('drawer');
  const acts = drawer.getByTestId('drawer-actions');
  await expect(acts).toContainText('Acting on: Real estate taxes (home)');
  const actsY = (await acts.boundingBox())!.y;
  const srcY = (await drawer.getByText(/^Where it came from/).first().boundingBox())!.y;
  expect(actsY).toBeLessThan(srcY);
  await expect(acts.getByRole('button', { name: 'Adjust', exact: true })).toBeVisible();
  await page.goto(`/w/${w}/daniel/documents?claim=doc:D54`);
  await expect(acts).toContainText('Acting on:');
  await expect(acts.getByRole('button', { name: 'Adjust', exact: true })).toHaveCount(0);
});

test('T6: notices live in the bell only; Home has no second copy', async ({ page }) => {
  await page.goto(`/w/${ws()}/priya`);
  await expect(page.getByTestId('since-last-looked')).toHaveCount(0);
  await expect(page.getByTestId('bell')).toBeVisible();
});

test('T7: a Checks row has one link per destination', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  await expect(page.getByRole('link', { name: 'Show where it came from' })).toHaveCount(0);
  const rows = page.locator('section[aria-labelledby="chk-ours"] [data-finding]');
  for (let i = 0; i < await rows.count(); i++) {
    const hrefs = await rows.nth(i).locator('a[data-ref]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
    expect(new Set(hrefs).size, `row ${i} evidence links: ${hrefs.join(' ')}`).toBe(hrefs.length);
  }
});

test('T8: the All count matches our checks', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const ours = await page.locator('#chk-ours span').first().innerText(); // "(27)"
  await expect(page.getByRole('link', { name: /^All / })).toContainText(ours.replace(/[()]/g, ''));
});

test('T9 and Areas: Home counts the other open checks instead of listing them; Areas links to Review', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/priya`);
  const open = page.locator('section[aria-label="Open checks"]');
  await expect(open).toContainText(/\d+ more open checks/);
  await expect(open.locator('a.qrow')).toHaveCount(0);
  await expect(open.getByRole('link', { name: 'Open all checks' })).toBeVisible();
  await page.goto(`/w/${w}/priya/areas`);
  await page.getByRole('main').locator('summary').filter({ hasText: 'Prior preparer against our changes' }).click();
  await expect(page.getByRole('main').getByRole('link', { name: /Adjustments on Review/ })).toBeVisible();
});
