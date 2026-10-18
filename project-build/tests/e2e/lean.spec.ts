import { expect, test, type Page } from '@playwright/test';

// Fewer screens, controls at hand (plan Part B): three staff nav entries, the clock in the Story time bar with a past
// banner, a "?" dialog for legends and reference, Changes and the view log as Review tabs, What-ifs as an overview tab,
// the staff Filing essentials on the overview and Review, and the old addresses redirecting to their new homes.
const ws = () => `e2e-lean-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const move = (page: Page, w: string, role: string, to: string) =>
  page.request.post(`/api/w/${w}/events?role=${role}`, { data: { type: 'clock_moved', payload: { to } } });
const infoButton = (page: Page) => page.getByRole('button', { name: /About this workspace/ });
const versionLabel = (page: Page) => page.locator('span', { has: page.locator('span.muted', { hasText: /^Version$/ }) }).first();

test('/findings left the app: it lands on Checks with the open claim', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/checks`);
  const id = await page.locator('[data-finding]').first().getAttribute('data-finding');
  await page.goto(`/w/${w}/daniel/findings?claim=${encodeURIComponent('finding:' + id)}`);
  await expect(page).toHaveURL(new RegExp(`/daniel/checks\\?claim=`));
  await expect(page.getByTestId('drawer')).not.toContainText('Pick any number');
  await expect(page.getByRole('group', { name: 'Filter by severity' }).getByRole('link', { name: /AI suggestions/ })).toBeVisible();
});

test('staff nav has exactly three entries: Return overview, Checks, Review', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel`);
  const links = page.getByRole('navigation', { name: 'Screens' }).getByRole('link');
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toContainText('Return overview');
  await expect(links.nth(1)).toContainText('Checks');
  await expect(links.nth(2)).toContainText('Review');
});

test('the "?" dialog: legends for staff with the firm reference, Esc closes it; the Forms key row is gone', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel`);
  await expect(page.getByRole('group', { name: 'Status key' })).toHaveCount(0);
  await infoButton(page).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  for (const t of ['Legends', 'Check failed', 'Engine warning', 'New this year', 'No open checks', 'Stale', 'Proposed', 'As filed, locked',
    'Deadlines on the story clock', 'Firm standards', 'People and clearance', 'Time against budget']) await expect(dlg, t).toContainText(t);
  await expect(dlg).not.toContainText('Known packet mistakes');
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await infoButton(page).click();
  await dlg.getByRole('button', { name: 'Close' }).click();
  await expect(dlg).toBeHidden();
});

test('a client sees only Legends and Deadlines in the "?" dialog', async ({ page }) => {
  await page.goto(`/w/${ws()}/ngozi`);
  await infoButton(page).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('Legends');
  await expect(dlg).toContainText('Deadlines on the story clock');
  for (const t of ['Firm standards', 'People and clearance', 'Time against budget']) await expect(dlg, t).not.toContainText(t);
});

test('old addresses: /firm opens the dialog, /changes lands on Review Changes with its filter, staff /filing lands on the overview', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/jo/firm`);
  await expect(page).toHaveURL(new RegExp(`/w/${w}/jo\\?info=1$`));
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Time against budget');

  await page.goto(`/w/${w}/daniel/changes?kind=adjustment&claim=line%3AF1040.26`);
  await expect(page).toHaveURL(/\/daniel\/review\?tab=log&kind=adjustment&claim=line%3AF1040\.26$/);
  await expect(page.locator('section[aria-label="Change log"]')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Changes/ })).toHaveAttribute('aria-current', 'page');

  await page.goto(`/w/${w}/daniel/filing`);
  await expect(page).toHaveURL(new RegExp(`/w/${w}/daniel$`));
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Return overview');

  await page.goto(`/w/${w}/ngozi/filing`);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Filing your return');
});

test('Review gains Changes and View log tabs', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/priya/documents`);
  await page.getByTestId('doc-list').locator('[data-doc]').filter({ hasText: /W-2/ }).first().click();
  await page.getByTestId('drawer').getByTestId('reveal').first().click();
  await expect(page.getByTestId('drawer')).toContainText('Revealed, logged');
  await page.goto(`/w/${w}/daniel/review`);
  const tabs = page.getByRole('navigation', { name: 'Review views' });
  for (const t of ['Adjustments', 'Review notes', 'Sign-offs', 'Partner items', 'Changes', 'View log']) await expect(tabs).toContainText(t);
  await tabs.getByRole('link', { name: /^Changes/ }).click();
  await expect(page).toHaveURL(/tab=log/);
  await expect(page.locator('section[aria-label="Change log"]')).toContainText('Reveal');
  await page.getByRole('group', { name: 'Filter changes' }).getByRole('link', { name: /^Reveal/ }).click();
  await expect(page).toHaveURL(/tab=log/);
  await expect(page).toHaveURL(/kind=reveal/);
  await tabs.getByRole('link', { name: /^View log/ }).click();
  await expect(page).toHaveURL(/tab=views/);
  await expect(page.getByRole('main')).toContainText('Priya Raman');
});

test('What-ifs is a tab of the Return overview', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel`);
  const tabs = page.getByRole('main').getByRole('navigation', { name: 'Return overview tabs' });
  await tabs.getByRole('link', { name: 'What-ifs' }).click();
  await expect(page).toHaveURL(/\/daniel\/whatifs$/);
  await expect(tabs.getByRole('link', { name: 'What-ifs' })).toHaveAttribute('aria-current', 'page');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Return overview');
  await expect(main).toContainText('What-ifs from the engine');
  await expect(main).toContainText('Not a change; nothing is saved to the return');
});

test('the overview carries the filing status: rejection, acceptance, extension, the lock', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  await expect(page.getByTestId('filing-status')).toContainText(/Not sent/);
  expect((await move(page, w, 'jo', '2026-07-16T00:00:00Z')).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel/areas`);
  const fs = page.getByTestId('filing-status');
  await expect(fs).toContainText(/Rejected 13 Jul 2026: .*name control/);
  await expect(fs).toContainText('Accepted 14 Jul 2026');
  await expect(fs).toContainText('Accepted 15 Jul 2026');
  await expect(fs).toContainText(/Extension.*Filed 14 Apr 2026 with 36,000, estimated from v2/);
  await expect(fs).toContainText('As filed, locked');
  await expect(fs.getByRole('link', { name: /CP2000/ })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('For comparison');
});

test('Review: the Approval box shows the client signatures', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/review`);
  const box = page.getByRole('region', { name: 'Approval' });
  await expect(box.getByTestId('staff-signing')).toContainText('Client approval and e-file signature');
  await expect(box.getByTestId('signature-ngozi')).toContainText('Not signed');
});

test('carryovers and next year show on the overview after filing for every staff role; related returns end the Areas tab', async ({ page }) => {
  const w = ws();
  expect((await move(page, w, 'jo', '2026-07-16T00:00:00Z')).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel`);
  const main = page.getByRole('main');
  await expect(main).toContainText(/Carryovers into next year/);
  await expect(main).toContainText(/Federal estimates due/);
  await page.goto(`/w/${w}/daniel/areas`);
  const last = main.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Related returns and outside filings' }) });
  await expect(last).toHaveCount(1);
  await expect(last).toContainText(/FBAR|FinCEN/);
});

test('the Story time bar moves the clock, grouped by stage; the past is said up front with Return to latest', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  const bar = page.getByRole('group', { name: 'Story clock' });
  const pick = bar.getByLabel(/Move story time to/);
  expect(await pick.locator('optgroup').count()).toBeGreaterThan(1);
  await expect(bar).not.toContainText('earlier point in the story');
  const opt = (await pick.locator('option').allInnerTexts()).find((o) => /16 Jul 2026|15 Jul 2026, 02:10/.test(o))!;
  await pick.selectOption({ label: opt });
  await bar.getByRole('button', { name: 'Move clock' }).click();
  await expect(bar).toContainText('15 Jul 2026');
  expect((await move(page, w, 'jo', '2026-07-16T00:00:00Z')).ok()).toBe(true);
  expect((await move(page, w, 'jo', '2026-04-14T12:00:00Z')).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel`);
  await expect(bar).toContainText('You are viewing 14 Apr 2026, 12:00 UTC, an earlier point in the story. Nothing can be changed here.');
  await expect(bar).toContainText(/Jo/);
  await expect(page.getByTestId('kpis')).toContainText('77,470');
  await expect(page.getByTestId('kpis')).toContainText('17,999');
  await expect(versionLabel(page)).toContainText('v2');
  await bar.getByRole('button', { name: 'Return to latest' }).click();
  await expect(bar).toContainText('16 Jul 2026, 00:00 UTC');
  await expect(bar).not.toContainText('earlier point in the story');
});

test('every role has the clock in the bar; a role not yet in the story is pointed to it', async ({ page }) => {
  await page.goto(`/w/${ws()}/irs`);
  await expect(page.getByRole('group', { name: 'Story clock' }).getByLabel(/Move story time to/)).toBeVisible();
  const main = page.getByRole('main');
  await expect(main).toContainText('Not yet in the story');
  await expect(main).toContainText(/bar above/);
  await expect(main).not.toContainText('Open Firm as Jo');
});
