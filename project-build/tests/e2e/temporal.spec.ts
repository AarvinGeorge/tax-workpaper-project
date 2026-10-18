import { expect, test, type Page } from '@playwright/test';

// The whole return follows the story clock: at time T the screens show the latest version computed by then.
const ws = () => `e2e-tmp-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const move = (page: Page, w: string, role: string, to: string) =>
  page.request.post(`/api/w/${w}/events?role=${role}`, { data: { type: 'clock_moved', payload: { to } } });
const versionLabel = (page: Page) => page.locator('span', { has: page.locator('span.muted', { hasText: /^Version$/ }) }).first();

test('the overview at default, at 14 Apr (v2) and before the first computation', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  const kpis = page.getByTestId('kpis');
  await expect(kpis).toContainText('81,962');
  await expect(kpis).toContainText('18,874');
  await expect(versionLabel(page)).toContainText('v3');

  expect((await move(page, w, 'jo', '2026-04-14T12:00:00Z')).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel`);
  await expect(kpis).toContainText('77,470');
  await expect(kpis).toContainText('17,999');
  await expect(versionLabel(page)).toContainText('v2');

  expect((await move(page, w, 'jo', '2026-03-02T00:00:00Z')).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel`);
  await expect(page.getByRole('main')).toContainText('No return computed yet: the engine first ran on 4 Mar 2026');
  await expect(page.getByTestId('not-computed')).toBeVisible();
});

test('before the first computation every main screen renders', async ({ page }) => {
  const w = ws();
  expect((await move(page, w, 'jo', '2026-03-02T00:00:00Z')).ok()).toBe(true);
  for (const path of ['', '/checks', '/review', '/filing']) {
    const res = await page.goto(`/w/${w}/daniel${path}`);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole('main')).toBeVisible();
  }
});

test('a client may move the clock', async ({ page }) => {
  const w = ws();
  expect((await move(page, w, 'ngozi', '2026-04-14T12:00:00Z')).ok()).toBe(true);
  const s = (await (await page.request.get(`/api/w/${w}/state?role=ngozi`)).json()).state;
  expect(s.storyAt).toBe('2026-04-14T12:00:00Z');
});
