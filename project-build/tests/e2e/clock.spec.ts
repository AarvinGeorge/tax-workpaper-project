import { expect, test } from '@playwright/test';

// The story clock replays the season; the past is view-only, so the filed return cannot be rewritten through it.
const ws = () => `e2e-clk-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const LINE = 'line:F1040.26';

test('the filed return never changes: a rewind is for looking, and acting waits for the latest point reached', async ({ page }) => {
  const w = ws();
  const post = (role: string, body: object) => page.request.post(`/api/w/${w}/events`, { data: { role, ...body } });
  const state = async () => (await (await page.request.get(`/api/w/${w}/state?role=daniel`)).json()).state;
  expect((await post('jo', { type: 'clock_moved', payload: { to: '2026-07-15T02:10:00Z' } })).ok()).toBe(true);
  expect((await post('jo', { type: 'clock_moved', payload: { to: '2026-06-23T06:05:00Z' } })).ok()).toBe(true);
  const r = await post('daniel', { type: 'adjustment', claimId: LINE, payload: { value: 12000, reason: 'rewrite the past' } });
  expect(r.status()).toBe(403);
  expect((await r.json()).reason).toMatch(/earlier point in the story/);
  // On screen: the reason, and the clock still movable.
  await page.goto(`/w/${w}/daniel/return?claim=${LINE}`);
  const acts = page.getByTestId('drawer-actions');
  await expect(acts.getByRole('button', { name: 'Adjust', exact: true })).toBeDisabled();
  await expect(acts).toContainText(/earlier point in the story/);
  await page.goto(`/w/${w}/jo`);
  await expect(page.getByLabel(/Move story time to/)).toBeEnabled(); // the clock stays free while rewound
  expect((await post('jo', { type: 'clock_moved', payload: { to: '2026-07-15T02:10:00Z' } })).ok()).toBe(true);
  const s = await state();
  expect(s.frozen).toBe(true);
  expect(s.claims[LINE]?.adjusted ?? false).toBe(false);
});
