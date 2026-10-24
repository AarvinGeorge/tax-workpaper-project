// Review memo: a printable snapshot on Review once the partner approves (staff only), from the projected state.
import { readFileSync } from 'node:fs';
import { explainFirmSteps } from './steps-helper';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const ws = (n: string) => `e2e-memo-${n}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const post = (rq: APIRequestContext, w: string, role: string, data: Record<string, unknown>) =>
  rq.post(`/api/w/${w}/events`, { data: { role, ...data } });
const CAPTION = 'Prints the review memo. Planned: the full review record, ready to hand over when an examiner asks for documents.';
const SSN = /\b\d{3}-\d{2}-\d{4}\b/;
// The firm's Form 8879 record carries both spouses' PINs in its detail: its digit runs (5 or more digits) must never
// reach the page. Read here only to test for their absence; never printed (the message names no digits).
const PIN_RUNS: string[] = (() => {
  const p = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'packet.json'), 'utf8')) as { timeline: { event: string; detail?: unknown }[] };
  return p.timeline.filter((t) => /8879/.test(t.event)).flatMap((t) => String(t.detail ?? '').match(/\d{5,}/g) ?? []);
})();
async function noPins(page: Page) {
  expect(PIN_RUNS.length, 'the 8879 record has digit runs to test for').toBeGreaterThan(0);
  const html = await page.content();
  expect(PIN_RUNS.filter((d) => html.includes(d)).length, 'PIN digits on the page').toBe(0);
}
const REASON = 'The 15 Sep 2025 payment is designated tax year 2024 (D68).';

// The dry-run path through the API: the change, its partner sign-off, every finding blocker cleared, then (optionally)
// the approval and both signatures.
async function dryRun(rq: APIRequestContext, w: string, approve = true) {
  expect((await post(rq, w, 'daniel', { type: 'adjustment', claimId: 'line:F540NR.72', payload: { value: 10500, reason: REASON } })).ok()).toBeTruthy();
  expect((await post(rq, w, 'helen', { type: 'signoff', claimId: 'line:F540NR.72', payload: { level: 'partner', note: 'Checked D68: the September payment is for 2024.' } })).ok()).toBeTruthy();
  const st = await (await rq.get(`/api/w/${w}/state?role=helen`)).json() as { state: { blockers: { claimId: string }[] } };
  await explainFirmSteps(rq, w); // every firm step item explained (src/domain/steps.ts)
  for (const b of st.state.blockers) {
    if (b.claimId.startsWith('finding:')) expect((await post(rq, w, 'daniel', { type: 'finding_cleared', claimId: b.claimId, payload: { reason: 'Reviewed for this test.' } })).ok()).toBeTruthy();
  }
  if (!approve) return;
  const r = await post(rq, w, 'helen', { type: 'signoff', claimId: 'return', payload: { scope: 'return', level: 'partner', value: 'v3' } });
  expect(r.ok(), await r.text()).toBeTruthy();
}

test('before approval the button is disabled with its reason; the caption is always there', async ({ page }) => {
  const w = ws('pre');
  await page.goto(`/w/${w}/helen/review`);
  const box = page.locator('section[aria-label="Approval"]');
  await expect(box.getByRole('button', { name: 'Review memo' })).toBeDisabled();
  await expect(box).toContainText('Available once the partner approves the return');
  await expect(box.getByText(CAPTION)).toBeVisible();
  // A staff member typing the address before approval goes back to Review.
  await page.goto(`/w/${w}/daniel/review/memo`);
  await expect(page).toHaveURL(new RegExp(`/w/${w}/daniel/review$`));
});

test('after approval the memo opens and shows the figures, the change, its reason and both signatures', async ({ page }) => {
  const rq = page.request;
  const w = ws('post');
  await dryRun(rq, w);
  const sign = async (who: string) => {
    await page.goto(`/w/${w}/${who}/filing`);
    await page.getByTestId('client-signing').getByRole('button', { name: /Approve and sign/ }).click();
    await expect(page.getByTestId(`signature-${who}`)).toContainText('You signed Form 8879 and FTB 8879');
  };
  await sign('ngozi');
  await sign('erik');

  await page.goto(`/w/${w}/daniel/review`);
  await expect(page.locator('section[aria-label="Approval"]').getByText(CAPTION)).toBeVisible();
  await page.getByRole('link', { name: 'Review memo' }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${w}/daniel/review/memo$`));
  const memo = page.getByTestId('memo');
  await expect(memo).toContainText('23,630');
  await expect(memo).toContainText('Refund 4,756');
  await expect(memo).toContainText(REASON);
  await expect(memo).toContainText(/v3 plus 1 adjustment/);
  await expect(memo).toContainText(/Approved by Helen/);
  for (const name of ['Ngozi', 'Erik']) await expect(memo.getByTestId('memo-signatures')).toContainText(new RegExp(`${name}[^\\n]*signed`, 'i'));
  await expect(memo).toContainText('Total payments');
  await expect(memo).toContainText('Cleared: Reviewed for this test.');
  await expect(memo).toContainText(/Partner sign-off by Helen/);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(SSN);
  expect(text).not.toMatch(/PIN\s*\d{4,}/);
  await noPins(page);

  // Print: no shell chrome, nothing held to one viewport, so every page of the memo prints.
  await page.emulateMedia({ media: 'print' });
  for (const sel of ['.sh-head', '.sh-story', '.sh-banner', '.sh-pane-l']) await expect(page.locator(sel)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeHidden();
  const css = await page.evaluate(() => ['.wp', '.sh-pane-c'].map((s) => getComputedStyle(document.querySelector(s)!).overflowY));
  expect(css).toEqual(['visible', 'visible']);
  // Letter less the 0.6in page margins: 7.3in by 9.8in of content at 96px an inch. Measured at that width, the memo
  // prints on as many pages as its height needs: no fewer (nothing clipped), and no more (no section pushed whole).
  await page.setViewportSize({ width: Math.round(7.3 * 96), height: Math.round(9.8 * 96) });
  const height = await memo.evaluate((el) => el.getBoundingClientRect().height);
  const pdf = (await page.pdf({ format: 'Letter' })).toString('latin1');
  const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBe(Math.ceil(height / (9.8 * 96)));
});

test('clients and the examiner get no memo: no button, and the address refuses', async ({ page }) => {
  const w = ws('out');
  await dryRun(page.request, w);
  for (const role of ['ngozi', 'irs']) {
    await page.goto(`/w/${w}/${role}/review/memo`);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(/Not part of this view|Not yet in the story/);
    await expect(page.getByTestId('memo')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Review memo' })).toHaveCount(0);
  }
});

test('a change after approval disables the memo until the partner approves again', async ({ page }) => {
  const w = ws('stale');
  await dryRun(page.request, w);
  expect((await post(page.request, w, 'daniel', { type: 'adjustment', claimId: 'line:F1040.1a', payload: { value: 213400, reason: 'Corrected W-2 for this test.' } })).ok()).toBeTruthy();
  await page.goto(`/w/${w}/helen/review`);
  await expect(page.getByRole('button', { name: 'Review memo' })).toBeDisabled();
  await expect(page.locator('section[aria-label="Approval"]')).toContainText('The return changed after approval; approve again');
});

test('at 16 Jul the memo is available from the firm’s record, with no approver named', async ({ page }) => {
  const w = ws('record');
  expect((await post(page.request, w, 'jo', { type: 'clock_moved', payload: { to: '2026-07-16T00:00:00Z' } })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel/review`);
  await page.getByRole('link', { name: 'Review memo' }).click();
  const memo = page.getByTestId('memo');
  await expect(memo).toContainText(/Approved per the firm’s record: the clients signed Form 8879 on 10 Jul 2026\. No partner approval event in this workspace\./);
  await noPins(page);
  expect(await page.locator('body').innerText()).not.toMatch(SSN);
});
