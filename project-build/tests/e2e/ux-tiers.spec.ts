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
  await expect(main).toContainText(/13,420\s*to\s*6,508/); // the reviewer sees what they would apply
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
  // Paywell: the reading on D15 page 3 is cited, so the separate 'D15, page 3' link is dropped.
  const refs = await page.locator('[data-finding="CHK-DUP-1099K-BOOKS:line:SchC.1"] a[data-ref]').evaluateAll((as) => as.map((a) => a.getAttribute('data-ref')));
  expect(refs).toContain('ev-0109');
  expect(refs).not.toContain('doc:D15#page3');
});

test('T8: the All count matches our checks', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const ours = await page.locator('#chk-ours span').first().innerText(); // "(27)"
  await expect(page.getByRole('link', { name: /^All / })).toContainText(ours.replace(/[()]/g, ''));
});

test('T9 and Areas: the overview does not repeat Checks; Areas links to Review', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/priya`);
  await expect(page.locator('section[aria-label="Open checks"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open all checks' })).toHaveCount(0);
  await page.goto(`/w/${w}/priya/areas`);
  await page.getByRole('main').locator('summary').filter({ hasText: 'Prior preparer against our changes' }).click();
  await expect(page.getByRole('main').getByRole('link', { name: /Adjustments on Review/ })).toBeVisible();
});

test('T7: de-duplication keeps distinct values and pages, and drops only a repeated document', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = (id: string) => page.locator(`section[aria-labelledby="chk-ours"] [data-finding="${id}"]`);
  // The video's blocker cites three readings on one page: all three stay.
  await expect(row('CHK-PAYMENT-TAX-YEAR:line:F540NR.72').locator('a[data-ref]')).toHaveCount(3);
  // A duplicate-page check keeps both pages.
  const dup = row('CHK-DUP-PAGE:line:SchC.44a').locator('a[data-ref]');
  const labels = (await dup.evaluateAll((as) => as.map((a) => a.textContent ?? ''))).join(' | ');
  expect(labels, labels).toMatch(/page 2/);
  expect(labels, labels).toMatch(/page 3/);
  // The proration blocker cited D54 twice (a reading and the bare document): the bare one goes.
  const pr = await row('CHK-PRORATION-CREDIT-UNUSED:line:SchA.5b').locator('a[data-ref]').evaluateAll((as) => as.map((a) => a.getAttribute('data-ref')));
  expect(pr).toContain('ev-1027');
  expect(pr).not.toContain('doc:D54');
});

test('T4: a client ask disappears once the firm clears it', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/ngozi`);
  const needed = page.getByRole('main').locator('a.qrow').filter({ hasText: 'Needed' });
  const before = await needed.count();
  expect(before).toBeGreaterThan(0);
  const href = (await needed.first().getAttribute('href'))!;
  const claimId = decodeURIComponent(href.split('claim=')[1].split('&')[0]);
  const r = await page.request.post(`/api/w/${w}/events`, { data: { role: 'daniel', type: 'finding_cleared', claimId, payload: { reason: 'Client sent it by email' } } });
  expect(r.ok()).toBe(true);
  await page.reload();
  await expect(needed).toHaveCount(before - 1);
});
