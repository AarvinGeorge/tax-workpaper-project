import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// Whole-app fix round (docs/superpowers/plans/2026-10-18-whole-app-fix-round.md): seven bugs (A1-A7) and eight
// lean-ups (B1-B8). Each test names its item.
const ws = () => `e2e-fix-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const move = (page: Page, w: string, role: string, to: string, from?: string) =>
  page.request.post(`/api/w/${w}/events?role=${role}`, { data: { type: 'clock_moved', payload: from ? { to, from } : { to } } });
const infoButton = (page: Page) => page.getByRole('button', { name: /About this workspace/ });
const FILED = '2026-07-16T00:00:00Z';
/** Digit runs in the timeline's Form 8879 detail (the PINs). Read here only to prove the page never shows them. */
const pins = (): string[] => {
  const pk = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'packet.json'), 'utf8')) as { timeline: { event: string; detail?: string }[] };
  return pk.timeline.filter((t) => /8879/.test(t.event)).flatMap((t) => String(t.detail ?? '').match(/\d{5,}/g) ?? []);
};

test('A1: after filing, Review and the client page agree with the firm record: approved, both signed on 10 Jul 2026', async ({ page }) => {
  const w = ws();
  expect((await move(page, w, 'jo', FILED)).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel/review`);
  const box = page.getByRole('region', { name: 'Approval', exact: true });
  await expect(box.getByTestId('staff-signing')).toContainText('Client approval and e-file signature');
  await expect(box).not.toContainText('has not signed');
  await expect(box).not.toContainText('Not yet');
  for (const who of ['ngozi', 'erik']) await expect(box.getByTestId(`signature-${who}`)).toContainText('10 Jul 2026');
  // The 8879 event's detail carries PINs: never rendered (checked as a boolean so a failure never prints them).
  const body = await page.locator('body').innerText();
  expect(pins().length).toBeGreaterThan(0);
  expect(pins().some((x) => body.includes(x))).toBe(false);
  await page.goto(`/w/${w}/helen/review`);
  const approve = page.getByRole('button', { name: 'Approve the return' });
  await expect(approve).toBeDisabled();
  await expect(page.getByRole('main')).toContainText('Approved and filed per the firm');
  await expect(page.getByRole('main')).not.toContainText('must clear first');
  await page.goto(`/w/${w}/ngozi/filing`);
  await expect(page.getByTestId('client-signing')).toContainText('10 Jul 2026');
});

test('A2: Areas shows the California overpayment as a refund, never a negative balance due', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/areas`);
  const summary = page.getByRole('table', { name: 'Summary' });
  await expect(summary.locator('tr', { hasText: 'California: Refund' })).toContainText('8,256');
  await expect(summary.locator('tr', { hasText: 'Federal: Balance due' })).toContainText('4,220');
  await expect(summary).not.toContainText(/[-−]8,256/);
});

test('A3: the filing status lists only notices for this tax year', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  await expect(page.getByTestId('filing-status')).toBeVisible();
  await expect(page.getByTestId('filing-status')).not.toContainText('CP2000');
  for (const at of ['2026-04-14T12:00:00Z', FILED]) {
    expect((await move(page, w, 'jo', at)).ok()).toBe(true);
    await page.goto(`/w/${w}/daniel`);
    await expect(page.getByTestId('filing-status')).not.toContainText('CP2000');
  }
  expect((await move(page, w, 'jo', '2028-01-26T15:00:00Z')).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel`);
  await expect(page.getByTestId('filing-status')).toContainText('Letter 566');
});

test('A4: the clock refuses a time outside the story', async ({ page }) => {
  const w = ws();
  expect((await move(page, w, 'jo', '2999-01-01T00:00:00Z')).ok()).toBe(false);
  await page.goto(`/w/${w}/daniel`);
  await expect(page.getByRole('group', { name: 'Story clock' })).not.toContainText('earlier point in the story');
});

test('A5: clients do not see internal deadlines in the "?" dialog; staff do', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/ngozi`);
  await infoButton(page).click();
  const dl = page.getByRole('dialog').locator('details', { has: page.locator('#firm-dl') });
  await dl.locator('summary').click();
  await expect(dl).toContainText('Extended due date');
  await expect(dl).not.toContainText('Internal');
  await page.goto(`/w/${w}/daniel`);
  await infoButton(page).click();
  const sdl = page.getByRole('dialog').locator('details', { has: page.locator('#firm-dl') });
  await sdl.locator('summary').click();
  await expect(sdl).toContainText('Internal');
});

test('A6: a clock move reads as a past action in Changes', async ({ page }) => {
  const w = ws();
  expect((await move(page, w, 'jo', FILED, '2026-06-23T06:05:00Z')).ok()).toBe(true);
  expect((await move(page, w, 'jo', '2026-07-20T15:00:00Z')).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel/review?tab=log`);
  const log = page.locator('section[aria-label="Change log"]');
  await expect(log).toContainText('moved the clock from 23 Jun 2026');
  await expect(log).toContainText('moved the clock to 20 Jul 2026');
});

test('B1: Start here is the "?" Demo section for every role; the overview no longer carries it', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  await expect(page.getByTestId('start-here')).toHaveCount(0);
  await expect(page.getByTestId('counts')).toBeHidden();
  for (const who of ['daniel', 'ngozi', 'irs']) {
    await page.goto(`/w/${w}/${who}`);
    await infoButton(page).click();
    const dlg = page.getByRole('dialog');
    const first = dlg.locator('details.info-sec').first();
    await expect(first.locator('summary')).toContainText('Demo');
    await expect(first.getByTestId('counts')).toContainText('74 documents');
    await expect(first).toContainText('Taxmark is a web-native workpaper');
    await expect(first).toContainText('IRS examiner');
  }
});

test('B2: one blocker list, on Checks; the overview and Review give a count that links there', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  const sec = page.getByRole('main').locator('section[aria-label="Blocking approval"]');
  await expect(sec.locator('a.qrow')).toHaveCount(1);
  await expect(sec.locator('a.qrow')).toContainText(/\d+ items? stops? filing/);
  await expect(sec.locator('a.qrow')).toHaveAttribute('href', /\/checks\?claim=/);
  await page.goto(`/w/${w}/daniel/review`);
  const box = page.getByRole('region', { name: 'Approval', exact: true });
  await expect(box.getByRole('list', { name: 'Blockers' })).toHaveCount(0);
  await expect(box.getByRole('link', { name: /\d+ items? stops? filing/ })).toHaveAttribute('href', /\/checks\?claim=/);
});

test('B3: no intro paragraphs under the screen titles; Review is titled Review', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  await expect(page.getByRole('main')).not.toContainText('The return, its open questions');
  await page.goto(`/w/${w}/daniel/checks`);
  await expect(page.getByRole('main')).not.toContainText('Our checks run over the packet');
  await page.goto(`/w/${w}/daniel/review`);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Review');
  await expect(page.getByRole('main')).not.toContainText('Everything we changed over');
  await expect(page.getByTestId('staff-signing')).toContainText('A signature goes stale'); // a rule the brief needs stays
  await page.goto(`/w/${w}/daniel/documents`);
  await expect(page.getByRole('main')).not.toContainText('Kind of document is a plain label');
  await page.goto(`/w/${w}/ngozi/filing`);
  await expect(page.getByRole('main')).not.toContainText('Where your return is, what was sent, and what comes next');
});

test('B4: no Saved pill, no nav hints, no History pane', async ({ page }) => {
  const w = ws();
  expect((await page.request.post(`/api/w/${w}/events?role=daniel`, { data: { type: 'review_note', claimId: 'line:F540NR.72', payload: { text: 'tie out' } } })).ok()).toBe(true);
  for (const who of ['daniel', 'ngozi']) {
    await page.goto(`/w/${w}/${who}`);
    await expect(page.locator('header.sh-head')).not.toContainText('Saved');
    await expect(page.locator('.sh-nav .small')).toHaveCount(0);
    await expect(page.locator('.sh-hist')).toHaveCount(0);
    await expect(page.locator('aside.sh-pane-l')).not.toContainText(/History|Your activity/);
  }
});

test('B5: the role banner is one clause', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/jo`);
  const banner = page.locator('.sh-banner');
  await expect(banner).toContainText('Viewing as');
  await expect(banner).not.toContainText('who viewed what');
  await page.goto(`/w/${w}/ngozi`);
  await expect(banner).toContainText('sign when ready');
});

test('B6: the panel shows the evidence before the actions, read confidence once, no ev- ids or coordinates', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/return?claim=line:F540NR.72`);
  const d = page.getByTestId('drawer');
  await expect(d.getByTestId('claim-value')).toHaveText('14,000');
  const srcY = (await d.getByText(/^Where it came from/).first().boundingBox())!.y;
  const actsY = (await d.getByTestId('drawer-actions').boundingBox())!.y;
  expect(srcY).toBeLessThan(actsY);
  const text = await d.innerText();
  expect(text).not.toMatch(/\bev-\d+/);
  expect(text).not.toMatch(/ at \d\.\d\d, \d\.\d\d/);
  expect(text.match(/Pipeline read/g)?.length ?? 0).toBe(1);
  await expect(d.getByTestId('source-page').first()).toContainText('Field:');
});

test('B8: the document panel names extraction in plain words; a repeated reason appears once in the list', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/documents?claim=doc:D68`);
  const d = page.getByTestId('drawer');
  await expect(d).toContainText('received');
  await expect(d).not.toContainText(/extraction extracted/);
  const list = await page.getByTestId('doc-list').innerText();
  expect(list.match(/Read by the engine/g)?.length ?? 0).toBeLessThanOrEqual(1);
  await page.getByRole('link', { name: /^Corroborates only/ }).click();
  await expect(page.getByTestId('doc-list').locator('[data-doc]').first()).toContainText('Corroborates only');
});
