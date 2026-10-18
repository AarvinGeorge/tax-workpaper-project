// The "?" help marks: open by hover, keyboard focus or tap; close on Escape; stay inside a phone-width viewport; the
// header's "Actions are recorded" line lives behind its mark; and only the first use of a term on a screen is marked.
import { expect, test, type Page } from '@playwright/test';
import { TERMS } from '../../src/components/term/terms';

const ws = () => `e2e-terms-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ATTRIB = 'Actions are recorded as the role you choose';

test('Form 1040 mark on Return opens by hover and by keyboard focus; Escape closes it', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/return`);
  const mark = page.getByRole('button', { name: 'What is Form 1040?' }).first();
  await expect(mark).toBeVisible();
  const tip = page.getByRole('tooltip');
  await mark.hover();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText(TERMS['form-1040'].text);
  await expect(mark).toHaveAttribute('aria-describedby', (await tip.getAttribute('id'))!);
  await page.mouse.move(5, 5);
  await expect(tip).toHaveCount(0);
  await mark.focus();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText(TERMS['form-1040'].text);
  await page.keyboard.press('Escape');
  await expect(tip).toHaveCount(0);
});

test('at 390px wide a tapped tooltip stays inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/w/${ws()}/daniel/return`);
  const mark = page.getByRole('button', { name: 'What is Form 1040?' }).first();
  await mark.scrollIntoViewIfNeeded();
  await mark.click();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();
  const box = (await tip.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await page.mouse.click(5, 400);
  await expect(tip).toHaveCount(0);
});

test('the "Actions are recorded" line is behind the Viewing as mark, and still describes the select', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel`);
  const head = page.locator('header.sh-head');
  // Not shown as a visible line: any element carrying it is the 1px visually-hidden description.
  const carriers = head.getByText(ATTRIB);
  for (const el of await carriers.all()) expect(((await el.boundingBox())?.width ?? 0)).toBeLessThanOrEqual(1);
  await expect(page.getByTestId('role-switcher')).toHaveAccessibleDescription(new RegExp(ATTRIB));
  await head.getByRole('button', { name: `What is ${TERMS['role-switcher'].label}?` }).click();
  await expect(page.getByRole('tooltip')).toContainText(ATTRIB);
});

async function marksPerKey(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const out: Record<string, number> = {};
    for (const b of document.querySelectorAll<HTMLElement>('button[data-term]')) {
      const r = b.getBoundingClientRect();
      if (!b.checkVisibility() && r.width === 0) continue;
      out[b.dataset.term!] = (out[b.dataset.term!] ?? 0) + 1;
    }
    return out;
  });
}

test('first use only: each term is marked at most once per screen', async ({ page }) => {
  const w = ws();
  const screens: [string, string][] = [
    ['daniel', ''], ['daniel', '/return'], ['daniel', '/areas'], ['daniel', '/checks'], ['daniel', '/review'], ['daniel', '/review?tab=log'],
    ['daniel', '/whatifs'], ['daniel', '/documents'], ['daniel', '/return?claim=line%3AF1040.1a'],
    ['jo', '/review?tab=views'], ['marcus', ''],
  ];
  let total = 0;
  for (const [role, path] of screens) {
    await page.goto(`/w/${w}/${role}${path}`);
    await expect(page.locator('button[data-term]').first()).toBeVisible();
    const counts = await marksPerKey(page);
    total += Object.keys(counts).length;
    for (const [k, n] of Object.entries(counts)) expect(n, `${role}${path}: ${k}`).toBeLessThanOrEqual(1);
  }
  expect(total).toBeGreaterThan(30);
});

test('a click or tap inside an open tooltip keeps it open', async ({ page }) => {
  await page.goto(`/w/e2e-terms-${Date.now().toString(36)}/daniel/return`);
  const mark = page.locator('button[data-term="form-1040"]').first();
  // A tooltip closes when the page scrolls; bring the mark into view first so the click itself does not scroll.
  await mark.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await mark.click();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();
  await tip.click();
  await expect(tip).toBeVisible();
});
