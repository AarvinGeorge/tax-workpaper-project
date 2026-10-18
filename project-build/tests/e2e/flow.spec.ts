// Flow-through: an adjustment moves the totals that depend on it, so the client signs the figures the firm changed;
// a change past a tax computation says "Needs engine re-run" and the partner cannot approve until the engine re-runs.
import { expect, test, type APIRequestContext } from '@playwright/test';

const ws = (n: string) => `e2e-flow-${n}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const post = (rq: APIRequestContext, w: string, role: string, data: Record<string, unknown>) =>
  rq.post(`/api/w/${w}/events`, { data: { role, ...data } });

test('the dry-run path: California payments cut to 10,500 reach the client signing table and the overview', async ({ page }) => {
  const rq = page.request;
  const w = ws('ca');
  expect((await post(rq, w, 'daniel', { type: 'adjustment', claimId: 'line:F540NR.72', payload: { value: 10500, reason: 'The 15 Sep 2025 payment is designated tax year 2024 (D68).' } })).ok()).toBeTruthy();
  expect((await post(rq, w, 'helen', { type: 'signoff', claimId: 'line:F540NR.72', payload: { level: 'partner', note: 'Checked D68: the September payment is for 2024.' } })).ok()).toBeTruthy();
  const st = await (await rq.get(`/api/w/${w}/state?role=helen`)).json() as { state: { blockers: { claimId: string; title: string }[] } };
  expect(st.state.blockers.some((b) => /engine/i.test(b.title))).toBe(false);
  for (const b of st.state.blockers) {
    if (b.claimId.startsWith('finding:')) expect((await post(rq, w, 'daniel', { type: 'finding_cleared', claimId: b.claimId, payload: { reason: 'Reviewed for this test.' } })).ok()).toBeTruthy();
  }
  const r = await post(rq, w, 'helen', { type: 'signoff', claimId: 'return', payload: { scope: 'return', level: 'partner', value: 'v3' } });
  expect(r.ok(), await r.text()).toBeTruthy();

  await page.goto(`/w/${w}/ngozi/filing`);
  const table = page.getByTestId('client-signing').getByRole('table', { name: 'The amounts you are signing for' });
  const ca = table.locator('tr', { hasText: 'California' });
  await expect(ca).toContainText('23,630');
  await expect(ca).toContainText('Refund 4,756');
  await expect(page.getByTestId('needs-engine-note')).toHaveCount(0);

  // The overview: the same California figures, recomputed, with the engine value as "was".
  await page.goto(`/w/${w}/daniel/return?open=F540NR`);
  await expect(page.getByTestId('kpis')).toContainText(/v3 plus 1 adjustment/);
  await expect(page.getByTestId('kpis')).not.toContainText(/need the engine|Needs engine re-run/);
  for (const [line, now, was] of [['F540NR.78', '23,630', '27,130'], ['F540NR.97', '4,756', '8,256']]) {
    const row = page.locator('tr', { has: page.locator(`[data-line="${line}"]`) });
    await expect(row.locator('td').nth(1)).toContainText(now);
    await expect(row.locator('td').nth(1)).toContainText(`was ${was}`);
    await expect(row).toContainText('Recomputed');
  }
  await page.goto(`/w/${w}/daniel/return?claim=${encodeURIComponent('line:F540NR.97')}`);
  await expect(page.getByTestId('claim-value')).toHaveText('4,756');
  await expect(page.getByTestId('flow-note')).toContainText('Recomputed from the adjustment to');
});

test('a wage change: the federal tax card says "Needs engine re-run" and the partner cannot approve', async ({ page }) => {
  const rq = page.request;
  const w = ws('wage');
  expect((await post(rq, w, 'daniel', { type: 'adjustment', claimId: 'line:F1040.1a', payload: { value: 222400, reason: 'Corrected W-2 for this test.' } })).ok()).toBeTruthy();
  await page.goto(`/w/${w}/daniel`);
  const fed = page.getByTestId('kpis').locator('.kpi', { hasText: 'Federal tax' });
  await expect(fed).toContainText('Needs engine re-run');
  await expect(fed).toContainText(/v3 plus 1 adjustment; \d+ figures need the engine/);
  // AGI is a plain sum: recomputed, no tag.
  const agi = page.getByTestId('kpis').locator('.kpi', { hasText: 'Adjusted gross income' });
  await expect(agi).toContainText('455,590');
  await expect(agi).not.toContainText('Needs engine re-run');

  const r = await post(rq, w, 'helen', { type: 'signoff', claimId: 'return', payload: { scope: 'return', level: 'partner', value: 'v3' } });
  expect(r.status()).toBe(403);
  expect(await r.text()).toMatch(/Needs engine re-run/);
  await page.goto(`/w/${w}/helen/review`);
  await expect(page.getByRole('button', { name: 'Approve the return' })).toBeDisabled();
  await expect(page.getByRole('main')).toContainText(/Re-run the engine: \d+ figures depend on changes it has not computed/);
});

async function clearFindings(rq: APIRequestContext, w: string) {
  const st = await (await rq.get(`/api/w/${w}/state?role=helen`)).json() as { state: { blockers: { claimId: string }[] } };
  for (const b of st.state.blockers) {
    if (b.claimId.startsWith('finding:')) expect((await post(rq, w, 'daniel', { type: 'finding_cleared', claimId: b.claimId, payload: { reason: 'Reviewed for this test.' } })).ok()).toBeTruthy();
  }
}

test('a change after the partner approved: the clients cannot sign, and their page says why', async ({ page }) => {
  const rq = page.request;
  const w = ws('stale');
  await clearFindings(rq, w);
  const a = await post(rq, w, 'helen', { type: 'signoff', claimId: 'return', payload: { scope: 'return', level: 'partner', value: 'v3' } });
  expect(a.ok(), await a.text()).toBeTruthy();
  expect((await post(rq, w, 'daniel', { type: 'adjustment', claimId: 'line:F1040.1a', payload: { value: 213400, reason: 'Corrected W-2 for this test.' } })).ok()).toBeTruthy();
  const r = await post(rq, w, 'ngozi', { type: 'client_signature', claimId: 'return', payload: { forms: ['8879', 'FTB 8879'], value: 'x' } });
  expect(r.status()).toBe(403);
  expect(await r.text()).toMatch(/changed the return after approving it/);
  await page.goto(`/w/${w}/ngozi/filing`);
  const box = page.getByTestId('client-signing');
  await expect(box).toContainText('Your tax team changed the return after approving it');
  await expect(box.getByRole('button', { name: /Approve and sign/ })).toBeDisabled();
});

test('a wage change: Checks, the overview and Review count the same blockers, and Checks lists the engine lines', async ({ page }) => {
  const rq = page.request;
  const w = ws('count');
  expect((await post(rq, w, 'daniel', { type: 'adjustment', claimId: 'line:F1040.1a', payload: { value: 222400, reason: 'Corrected W-2 for this test.' } })).ok()).toBeTruthy();
  const st = await (await rq.get(`/api/w/${w}/state?role=helen`)).json() as { state: { blockers: { claimId: string; title: string }[] } };
  const n = st.state.blockers.length;
  const engine = st.state.blockers.filter((b) => /^Needs engine re-run/.test(b.title));
  expect(engine.length).toBeGreaterThan(0);
  await page.goto(`/w/${w}/daniel`);
  await expect(page.getByRole('main')).toContainText(`${n} items stop filing`);
  await page.goto(`/w/${w}/helen/review`);
  await expect(page.locator('section[aria-label="Approval"]')).toContainText(`${n} blockers`);
  await page.goto(`/w/${w}/daniel/checks`);
  await expect(page.getByRole('main')).toContainText(`${n} blockers`);
  const rows = page.locator('[data-engine-blocker]');
  await expect(rows).toHaveCount(engine.length);
  await rows.first().getByRole('link').first().click();
  await expect(page.getByTestId('drawer')).toContainText('Needs engine re-run');
});

test('the estimate on a needs-engine line names the adjustment it depends on and counts only that one', async ({ page }) => {
  const rq = page.request;
  const w = ws('est');
  expect((await post(rq, w, 'daniel', { type: 'adjustment', claimId: 'line:F1040.1a', payload: { value: 222400, reason: 'Corrected W-2.', category: 'wages' } })).ok()).toBeTruthy();
  expect((await post(rq, w, 'daniel', { type: 'adjustment', claimId: 'line:F540NR.72', payload: { value: 10500, reason: 'D68.' } })).ok()).toBeTruthy();
  await page.goto(`/w/${w}/daniel/return?claim=${encodeURIComponent('line:F1040.24')}`);
  const note = page.getByTestId('flow-note');
  await expect(note).toContainText(/Estimated effect of the adjustment to Wages \(Forms W-2, box 1\): federal/);
  await expect(note).not.toContainText('estimated tax payments');
});
