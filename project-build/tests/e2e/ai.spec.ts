// AI suggestions in the app: the server reads the fixture payload (playwright.config sets AI_PAYLOAD_PATH). One
// grounded suggestion is shown, marked and "needs review"; two are held back with reasons; staff accept or dismiss;
// clients and the examiner never see any of it.
import { expect, test } from '@playwright/test';
import { AI_FIXTURE_IDS } from '../fixtures/ai-payload';

const ws = () => `e2e-ai-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ID = AI_FIXTURE_IDS.grounded;

test('Checks shows the AI group after our checks: marked, needs review, filter chip, held-back note', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/checks`);
  const group = page.getByTestId('ai-suggestions');
  await expect(group.getByRole('heading', { name: /AI suggestions/ })).toBeVisible();
  const row = group.locator(`[data-finding="${ID}"]`);
  await expect(row).toBeVisible();
  await expect(row.getByRole('img', { name: 'Suggested by AI' })).toBeVisible();
  await expect(row).toContainText(/needs review/i);
  // Held back: the fake quote and the unvetted authority.
  const held = page.getByTestId('ai-held');
  await expect(held).toContainText('2 AI suggestions held back: failed verification');
  await held.locator('summary').click();
  await expect(held).toContainText(/quote not found/i);
  await expect(held).toContainText(/Authority not in the vetted list/);
  // Group comes after our checks in reading order.
  const ours = page.locator('#chk-ours');
  expect(await ours.evaluate((a, b) => !!(a.compareDocumentPosition(b as Node) & Node.DOCUMENT_POSITION_FOLLOWING), await page.locator('#chk-ai').elementHandle())).toBe(true);
  // The AI chip shows only the AI group.
  await page.getByRole('link', { name: /^AI\s*1$/ }).click();
  await expect(page.locator('#chk-ours')).toHaveCount(0);
  await expect(page.getByTestId('ai-suggestions').locator(`[data-finding="${ID}"]`)).toBeVisible();
});

test('the side panel shows rationale, quote, authority and provenance; accept labels it', async ({ page }) => {
  const w = ws();
  await page.goto(`/w/${w}/daniel/checks?claim=finding:${ID}`);
  const drawer = page.getByTestId('drawer');
  await expect(drawer).toContainText('Needs review');
  await expect(drawer).toContainText('Installed new');
  await expect(drawer).toContainText('Treas. Reg. 1.263(a)-3');
  await expect(drawer).toContainText(/Suggested by example-model, prompt reader-test, /);
  await expect(drawer).toContainText('Confidence: high');
  await expect(drawer.getByRole('link', { name: /page 1/ }).first()).toHaveAttribute('href', /claim=doc%3AD\d+%23page1|claim=doc:D\d+#page1/);
  await drawer.getByRole('button', { name: 'Accept' }).click();
  await expect(drawer.getByTestId('ai-accepted')).toContainText(/Suggested by AI, accepted by \w+/);
  await page.reload();
  const row = page.getByTestId('ai-suggestions').locator(`[data-finding="${ID}"]`);
  await expect(row).toContainText('Accepted');
  await expect(row).not.toContainText(/needs review/i);
});

test('a dismissed suggestion leaves the inbox; dismiss needs a reason; clients and the examiner are refused', async ({ page }) => {
  const w = ws();
  const post = (role: string, type: string, payload: Record<string, unknown>) =>
    page.request.post(`/api/w/${w}/events`, { data: { role, type, claimId: `finding:${ID}`, payload } });
  for (const r of ['ngozi', 'erik', 'irs']) expect((await post(r, 'suggestion_accepted', {})).ok(), r).toBe(false);
  expect((await post('priya', 'suggestion_dismissed', {})).ok()).toBe(false);
  expect((await post('priya', 'suggestion_dismissed', { reason: 'Our repair check already covers it' })).ok()).toBe(true);
  await page.goto(`/w/${w}/daniel/checks`);
  await expect(page.getByTestId('ai-suggestions').locator(`[data-finding="${ID}"]`)).toHaveCount(0);
});

test('clients and the examiner see no AI suggestions anywhere', async ({ page }) => {
  const w = ws();
  for (const r of ['ngozi', 'erik', 'irs']) {
    const res = await page.request.get(`/api/w/${w}/state?role=${r}`);
    if (res.ok()) expect(JSON.stringify(await res.json())).not.toContain(ID);
    for (const path of ['', '/documents', '/filing']) {
      await page.goto(`/w/${w}/${r}${path}`);
      await expect(page.locator('[data-ai-mark]')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('AI suggestion');
    }
    await page.goto(`/w/${w}/${r}?claim=finding:${ID}`);
    await expect(page.locator('body')).not.toContainText('Installed new');
  }
});

test('Findings says how the mistakes were found and marks the ledger row the AI also flagged', async ({ page }) => {
  await page.goto(`/w/${ws()}/daniel/findings`);
  await expect(page.locator('body')).toContainText('found during an AI-assisted review of the packet and are now caught by deterministic checks');
  const marked = page.getByRole('img', { name: 'The AI reader also flagged this' });
  await expect(marked.first()).toBeVisible();
  await expect(page.locator('tr[data-ledger="GT-C05"]').getByRole('img', { name: 'The AI reader also flagged this' })).toBeVisible();
  await expect(page.locator('tr[data-ledger] th, thead th')).toHaveCount(5);
});
