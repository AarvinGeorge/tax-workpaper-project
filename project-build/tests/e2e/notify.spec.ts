import { expect, test } from '@playwright/test';

// The bell: unread count per person, an inline panel, a toast when something new arrives from another tab.
const ws = () => `e2e-bell-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test('Priya gets a toast and an unread count when Daniel leaves a note in another tab; clicking opens the number', async ({ page, request }) => {
  const w = ws();
  await page.goto(`/w/${w}/priya/checks`);
  const bell = page.getByTestId('bell');
  // At the default story clock the preparer already has the two overdue internal deadlines (packet story source).
  await expect(bell).toHaveAttribute('aria-label', 'Notifications, 2 unread');

  expect((await request.post(`/api/w/${w}/events?role=daniel`, { data: { type: 'review_note', claimId: 'line:F540NR.72', payload: { text: 'tie out', blocking: true } } })).ok()).toBe(true);

  await expect(page.getByTestId('toast')).toContainText('Daniel left a blocking review note on', { timeout: 12_000 });
  await expect(bell).toHaveAttribute('aria-label', 'Notifications, 3 unread');
  await bell.click();
  const row = page.getByTestId('bell-panel').getByRole('link').first();
  await expect(row).toContainText('Daniel left a blocking review note on');
  await row.click();
  await expect(page).toHaveURL(/claim=line(%3A|:)F540NR\.72/);
  await expect(bell).toHaveAttribute('aria-label', 'Notifications, 2 unread');
});

test('the examiner has no bell; a client sees only their own question', async ({ page, request }) => {
  const w = ws();
  await request.post(`/api/w/${w}/events?role=priya`, { data: { type: 'question_to_client', claimId: 'line:F540NR.72', payload: { to: 'erik', text: 'Which payments?' } } });
  await page.goto(`/w/${w}/erik`);
  await expect(page.getByTestId('bell')).toHaveAttribute('aria-label', 'Notifications, 1 unread');
  await page.goto(`/w/${w}/ngozi`);
  await expect(page.getByTestId('bell')).toHaveAttribute('aria-label', 'Notifications, none unread');
  await page.goto(`/w/${w}/irs`);
  await expect(page.getByTestId('bell')).toHaveCount(0);
});

test('the bell panel closes with Escape and with a click outside', async ({ page }) => {
  await page.goto(`/w/${ws()}/priya`);
  await page.getByTestId('bell').click();
  await expect(page.getByTestId('bell-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('bell-panel')).toHaveCount(0);
  await expect(page.getByTestId('bell')).toBeFocused();
  await page.getByTestId('bell').click();
  await page.locator('.sh-pane-c').click({ position: { x: 20, y: 20 } });
  await expect(page.getByTestId('bell-panel')).toHaveCount(0);
});
