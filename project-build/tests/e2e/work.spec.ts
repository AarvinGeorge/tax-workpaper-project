// Work screens (lane D2): an adjustment survives reload, the partner's approval lists blockers, Checks surfaces every
// ledger mistake (Findings left the app), and outside roles never reach the internal screens. Runs against the built app (playwright.config).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { LEDGER } from '../../src/domain/checks/catalogue';

const ws = () => `e2e-work-${Date.now().toString(36)}`;
// The California estimated payments line (ledger GT-A03). Ids may appear in tests.
const CA_EST = 'line:F540NR.72';

test('daniel adjusts California estimates; reload keeps it; Review shows original and new', async ({ page }) => {
  const w = ws();
  const res = await page.request.post(`/api/w/${w}/events`, {
    data: { role: 'daniel', type: 'adjustment', claimId: CA_EST, payload: { value: 10500, reason: 'The 15 Sep 2025 payment is designated tax year 2024 (D68).' } },
  });
  expect(res.ok()).toBeTruthy();
  await page.goto(`/w/${w}/daniel/review`);
  const change = page.getByRole('region', { name: 'Changes' }).or(page.locator('section[aria-label="Changes"]'));
  await expect(change).toContainText('10,500');
  await expect(change).toContainText('14,000');
  await page.reload();
  await expect(change).toContainText('10,500');
  await page.goto(`/w/${w}/daniel/review?tab=log`);
  await expect(page.locator('section[aria-label="Change log"]')).toContainText('15 Sep 2025 payment');
});

test("helen's approval is disabled; the blockers are a count, and a blocker on the return opens Review notes", async ({ page }) => {
  const w = ws();
  await page.request.post(`/api/w/${w}/events`, {
    data: { role: 'daniel', type: 'review_note', claimId: 'return', payload: { text: 'Hold for the RSU basis', blocking: true } },
  });
  await page.goto(`/w/${w}/helen/review`);
  await expect(page.getByRole('button', { name: 'Approve the return' })).toBeDisabled();
  const box = page.getByRole('region', { name: 'Approval', exact: true });
  await expect(box).toContainText(/\d+ items? stops? filing/);
  await box.getByRole('link', { name: /on the return itself, in Review notes/ }).click();
  await expect(page).toHaveURL(/tab=notes/);
  await expect(page.locator('section[aria-label="Review notes"]')).toContainText('Hold for the RSU basis');
});

test('every ledger mistake is a finding on Checks once the story reaches it; /findings lands on Checks', async ({ page }) => {
  const w = ws() + 'l';
  const st0 = (await (await page.request.get(`/api/w/${w}/state?role=daniel`)).json()) as { findings: { id: string; ledgerIds: string[]; firstVisibleAt?: string }[] };
  const last = st0.findings.reduce((m, f) => (f.firstVisibleAt && f.firstVisibleAt > m ? f.firstVisibleAt : m), '2026-06-23T06:05:00Z');
  expect((await page.request.post(`/api/w/${w}/events`, { data: { role: 'jo', type: 'clock_moved', payload: { to: last } } })).ok()).toBeTruthy();
  const st = (await (await page.request.get(`/api/w/${w}/state?role=daniel`)).json()) as typeof st0;
  await page.goto(`/w/${w}/daniel/findings`);
  await expect(page).toHaveURL(/\/daniel\/checks$/);
  for (const l of LEDGER) {
    const ids = [l.id, ...((l as { aliases?: string[] }).aliases ?? [])];
    const hit = st.findings.find((f) => f.ledgerIds.some((i) => ids.includes(i)));
    expect(hit, `${l.id} is caught by a check`).toBeTruthy();
    await expect(page.locator(`[data-finding="${hit!.id}"]`), `${l.id} on Checks`).toHaveCount(1);
  }
});

test('bulk sign-off is undone in one step', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/priya/checks`);
  const boxes = page.locator('[data-finding] input[type="checkbox"]');
  test.skip((await boxes.count()) < 2, 'needs at least two open findings');
  // Each sign-off needs its review note, written in the row (typing it ticks the row).
  for (let i = 0; i < 2; i++) {
    const row = page.locator('[data-finding]').filter({ has: page.locator('input[type="checkbox"]') }).nth(i);
    await row.locator('summary').click();
    await row.locator('[data-signoff-note]').fill(`Reviewed row ${i + 1}`);
  }
  await page.getByRole('button', { name: 'Sign off selected (2)' }).click();
  await expect(page.getByRole('status')).toContainText('2 sign-offs saved together');
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('clients and the examiner never see internal work screens', async ({ page }) => {
  const w = ws();
  // Every screen outside the roles' own list (home, documents, filing), the Return included: a typed URL must refuse.
  for (const role of ['ngozi', 'erik', 'irs']) {
    for (const screen of ['return', 'checks', 'review', 'changes', 'whatifs', 'areas', 'findings']) { // findings and changes redirect to refusing screens
      await page.goto(`/w/${w}/${role}/${screen}`);
      // The screen refuses ("Not part of this view"), or the shell holds a role that has not joined the story yet.
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(/Not part of this view|Not yet in the story/);
      await expect(page.getByRole('main')).not.toContainText(/Blocking stops filing|Engine warning|Compare v3 with/);
    }
    // The old Firm address opens the "?" dialog, which holds no firm reference for these roles.
    await page.goto(`/w/${w}/${role}/firm`);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).not.toContainText(/Firm standards|People and clearance|Time against budget|View log/);
  }
});

test('marcus sees no full identifiers on Areas', async ({ page }) => {
  await page.goto(`/w/${ws()}/marcus/areas`);
  const html = await page.content();
  expect(html).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/);
});

// Signature PINs from the packet's timeline (read here, never printed): no outside view may contain them.
type Tl = { at: string; detail: string | null };
const timeline = (): Tl[] => (JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'packet.json'), 'utf8')) as { timeline: Tl[] }).timeline;
async function pins(): Promise<string[]> {
  return timeline().flatMap((t) => (t.detail ?? '').match(/PIN (\d+)/g) ?? []).map((x) => x.split(' ')[1]);
}

test('client Filing is plain words: e-file status, no internal text, no PINs', async ({ page }) => {
  const w = ws();
  const last = timeline().map((t) => t.at).sort().pop()!;
  expect((await page.request.post(`/api/w/${w}/events`, { data: { role: 'jo', type: 'clock_moved', payload: { to: last } } })).ok()).toBeTruthy();
  await page.goto(`/w/${w}/ngozi/filing`);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Filing your return');
  await expect(main).toContainText('Accepted by the IRS');
  const text = await main.innerText();
  for (const pin of await pins()) expect(text).not.toContain(pin);
  expect(text).not.toMatch(/\bv[123]\b|Submission|Carryovers|Related returns|tl-\d/);
});

test("examiner Filing shows the Letter 566 items and the return as filed, no PINs", async ({ page }) => {
  const w = ws();
  const last = timeline().map((t) => t.at).sort().pop()!;
  await page.request.post(`/api/w/${w}/events`, { data: { role: 'jo', type: 'clock_moved', payload: { to: last } } });
  await page.goto(`/w/${w}/irs/filing`);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Items under examination');
  await expect(main).toContainText('return as filed');
  const text = await main.innerText();
  for (const pin of await pins()) expect(text).not.toContain(pin);
  expect(text).not.toMatch(/Timeline to story time|Carryovers|review note/i);
});
