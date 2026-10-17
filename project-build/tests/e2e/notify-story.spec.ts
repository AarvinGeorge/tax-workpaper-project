import { expect, test } from '@playwright/test';

// The packet's own story as notifications: derived from the story clock, never stored. Moving the clock makes a
// notice appear (with a toast in an open tab); Home's "Since you last looked" shares the bell's read state.
const ws = () => `e2e-story-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const moveClock = (request: import('@playwright/test').APIRequestContext, w: string, to: string) =>
  request.post(`/api/w/${w}/events?role=jo`, { data: { type: 'clock_moved', payload: { to } } });

test('Ngozi gets the e-file rejection in plain words once the clock passes 13 Jul 17:04', async ({ page, request }) => {
  const w = ws();
  await page.goto(`/w/${w}/ngozi`);
  const bell = page.getByTestId('bell');
  await expect(bell).toHaveAttribute('aria-label', 'Notifications, none unread');
  await expect(page.getByTestId('since-last-looked')).toContainText('Nothing new since you last looked.');

  expect((await moveClock(request, w, '2026-07-13T18:00:00Z')).ok()).toBe(true);
  await page.reload(); // a client tab does not yet follow a clock move on its own: see the fixme below

  await expect(bell).toHaveAttribute('aria-label', 'Notifications, 1 unread');
  const since = page.getByTestId('since-last-looked');
  await expect(since).toContainText('The IRS returned your return; we need a document from you');
  await expect(since).not.toContainText(/name control|PIN/);
  // Reading it in the bell clears it from Home too: one read state.
  await bell.click();
  await page.getByTestId('bell-panel').getByRole('button', { name: 'Mark all read' }).click();
  await expect(bell).toHaveAttribute('aria-label', 'Notifications, none unread');
  await expect(since).toContainText('Nothing new since you last looked.');
});

test('an open staff tab toasts the rejection when the clock moves past it', async ({ page, request }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel`);
  await expect(page.getByTestId('bell')).toHaveAttribute('aria-label', 'Notifications, none unread');
  expect((await moveClock(request, w, '2026-07-13T18:00:00Z')).ok()).toBe(true);
  await expect(page.getByTestId('toast')).toContainText('The IRS rejected the federal e-file', { timeout: 12_000 });
  await expect(page.getByTestId('toast')).not.toContainText(/PIN|\d{3}-\d{2}-\d{4}/);
});

// Known gap (outside this lane's files): the poll compares the role's own lastSeq, and a client's projection holds no
// clock_moved events, so an open client tab never re-renders when Jo moves the clock or resets. Fix in
// stateResponse (count clock_moved and workspace_reset seqs for every role) or in LiveRefresh (compare storyAt too).
test('an open client tab toasts the rejection when the clock moves past it', async ({ page, request }) => {
  const w = ws();
  await page.goto(`/w/${w}/ngozi`);
  await expect(page.getByTestId('bell')).toHaveAttribute('aria-label', 'Notifications, none unread');
  expect((await moveClock(request, w, '2026-07-13T18:00:00Z')).ok()).toBe(true);
  await expect(page.getByTestId('toast')).toContainText('The IRS returned your return', { timeout: 12_000 });
});

test('Jo sees the overdue internal deadlines at the default clock; no toast on load or after a reset', async ({ page, request }) => {
  const w = ws();
  await page.goto(`/w/${w}/jo`);
  const bell = page.getByTestId('bell');
  await expect(bell).toHaveAttribute('aria-label', 'Notifications, 2 unread');
  await expect(page.getByTestId('since-last-looked')).toContainText('hand-off to review was due 27 Mar 2026');
  await bell.click();
  const panel = page.getByTestId('bell-panel');
  await expect(panel).toContainText('Internal: preparer hand-off to review was due 27 Mar 2026');
  await expect(panel).toContainText('Internal: review complete was due 8 Apr 2026');
  await expect(panel).toContainText('on extension to 15 Oct 2026');
  await expect(page.getByTestId('toast')).toHaveCount(0);

  // After the client signs (10 Jul) the internal steps are met; a reset brings the clock back and the deadlines with it.
  expect((await moveClock(request, w, '2026-07-20T00:00:00Z')).ok()).toBe(true);
  await expect(bell).toHaveAttribute('aria-label', 'Notifications, none unread', { timeout: 12_000 });
  expect((await request.post(`/api/w/${w}/events?role=jo`, { data: { type: 'workspace_reset', payload: {} } })).ok()).toBe(true);
  await expect(bell).toHaveAttribute('aria-label', 'Notifications, 2 unread', { timeout: 12_000 });
  await expect(page.getByTestId('toast')).toHaveCount(0);
});
