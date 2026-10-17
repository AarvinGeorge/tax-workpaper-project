import { expect, test, type Page } from '@playwright/test';

// Shell layout: on laptops and monitors the app is one viewport tall and each pane scrolls on its own; the centre
// column is centred in its pane; on phones the page scrolls as one.
const ws = () => `e2e-layout-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const top = (page: Page, sel: string) => page.locator(sel).evaluate((el) => el.scrollTop);

test('panes scroll independently and the window does not scroll (1440x900)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/w/${ws()}/daniel/checks?claim=line:F540NR.72`);
  await page.locator('.sh-pane-c').hover();
  await page.mouse.wheel(0, 1500);
  await expect.poll(() => top(page, '.sh-pane-c')).toBeGreaterThan(0);
  expect(await top(page, '.sh-pane-l')).toBe(0);
  expect(await top(page, '.sh-pane-r')).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  const centre = await top(page, '.sh-pane-c');
  await page.locator('.sh-pane-r').hover();
  await page.mouse.wheel(0, 800);
  await expect.poll(() => top(page, '.sh-pane-r')).toBeGreaterThan(0);
  expect(await top(page, '.sh-pane-c')).toBe(centre);
  // The number being read stays pinned at the top of the drawer.
  await expect(page.getByTestId('claim-value')).toBeInViewport();
});

test('the centre column is centred in its pane on a wide monitor (2560x1300)', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1300 });
  for (const screen of ['checks', 'return', '']) {
    await page.goto(`/w/${ws()}/daniel${screen ? '/' + screen : ''}`);
    const pane = await page.locator('.sh-pane-c').boundingBox();
    const col = await page.locator('.sh-pane-c > *').first().boundingBox();
    const left = col!.x - pane!.x;
    const right = pane!.x + pane!.width - (col!.x + col!.width);
    expect(Math.abs(left - right), `${screen || 'home'} left ${left} right ${right}`).toBeLessThan(24);
  }
});

test('on a phone the page scrolls as one', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/w/${ws()}/daniel/checks`);
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('no sideways scroll on phones: the header, role switcher and bell fit (390 and 360 wide)', async ({ page }) => {
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`/w/${ws()}/daniel`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `width ${width}`).toBeLessThanOrEqual(width);
    const bell = await page.getByTestId('bell').boundingBox();
    expect(bell!.x + bell!.width).toBeLessThanOrEqual(width);
  }
});

test('at exactly 900 wide the panes keep their order: nav, screen, drawer', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto(`/w/${ws()}/daniel/return?claim=line:F540NR.72`);
  const x = async (s: string) => (await page.locator(s).boundingBox())!.x;
  const [l, c, r] = [await x('.sh-pane-l'), await x('.sh-pane-c'), await x('.sh-pane-r')];
  expect(l).toBeLessThan(c);
  expect(c).toBeLessThan(r);
});
