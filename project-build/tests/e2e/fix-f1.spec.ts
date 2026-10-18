// Fix round F1 (app review 1, 17 Oct 2026): screen-level regressions. Ids and names may appear in tests.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ws = () => `e2e-f1-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const CA_EST = 'line:F540NR.72';
type Packet = { timeline: { at: string; event: string }[]; firm: { staff: { id: string; name: string }[]; assignment_at_start: Record<string, string> } };
const packet = (): Packet => JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'packet.json'), 'utf8')) as Packet;
const staffName = (seat: string) => { const p = packet(); return p.firm.staff.find((s) => s.id === p.firm.assignment_at_start[seat])!.name; };
const lastAt = () => packet().timeline.map((t) => t.at).sort().pop()!;

async function adjust(page: Page, w: string) {
  const res = await page.request.post(`/api/w/${w}/events`, {
    data: { role: 'daniel', type: 'adjustment', claimId: CA_EST, payload: { value: 10500, reason: 'The 15 Sep 2025 payment is designated tax year 2024 (D68).' } },
  });
  expect(res.ok()).toBeTruthy();
}
async function moveClock(page: Page, w: string, to: string) {
  expect((await page.request.post(`/api/w/${w}/events`, { data: { role: 'jo', type: 'clock_moved', payload: { to } } })).ok()).toBeTruthy();
}

test('item 2: compare with Finalized keeps the engine value in the v3 column', async ({ page }) => {
  const w = ws();
  await adjust(page, w);
  await page.goto(`/w/${w}/daniel/return?cmp=finalized&only=changed`);
  const row = page.locator('tr', { has: page.locator('[data-line="F540NR.72"]') });
  const cells = row.locator('td');
  await expect(cells.nth(1)).toContainText('14,000');
  await expect(cells.nth(1)).not.toContainText('10,500');
  await expect(cells.nth(2)).toContainText('10,500');
  // The adjustment flows through: total payments (F540NR.78) and the overpayment (F540NR.97) are recomputed with it.
  await expect(page.getByRole('main')).toContainText('3 lines differ between Finalized and v3');
});

test('item 3: Review and its Changes tab name the person and lead with story time', async ({ page }) => {
  const w = ws();
  await adjust(page, w);
  const name = staffName('reviewer');
  await page.goto(`/w/${w}/daniel/review`);
  const change = page.locator('section[aria-label="Changes"]');
  await expect(change).toContainText(name);
  await expect(change).not.toContainText(/\bdaniel\b/);
  await expect(change).toContainText('Jun 2026');
  await page.goto(`/w/${w}/daniel/review?tab=log`);
  const log = page.locator('section[aria-label="Change log"]');
  await expect(log).toContainText(name);
  await expect(log).not.toContainText(/\bdaniel\b/);
  await expect(log).toContainText('Jun 2026');
  await expect(log).not.toContainText(/\b\d{2} (Oct|Nov|Dec) 202[6-9]\b/); // the wall clock of this run is not shown as the main time
});

test('item 4: Home after filing has no approval queue; Sam and next year see their work', async ({ page }) => {
  const w = ws();
  await moveClock(page, w, lastAt());
  await page.goto(`/w/${w}/sam`);
  const main = page.getByRole('main');
  await expect(main).not.toContainText(/blockers first|Blocking approval/i);
  await expect(main.locator('section[aria-label="As filed"]')).toBeVisible();
  await expect(main).toContainText(/quality review/i);
  await page.goto(`/w/${w}/next`);
  await expect(main).not.toContainText(/blockers first|Blocking approval/i);
  await expect(main.locator('section[aria-label="As filed"]')).toBeVisible();
  await expect(main).toContainText(/Carryovers/);
  await expect(main).toContainText(/Open items/);
});

test('item 5: no finding drawer shows raw JSON evidence', async ({ page }) => {
  const w = ws();
  await moveClock(page, w, lastAt());
  await page.goto(`/w/${w}/daniel/checks`);
  const ids = await page.locator('[data-finding]').evaluateAll((els) => els.map((e) => e.getAttribute('data-finding')!));
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    await page.goto(`/w/${w}/daniel/checks?claim=finding:${id}`);
    const drawer = page.getByTestId('drawer');
    await expect(drawer).toBeVisible();
    expect(await drawer.innerText(), id).not.toMatch(/\{"|":/);
  }
});

test('item 6: blockers listed once on Home; ledger ids off staff Checks and drawer; readable labels in the clock and on Areas', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  const blockers = await page.locator('section[aria-label="Blocking approval"] .qrow').allInnerTexts();
  expect(blockers.length).toBeGreaterThan(0);
  // The overview lists blockers once and no second list of open checks (those live on Checks).
  expect(new Set(blockers).size).toBe(blockers.length);
  await expect(page.locator('section[aria-label="Open checks"]')).toHaveCount(0);
  await page.goto(`/w/${w}/daniel/checks`);
  await expect(page.getByRole('main')).not.toContainText(/\bGT-[A-Z]\d/);
  const first = await page.locator('[data-finding]').first().getAttribute('data-finding');
  await page.goto(`/w/${w}/daniel/checks?claim=finding:${first}`);
  await expect(page.getByTestId('drawer')).not.toContainText(/Ledger:|\bGT-[A-Z]\d/);
  await moveClock(page, w, lastAt());
  // Staff Filing is retired: the timeline is the story clock's dropdown, the carryovers out are on Areas.
  await page.goto(`/w/${w}/daniel/areas`);
  const clock = page.getByRole('group', { name: 'Story clock' }).getByLabel(/Move story time to/);
  await expect(clock).toContainText('IRS transcript pulled');
  await expect(clock).not.toContainText(/Irs transcript/);
  const main = page.getByRole('main');
  await expect(main).not.toContainText(/Irs transcript|Passive 1450 fremont/);
  await expect(main).toContainText('Passive 1450 Fremont');
  await expect(main).not.toContainText(/D\d+msg-\d+/);
});

test("item 6: Marcus's Reveal reason quotes the firm rule once", async ({ page }) => {
  await page.goto(`/w/${ws()}/marcus/documents?claim=doc:D08`);
  const reason = await page.getByTestId('reveal-reason').innerText();
  const rule = 'Staff without sensitive-data clearance';
  expect(reason.split(rule).length - 1).toBe(1);
});
