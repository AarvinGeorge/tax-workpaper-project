// Gaps the acceptance walk found (G1-G5): decision authority and adjustment reasons shown; undo of a bulk group from
// Review's Changes tab; Checks header counts exclude cleared findings; notes on documents; the partner sign-off flag in the panel.
import { readFileSync } from 'node:fs';
import { explainFirmSteps } from './steps-helper';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ws = () => `e2e-gap-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const CA_EST = 'line:F540NR.72';
const post = (page: Page, w: string, role: string, data: Record<string, unknown>) =>
  page.request.post(`/api/w/${w}/events`, { data: { role, ...data } });
const state = async (page: Page, w: string, role: string) => (await (await page.request.get(`/api/w/${w}/state?role=${role}`)).json());

test('G1: Changes shows a decision\'s authority and an adjustment\'s reason', async ({ page }) => {
  const w = ws();
  expect((await post(page, w, 'daniel', { type: 'decision', claimId: CA_EST, payload: { kind: 'judgment', text: 'Keep as filed.', authority: 'IRC 6654 (gap test)' } })).ok()).toBe(true);
  expect((await post(page, w, 'daniel', { type: 'adjustment', claimId: CA_EST, payload: { value: 10500, reason: 'Payment designated for 2024 (gap test)' } })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel/review?tab=log`);
  await expect(page.locator('section[aria-label="Change log"]')).toContainText('Authority: IRC 6654 (gap test)');
  await expect(page.locator('section[aria-label="Change log"]')).toContainText('Payment designated for 2024 (gap test)');
});

test('G2: undo from Changes on a bulk entry reverses the whole group', async ({ page }) => {
  const w = ws();
  const st0 = await state(page, w, 'daniel');
  const ids: string[] = st0.findings.filter((f: { source?: string }) => f.source !== 'ai').slice(0, 3).map((f: { id: string }) => 'finding:' + f.id);
  const groupId = 'bulk-gaptest';
  for (const claimId of ids) expect((await post(page, w, 'daniel', { type: 'signoff', claimId, groupId, payload: { level: 'reviewer', bulk: true, note: 'Checked' } })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel/review?tab=log`);
  const undo = page.locator('section[aria-label="Change log"]').getByRole('button', { name: 'Undo all 3' });
  await expect(undo).toHaveCount(3);
  await undo.first().click();
  await expect(page.locator('section[aria-label="Change log"]').getByRole('button', { name: 'Undo all 3' })).toHaveCount(0);
  const st = await state(page, w, 'daniel');
  const undos = st.state.events.filter((e: { type: string }) => e.type === 'undo');
  expect(undos).toHaveLength(1);
  expect(undos[0].groupId).toBe(groupId);
});

test('G3: the Checks header counts no cleared blockers', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/checks`);
  await expect(page.locator('main')).not.toContainText(/\b0 blockers/);
  const st = await state(page, w, 'helen');
  await explainFirmSteps(page.request, w); // every firm step item explained (src/domain/steps.ts)
  for (const b of st.state.blockers as { claimId: string }[]) {
    if (b.claimId.startsWith('finding:')) expect((await post(page, w, 'daniel', { type: 'finding_cleared', claimId: b.claimId, payload: { reason: 'gap test' } })).ok()).toBe(true);
  }
  await page.goto(`/w/${w}/daniel/checks`);
  await expect(page.locator('main')).toContainText(/\b0 blockers/);
});

test('G4: a client adds a note to her own document; staff see it as evidence with who and when', async ({ page }) => {
  const w = ws();
  const packet = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'packet.json'), 'utf8')) as { documents: { id: string; belongs_to: string | null; received_at: string }[] };
  const doc = packet.documents.filter((d) => d.belongs_to === 'joint').sort((a, b) => a.received_at.localeCompare(b.received_at))[0].id;
  await page.goto(`/w/${w}/ngozi/documents?claim=doc:${doc}`);
  const form = page.getByTestId('doc-note');
  await expect(form.getByRole('textbox')).toBeVisible();
  await form.getByRole('textbox').fill('Gap test: this is the signed copy.');
  await form.getByRole('button', { name: 'Add the note' }).click();
  const notes = page.getByTestId('doc-notes');
  await expect(notes).toContainText('Gap test: this is the signed copy.');
  await page.goto(`/w/${w}/daniel/documents?claim=doc:${doc}`);
  await expect(page.getByTestId('doc-notes')).toContainText('Gap test: this is the signed copy.');
  await expect(page.getByTestId('doc-notes')).toContainText('Ngozi');
});

test('G5: a large adjustment says it needs partner sign-off until the partner signs', async ({ page }) => {
  const w = ws();
  expect((await post(page, w, 'daniel', { type: 'adjustment', claimId: CA_EST, payload: { value: 10500, reason: 'D68' } })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel/return?claim=${CA_EST}`);
  await expect(page.getByTestId('drawer')).toContainText('Needs partner sign-off (tax effect over 1,000)');
  expect((await post(page, w, 'helen', { type: 'signoff', claimId: CA_EST, payload: { note: 'Agreed to the FTB account' } })).ok()).toBe(true);
  await page.reload();
  await expect(page.getByTestId('drawer')).not.toContainText('Needs partner sign-off');
});
