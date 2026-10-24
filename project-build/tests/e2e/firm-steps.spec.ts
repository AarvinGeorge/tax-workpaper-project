// The firm's required steps as gates (src/domain/steps.ts): Review lists each step's items, an item is explained with a
// verification naming its step, approval waits, Checks counts the same blockers and links to the step.
import { expect, test } from '@playwright/test';

const ws = (n: string) => `e2e-fs-${n}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test('Review lists the three firm steps; explaining a document lowers its count and is saved', async ({ page }) => {
  const w = ws('explain');
  await page.goto(`/w/${w}/daniel/review?tab=steps`);
  const tab = page.getByRole('navigation', { name: 'Review views' }).getByRole('link', { name: /Firm steps/ });
  await expect(tab).toHaveAttribute('aria-current', 'page');
  const box = page.getByRole('region', { name: 'Firm steps' });
  for (const step of ['Diagnostics resolved', 'All documents accounted for', 'Prior-year variances explained']) await expect(box).toContainText(step);
  const docs = box.getByRole('group', { name: 'All documents accounted for' });
  await expect(docs).toContainText(/22 of 22 unexplained/);
  const item = docs.locator('[data-step-item="doc:D73"]');
  await expect(item).toContainText('Halvorsen Data paystub');
  await item.getByLabel('Method').selectOption('confirmed_with_client');
  await item.getByLabel('Explanation').fill('Paystub supports the wage split at the move; see the CA wage finding.');
  await item.getByRole('button', { name: 'Explain' }).click();
  await expect(docs).toContainText(/21 of 22 unexplained/);
  await page.reload();
  await expect(docs).toContainText(/21 of 22 unexplained/);
  await expect(docs.locator('[data-step-item="doc:D73"]')).toContainText('Explained');
});

test('a diagnostic item links to what the engine points at', async ({ page }) => {
  const w = ws('refs');
  await page.goto(`/w/${w}/daniel/review?tab=steps`);
  const amt = page.locator('[data-step-item="diag:CA_AMT_NOT_COMPUTED"]');
  await expect(amt.getByRole('link', { name: /F6251\.2i/ })).toHaveAttribute('href', /claim=line%3AF6251\.2i/);
  const c6 = page.locator('[data-step-item="diag:DIGITAL_ASSET_BASIS_MISSING"]');
  await expect(c6.getByRole('link', { name: /D3\d/ }).first()).toHaveAttribute('href', /claim=doc%3AD3\d/);
});

test('approval waits on the open steps, and Checks counts them with the other blockers', async ({ page }) => {
  const w = ws('gate');
  await page.goto(`/w/${w}/helen/review`);
  await expect(page.getByRole('button', { name: 'Approve the return' })).toBeDisabled();
  const st = await (await page.request.get(`/api/w/${w}/state?role=helen`)).json() as { state: { blockers: { claimId: string }[] } };
  const steps = st.state.blockers.filter((b) => b.claimId.startsWith('step:'));
  expect(steps).toHaveLength(3);
  await page.goto(`/w/${w}/daniel/checks`);
  await expect(page.getByRole('main')).toContainText(`${st.state.blockers.length} blockers`);
  const row = page.locator('[data-step-blocker="step:Diagnostics resolved"]');
  await expect(row).toContainText('Firm step open: Diagnostics resolved');
  await expect(row.getByRole('link').first()).toHaveAttribute('href', `/w/${w}/daniel/review?tab=steps`);
});

test('clients and the examiner see no firm steps', async ({ page }) => {
  const w = ws('outside');
  for (const r of ['ngozi', 'irs']) {
    await page.goto(`/w/${w}/${r}`);
    await expect(page.getByRole('main')).not.toContainText('Firm step open');
  }
});
