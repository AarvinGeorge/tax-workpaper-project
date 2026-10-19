// A deep link lands on its item: the open row (on Checks, the item holding the finding) is marked (aria-current) and brought into view in the centre pane, on
// Checks, Forms and Documents. Checks rows carry "Confident mistake"; the panel note is a callout. Ids may appear in tests.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const ws = () => `e2e-sel-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
type P = { timeline: { at: string }[]; return_versions: { lines: { key: string; form: string }[] }[] };
const packet = (): P => JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'packet.json'), 'utf8')) as P;
const lastAt = () => packet().timeline.map((t) => t.at).sort().pop()!;
const q = (c: string) => encodeURIComponent(c);
const ROWS = '[data-item][aria-current="true"], tr[aria-current="true"], .docrow[aria-current="true"]';

async function inPane(page: Page, el: Locator) {
  const pane = await page.locator('.sh-pane-c').boundingBox();
  const box = await el.boundingBox();
  expect(pane && box).toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(pane!.y - 1);
  expect(box!.y + Math.min(box!.height, 40)).toBeLessThanOrEqual(pane!.y + pane!.height + 1);
}
const paneTop = (page: Page) => page.locator('.sh-pane-c').evaluate((e) => e.scrollTop);

test('Checks: a deep link to a row far down marks it and scrolls it into view', async ({ page }) => {
  const id = 'CHK-SEP-LIMIT:line:Sch1.16';
  await page.goto(`/w/${ws()}/daniel/checks?claim=${q('finding:' + id)}`);
  const row = page.locator('[data-item]').filter({ has: page.locator(`[data-finding="${id}"]`) });
  await expect(row).toHaveAttribute('aria-current', 'true');
  await expect(page.locator(ROWS)).toHaveCount(1);
  expect(await paneTop(page)).toBeGreaterThan(0);
  await inPane(page, row);
});

test('Checks: opening a visible row does not move the list', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const first = page.locator('[data-item]').first();
  await first.locator('summary').click();
  const link = first.getByRole('link', { name: 'Open the finding' });
  await link.scrollIntoViewIfNeeded(); // Playwright's own pre-click scroll, taken out of the measurement
  const before = await paneTop(page);
  await link.click();
  await expect(first).toHaveAttribute('aria-current', 'true');
  expect(await paneTop(page)).toBe(before);
});

test('Forms: a deep link to a line far down a long form lands in view, marked', async ({ page }) => {
  const lines = packet().return_versions.at(-1)!.lines.filter((l) => l.form === 'F8949');
  const key = lines[lines.length - 1].key;
  await page.goto(`/w/${ws()}/daniel/return?claim=${q('line:' + key)}`);
  const row = page.locator('tr[aria-current="true"]');
  await expect(row).toHaveCount(1);
  expect(await paneTop(page)).toBeGreaterThan(0);
  await inPane(page, row);
});

test('Documents: a deep link to a document lands in view, marked', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/documents?claim=${q('doc:D68')}`);
  const row = page.locator('.docrow[aria-current="true"]');
  await expect(row).toHaveCount(1);
  await inPane(page, row);
});

test('Checks rows carry "Confident mistake" by the same rule as the note', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/checks`);
  await expect(page.locator('[data-item="line:F540NR.72"]')).toContainText('Confident mistake');
  await expect(page.locator('[data-item="doc:D07"]')).not.toContainText('Confident mistake');
  expect((await page.request.post(`/api/w/${w}/events`, { data: { role: 'jo', type: 'clock_moved', payload: { to: lastAt() } } })).ok()).toBeTruthy();
  await page.goto(`/w/${w}/daniel/checks`);
  await expect(page.locator('[data-item="line:F8949.H.C6"]')).not.toContainText('Confident mistake');
});

test('Checks: a deep link to a line opens and brings in the row that sits on it', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks?claim=${q('line:Sch1.16')}`);
  const row = page.locator('[data-item="line:Sch1.16"]');
  await expect(row).toHaveAttribute('data-holds', '');
  await expect(row.locator('details')).toHaveAttribute('open', '');
  expect(await paneTop(page)).toBeGreaterThan(0);
  await inPane(page, row);
});

test('at phone width the pill gives way to the title (the panel note still says it)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/w/${ws()}/daniel/checks`);
  await expect(page.locator('[data-item="line:F540NR.72"]').getByText('Confident mistake')).toBeHidden();
});

test('the confident note is a callout with its own background', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks?claim=${q('finding:CHK-PAYMENT-TAX-YEAR:line:F540NR.72')}`);
  const note = page.getByTestId('confident-note');
  await expect(note).toContainText('Confidence gave no warning.');
  const bg = await note.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
});
