import { expect, test, type Page } from '@playwright/test';

// Checks: sign-off lives in the "Our checks" table (a checkbox per row, a select-all per group, a bar that appears
// only when something is ticked; every ticked row needs its own review note), and evidence links open on the right without reloading the
// page, so the open row and the scroll position stay where they were.
const ws = () => `e2e-chk-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const ours = (page: Page) => page.locator('section[aria-labelledby="chk-ours"]');
const rowBoxes = (page: Page) => ours(page).locator('[data-finding] input[type="checkbox"]');

test('one table: a checkbox in each row, no separate sign-off list, bar only once something is ticked', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const rows = ours(page).locator('[data-finding]');
  expect(await rows.count()).toBeGreaterThan(2);
  expect(await rowBoxes(page).count()).toBe(await rows.count());
  await expect(page.getByText('Select for sign-off')).toHaveCount(0);
  const bar = page.getByRole('toolbar', { name: 'Sign off the selected rows' });
  await expect(bar).toHaveCount(0);
  await rowBoxes(page).nth(0).check();
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('1 selected');
  await expect(bar.getByRole('button', { name: 'Sign off selected (1)' })).toBeEnabled();
  // The accordion still works on the same row, and it holds the row's review note.
  const first = rows.nth(0);
  await first.locator('summary').click();
  await expect(first.locator('details')).toHaveAttribute('open', '');
  await expect(first.getByRole('textbox', { name: /What you checked/ })).toBeVisible();
});

test('no sign-off without a review note: the first row missing one opens, then each note is saved with its sign-off', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/checks`);
  const blockerChip = page.getByText(/^\d+ blockers$/);
  const before = await blockerChip.innerText();
  const all = ours(page).getByRole('checkbox', { name: 'Select all Blocker rows' });
  const blockers = ours(page).locator('[data-finding][data-severity="blocker"]');
  const n = await blockers.count();
  expect(n).toBeGreaterThan(2);
  await all.check();
  const bar = page.getByRole('toolbar', { name: 'Sign off the selected rows' });
  await expect(bar).toContainText(`${n} selected`);
  await expect(bar).toContainText(/keep blocking approval/);
  await all.uncheck();
  await expect(bar).toHaveCount(0);
  // Tick two rows; write a note on the second only; signing is refused and takes you to the first.
  await rowBoxes(page).nth(0).check();
  await rowBoxes(page).nth(1).check();
  const second = blockers.nth(1);
  await second.locator('summary').click();
  await second.getByRole('textbox', { name: /What you checked/ }).fill('Checked against the 1099-K');
  await bar.getByRole('button', { name: 'Sign off selected (2)' }).click();
  await expect(bar).toContainText('1 selected row needs a note on what you checked');
  const first = blockers.nth(0);
  await expect(first.locator('details')).toHaveAttribute('open', '');
  const firstNote = first.getByRole('textbox', { name: /What you checked/ });
  await expect(firstNote).toBeFocused();
  await expect(ours(page).locator('[data-finding]').filter({ hasText: 'Signed off' })).toHaveCount(0);
  await firstNote.fill('Proration agreed to the closing statement');
  await bar.getByRole('button', { name: 'Sign off selected (2)' }).click();
  const toast = page.getByRole('status').filter({ hasText: 'sign-offs saved together' });
  await expect(toast).toContainText('2 sign-offs saved together');
  await expect(ours(page).locator('[data-finding]').filter({ hasText: 'Signed off' })).toHaveCount(2);
  await expect(blockerChip).toHaveText(before);
  await page.goto(`/w/${w}/daniel/review?tab=log`);
  await expect(page.getByRole('main')).toContainText('Proration agreed to the closing statement');
  await expect(page.getByRole('main')).toContainText('Checked against the 1099-K');
  await page.goto(`/w/${w}/daniel/checks`);
  await page.getByRole('status').filter({ hasText: 'sign-offs saved together' }).getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'sign-offs saved together' })).toHaveCount(0);
  await expect(ours(page).locator('[data-finding]').filter({ hasText: 'Signed off' })).toHaveCount(0);
});

test('roles that do not sign off get no checkboxes', async ({ page }) => {
  const w = ws();
  // Jo (firm administrator) sees Checks but signs nothing; Sam (quality reviewer) joins later in the story.
  await page.goto(`/w/${w}/jo/checks`);
  await expect(ours(page).locator('[data-finding]').first()).toBeVisible();
  await expect(rowBoxes(page)).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('an evidence link opens on the right without a reload: the row stays open, the list stays put, the link is marked', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = ours(page).locator('[data-finding]').filter({ has: page.locator('a[data-ref]') }).nth(3);
  await row.locator('summary').click();
  const pane = page.locator('main.sh-pane-c');
  await row.scrollIntoViewIfNeeded();
  const scrollBefore = await pane.evaluate((el) => el.scrollTop);
  expect(scrollBefore).toBeGreaterThan(100);
  await page.evaluate(() => { (window as unknown as { __stay: number }).__stay = 1; });
  const link = row.locator('a[data-ref]').first();
  await link.click();
  await expect(page).toHaveURL(/claim=/);
  await expect(row.locator('a[data-ref]').first()).toHaveAttribute('aria-current', 'true');
  expect(await page.evaluate(() => (window as unknown as { __stay?: number }).__stay)).toBe(1); // no full reload
  await expect(row.locator('details')).toHaveAttribute('open', '');
  expect(Math.abs((await pane.evaluate((el) => el.scrollTop)) - scrollBefore)).toBeLessThan(40);
});

test('the drawer sign-off needs a review note too, and the note shows in its Sign-offs list', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/return?claim=line:F1040.26`);
  const drawer = page.getByTestId('drawer');
  const acts = drawer.getByTestId('drawer-actions');
  await acts.getByRole('button', { name: 'Sign off as reviewer', exact: true }).click();
  await acts.locator('.drw-panel').getByRole('button', { name: 'Sign off', exact: true }).click();
  await expect(acts).toContainText(/What you checked/);
  await expect(drawer).not.toContainText('reviewer sign-off by');
  await drawer.getByLabel('What you checked (required)').fill('Agreed to the IRS account transcript');
  await acts.locator('.drw-panel').getByRole('button', { name: 'Sign off', exact: true }).click();
  await expect(drawer).toContainText('Agreed to the IRS account transcript');
  await expect(drawer).toContainText('reviewer sign-off by');
});

test('a refused sign-off says why and keeps the selection and the notes', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = ours(page).locator('[data-finding]').filter({ has: page.locator('input[type="checkbox"]') }).first();
  await row.locator('summary').click();
  const note = row.locator('[data-signoff-note]');
  await note.fill('x'.repeat(8100)); // over the server's payload limit, so the write is refused
  await page.getByRole('button', { name: 'Sign off selected (1)' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Not saved' })).toBeVisible();
  await expect(note).toHaveValue('x'.repeat(8100));
  await expect(row.locator('input[type="checkbox"]')).toBeChecked();
});

test('on a phone, opening evidence brings the document into view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/w/${ws()}/daniel/checks`);
  const row = ours(page).locator('[data-finding]').filter({ has: page.locator('a[data-ref]') }).nth(2);
  await row.locator('summary').click();
  await row.locator('a[data-ref]').first().click();
  await expect(page).toHaveURL(/claim=/);
  await expect(page.getByTestId('drawer')).toBeInViewport({ ratio: 0.05 });
});
