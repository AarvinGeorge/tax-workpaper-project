import { expect, test, type Page } from '@playwright/test';

// A light/dark button in the header. It starts from the computer's setting, overrides it either way, and the choice
// survives a reload without a flash of the other theme (the saved choice is applied before first paint).
const ws = () => `e2e-theme-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const isDark = async (page: Page) => {
  const [r, g, b] = (await bg(page)).match(/[\d.]+/g)!.map(Number);
  // oklch() is returned as-is by some engines; fall back to its lightness.
  if ((await bg(page)).startsWith('oklch')) return r < 0.5;
  return (r + g + b) / 3 < 128;
};

test('light computer: the button switches to dark, the choice survives a reload, and switches back', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(`/w/${ws()}/daniel`);
  expect(await isDark(page)).toBe(false);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await isDark(page)).toBe(true);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await isDark(page)).toBe(true);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  expect(await isDark(page)).toBe(false);
});

test('dark computer: starts dark and the button offers light mode, for clients too', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`/w/${ws()}/ngozi`);
  expect(await isDark(page)).toBe(true);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await isDark(page)).toBe(false);
});
