// Lane C: questions to the client that become evidence, per-spouse 8879 signing, the client's copy, assignments.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const ws = (n: string) => `e2e-cl-${n}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const CA_EST = 'line:F540NR.72';
const SSN_SHAPED = /\b\d{3}-\d{2}-\d{4}\b/;
type Packet = {
  timeline: { detail?: string | null }[];
  firm: { firm_identity: Record<string, unknown> };
  tax_agency_records: { efile: { date: string; jurisdiction: string; status: string }[] };
};
const packet = (): Packet => JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'packet.json'), 'utf8')) as Packet;
/** Every PIN the packet carries (signature PINs in the timeline, the firm's ERO PIN), read at run time, never written here. */
const pins = (): string[] => {
  const p = packet();
  const out = p.timeline.flatMap((t) => [...String(t.detail ?? '').matchAll(/PIN\s*(\d{4,8})/g)].map((m) => m[1]));
  if (p.firm.firm_identity.ero_pin) out.push(String(p.firm.firm_identity.ero_pin));
  return out;
};
const afterAcceptance = () => {
  const acc = packet().tax_agency_records.efile.filter((e) => e.status === 'accepted').map((e) => e.date).sort();
  return new Date(Date.parse(acc[acc.length - 1]) + 3_600_000).toISOString();
};
const post = (rq: APIRequestContext, w: string, role: string, data: Record<string, unknown>) =>
  rq.post(`/api/w/${w}/events`, { data: { role, ...data } });

async function noSecrets(page: Page) {
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(SSN_SHAPED);
  expect(text).not.toMatch(/PIN\s*\d{4,}/);
  for (const pin of pins()) expect(text).not.toContain(pin);
}

/** Clear every finding blocker (as the reviewer, with a reason), then the partner approves the return. */
async function approve(rq: APIRequestContext, w: string) {
  const st = await (await rq.get(`/api/w/${w}/state?role=helen`)).json() as { state: { blockers: { claimId: string }[] } };
  for (const b of st.state.blockers) {
    if (b.claimId.startsWith('finding:')) expect((await post(rq, w, 'daniel', { type: 'finding_cleared', claimId: b.claimId, payload: { reason: 'Reviewed for this test.' } })).ok()).toBeTruthy();
  }
  const r = await post(rq, w, 'helen', { type: 'signoff', claimId: 'return', payload: { scope: 'return', level: 'partner', value: 'v3' } });
  expect(r.ok(), await r.text()).toBeTruthy();
}

test('a client answers on Home; the other spouse cannot; the asker sees the answer as evidence', async ({ page }) => {
  const w = ws('qa');
  const q = await post(page.request, w, 'daniel', { type: 'question_to_client', claimId: CA_EST, payload: { to: 'erik', text: 'Was the September payment meant for 2024?' } });
  expect(q.ok()).toBeTruthy();
  const seq = (await q.json()).seq as number;

  const other = await post(page.request, w, 'ngozi', { type: 'answer_recorded', claimId: CA_EST, payload: { questionSeq: seq, text: 'Yes' } });
  expect(other.status()).toBe(403);

  await page.goto(`/w/${w}/erik`);
  const row = page.getByTestId('client-question');
  await expect(row).toContainText('September payment');
  await row.getByLabel('Your answer').fill('Yes, it was the 2024 balance.');
  await row.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('client-answer')).toContainText('2024 balance');
  await noSecrets(page);

  await page.goto(`/w/${w}/daniel/return?claim=${encodeURIComponent(CA_EST)}`);
  const ev = page.getByTestId('client-answers');
  await expect(ev).toContainText('September payment');
  await expect(ev).toContainText('Answer, evidence');
  await expect(ev).toContainText('2024 balance');
});

test('8879 signing: refused before approval, each spouse once after it, stale after a change, closed at acceptance', async ({ page }) => {
  test.setTimeout(120_000);
  const w = ws('sign');
  const body = { type: 'client_signature', claimId: 'return', payload: { forms: ['8879', 'FTB 8879'], value: 'abcd1234' } };
  const early = await post(page.request, w, 'ngozi', body);
  expect(early.status()).toBe(403);
  expect((await early.json()).reason).toMatch(/partner/i);

  await page.goto(`/w/${w}/ngozi/filing`);
  await expect(page.getByTestId('client-signing')).toContainText('once the partner has approved');
  await expect(page.getByTestId('client-copy')).toContainText('appears here once your return has been filed');

  await approve(page.request, w);
  for (const who of ['ngozi', 'erik']) {
    await page.goto(`/w/${w}/${who}/filing`);
    const box = page.getByTestId('client-signing');
    await expect(box.getByRole('table')).toContainText('Total tax');
    await box.getByRole('button', { name: 'Approve and sign both forms' }).click();
    await expect(page.getByTestId(`signature-${who}`)).toContainText('You signed Form 8879 and FTB 8879');
    await expect(box.getByRole('button', { name: 'Approve and sign both forms' })).toBeDisabled();
    await expect(box).toContainText('already signed');
    await noSecrets(page);
  }

  await page.goto(`/w/${w}/daniel/filing`);
  const staff = page.getByTestId('staff-signing');
  await expect(staff).toContainText('Approved');
  await expect(page.getByTestId('signature-ngozi')).toContainText('Signed');
  await expect(page.getByTestId('signature-erik')).toContainText('Signed');

  const adj = await post(page.request, w, 'daniel', { type: 'adjustment', claimId: CA_EST, payload: { value: 10500, status: 'applied', reason: 'Designated tax year 2024 (D68).' } });
  expect(adj.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByTestId('signature-ngozi')).toContainText('Stale');
  await expect(page.getByTestId('signature-erik')).toContainText('Stale');
  await page.goto(`/w/${w}/erik/filing`);
  await expect(page.getByTestId('signature-erik')).toContainText('sign again');

  expect((await post(page.request, w, 'jo', { type: 'clock_moved', payload: { to: afterAcceptance() } })).ok()).toBeTruthy();
  const late = await post(page.request, w, 'erik', { ...body, payload: { ...body.payload, value: 'ffff0000' } });
  expect(late.status()).toBe(403);
  expect((await late.json()).reason).toMatch(/filed and accepted/);
});

test("the client's copy appears after acceptance with the as-filed amounts and what to keep", async ({ page }) => {
  const w = ws('copy');
  expect((await post(page.request, w, 'jo', { type: 'clock_moved', payload: { to: afterAcceptance() } })).ok()).toBeTruthy();
  await page.goto(`/w/${w}/ngozi/filing`);
  const copy = page.getByTestId('client-copy');
  await expect(copy).toContainText('Your copy of the filed return');
  await expect(copy.getByRole('table')).toContainText('Federal (Form 1040)');
  await expect(copy.getByRole('table')).toContainText('California');
  await expect(copy.getByRole('table')).toContainText('Refund');
  await expect(copy.getByRole('table')).toContainText('Balance due');
  await expect(copy).toContainText('What to keep');
  await expect(copy).toContainText(/retained/i);
  await expect(page.getByTestId('client-signing')).toContainText('signing is closed');
  await noSecrets(page);
  for (const scr of ['', '/documents']) {
    await page.goto(`/w/${w}/erik${scr}`);
    await noSecrets(page);
  }
});

test('staff assign a claim from the drawer; the drawer shows the assignee', async ({ page }) => {
  const w = ws('assign');
  await page.goto(`/w/${w}/daniel/return?claim=${encodeURIComponent(CA_EST)}`);
  const a = page.getByTestId('assign');
  await expect(page.getByTestId('assignee')).toHaveText('No one yet');
  await a.getByLabel('Assign to').selectOption('priya');
  await a.getByRole('button', { name: 'Assign' }).click();
  await expect(page.getByTestId('assignee')).not.toHaveText('No one yet');
  const st = await (await page.request.get(`/api/w/${w}/state?role=daniel`)).json() as { state: { events: { type: string; payload: { to?: string } }[] } };
  expect(st.state.events.find((e) => e.type === 'assignment')?.payload.to).toBe('priya');
  await page.reload();
  await expect(page.getByTestId('assignee')).not.toHaveText('No one yet');
});
