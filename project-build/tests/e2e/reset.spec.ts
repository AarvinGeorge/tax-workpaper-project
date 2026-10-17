import { expect, test } from '@playwright/test';

// Reset: one button takes every open tab on the workspace back to the pipeline output at the start of review.
const ws = () => `e2e-reset-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test('reset brings every tab back to the pipeline output at the start of review', async ({ page, context, request }) => {
  const w = ws();
  const post = (role: string, body: object) => request.post(`/api/w/${w}/events?role=${role}`, { data: body });
  expect((await post('daniel', { type: 'review_note', claimId: 'line:F540NR.72', payload: { text: 'tie out', blocking: true } })).ok()).toBe(true);
  expect((await post('jo', { type: 'clock_moved', payload: { to: '2026-07-20T15:00:00Z' } })).ok()).toBe(true);

  await page.goto(`/w/${w}/daniel/checks?claim=line:F540NR.72`);
  await expect(page.locator('.sh-story')).toContainText('20 Jul 2026');
  await page.goto(`/w/${w}/daniel`);
  await page.getByTestId('start-here').getByRole('button', { name: 'Dismiss' }).click();
  const other = await context.newPage();
  await other.goto(`/w/${w}/marcus`);
  await expect(other.locator('.sh-hist')).not.toHaveCount(0);

  await page.goto(`/w/${w}/daniel/checks?claim=line:F540NR.72`);
  await page.getByRole('button', { name: 'Reset to start' }).click();
  await page.getByRole('button', { name: 'Confirm reset' }).click();

  await expect(page).toHaveURL(new RegExp(`/w/${w}/daniel$`));
  await expect(page.getByText('Nothing recorded in this workspace yet.')).toBeVisible();
  await expect(page.locator('.sh-story')).toContainText('23 Jun 2026');
  await expect(page.getByTestId('start-here')).toBeVisible();
  // The other tab follows on its next poll.
  await expect(other.getByText('Nothing recorded in this workspace yet.')).toBeVisible({ timeout: 12_000 });
});

test('reset asks for confirmation and can be cancelled', async ({ page, request }) => {
  const w = ws();
  await request.post(`/api/w/${w}/events?role=daniel`, { data: { type: 'review_note', claimId: 'line:F540NR.72', payload: { text: 'keep me' } } });
  await page.goto(`/w/${w}/daniel`);
  await page.getByRole('button', { name: 'Reset to start' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.sh-hist')).toHaveCount(1);
});
