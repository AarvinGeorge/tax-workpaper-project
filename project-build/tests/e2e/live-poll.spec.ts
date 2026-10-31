import { expect, test } from '@playwright/test';

// LiveRefresh polls only change markers, backs off when the tab is idle and stops after 10 minutes; a click resumes it.
const ws = () => `e2e-poll-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test('an idle open tab stops polling, and an interaction resumes it', async ({ page }) => {
  const polls: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/state?')) polls.push(r.url()); });
  await page.clock.install();
  await page.goto(`/w/${ws()}/daniel`);
  await page.clock.runFor(15 * 60_000);
  expect(polls.length).toBeGreaterThan(0);
  expect(polls.length).toBeLessThanOrEqual(40); // a flat 5 s poll would have made 180
  expect(polls.every((u) => u.includes('head=1'))).toBe(true);

  const stopped = polls.length;
  await page.clock.runFor(30 * 60_000);
  expect(polls.length).toBe(stopped); // stopped: no polls in the next half hour

  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await expect.poll(() => polls.length).toBeGreaterThan(stopped); // resumes at once on activity
});

test('navigating while a poll is in flight leaves no stray poller behind', async ({ page }) => {
  const w = ws();
  let hold = true;
  const held: (() => void)[] = [];
  let polls = 0;
  await page.route('**/state?**head=1*', async (route) => {
    polls++;
    if (hold) { await new Promise<void>((r) => held.push(r)); }
    await route.continue().catch(() => {});
  });
  await page.goto(`/w/${w}/daniel`);
  await expect.poll(() => held.length, { timeout: 10_000 }).toBe(1); // one poll is in flight
  await page.getByRole('link', { name: /^Checks/ }).first().click();
  await page.waitForURL(/\/checks/);
  hold = false;
  held.forEach((r) => r());
  const before = polls;
  await page.waitForTimeout(31_000);
  expect(polls - before).toBeLessThanOrEqual(7); // one poller at 5 s; a leaked second one doubles it
});
