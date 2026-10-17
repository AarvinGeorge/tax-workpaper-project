import { expect, test } from '@playwright/test';

// The client name is a switcher for firm staff: today it lists the one return and shows "Add a new client" as
// designed, not built. Clients and the examiner see the name only.
const ws = () => `e2e-client-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test('staff open the switcher: current return, a designed "Add a new client" that does nothing', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel`);
  const button = page.getByRole('button', { name: /Client and return: Okafor and Lindqvist, 2025/ });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.press('Enter');
  const panel = page.getByTestId('client-menu');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Okafor and Lindqvist, 2025')).toBeVisible();
  const add = panel.getByRole('button', { name: /Add a new client/ });
  await expect(add).toBeDisabled();
  await expect(panel).toContainText(/designed, not built/i);
  await expect(page).toHaveURL(/\/daniel$/);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(button).toBeFocused();
  await button.click();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(panel).toHaveCount(0);
});

test('clients and the examiner see the name only, no switcher', async ({ page }) => {
  for (const role of ['ngozi', 'irs']) {
    await page.goto(`/w/${ws()}/${role}`);
    await expect(page.locator('.sh-brand')).toContainText('Okafor and Lindqvist, 2025');
    await expect(page.getByRole('button', { name: /Client and return/ })).toHaveCount(0);
  }
});

test('on a phone the open switcher stays inside the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`/w/${ws()}/daniel`);
  await page.getByRole('button', { name: /Client and return/ }).click();
  const box = await page.getByTestId('client-menu').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
