import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { roles, roleInfo, can, maskValue, maskText, maskRecord, redactText, partnerThreshold } from '@/domain/policy';
import { projectWorkspace } from '@/domain/project';
import type { NewEvent, RoleKey, WorkEvent } from '@/domain/contracts';
import { DEFAULT_STORY_AT } from '@/domain/clock';

const p = loadPacket();
const ix = indexPacket(p);
const AT = DEFAULT_STORY_AT(ix);
const line = ix.latest.lines.find((l) => typeof l.value === 'number' && (l.value as number) > 5000)!;
const claimId = `line:${line.key}`;
let seq = 0;
const ev = (role: RoleKey, type: NewEvent['type'], extra: Partial<WorkEvent> = {}): WorkEvent =>
  ({ seq: ++seq, ws: 'ws-p', at: '2026-10-17T00:00:00Z', storyAt: AT, role, type, payload: {}, ...extra });
const stateOf = (events: WorkEvent[], role: RoleKey = 'daniel') => projectWorkspace(ix, events, role, []);
const R = (k: RoleKey) => roleInfo(ix, k)!;

describe('roles', () => {
  const rs = roles(ix);
  it('derives ten roles from firm.staff, firm.client_users and two seats', () => {
    expect(rs.map((r) => r.key).sort()).toEqual(['daniel', 'erik', 'helen', 'irs', 'jo', 'marcus', 'next', 'ngozi', 'priya', 'sam']);
    for (const s of p.firm.staff) expect(rs.some((r) => r.staffId === s.id && r.name === s.name)).toBe(true);
    for (const c of p.firm.client_users) expect(rs.find((r) => r.clientUserId === c.id)?.kind).toBe('client');
  });
  it('takes clearance and active_from from the packet', () => {
    const marcus = R('marcus');
    const st = p.firm.staff.find((s) => s.id === marcus.staffId)!;
    expect(marcus.clearance).toBe(st.sensitive_data_clearance);
    expect(marcus.clearance).toBe(false);
    expect(marcus.activeFrom?.slice(0, 10)).toBe(st.active_from);
  });
  it('next year preparer is the st-01 persona at the tl-28 clock; examiner from Letter 566', () => {
    const tl = p.timeline.find((t) => t.id === 'tl-28')!;
    expect(R('next').staffId).toBe(tl.actor);
    expect(R('next').activeFrom).toBe(tl.at);
    expect(R('irs').kind).toBe('examiner');
    expect(R('irs').activeFrom?.slice(0, 10)).toBe('2028-01-20');
    expect(R('irs').screens).not.toContain('checks');
    expect(R('ngozi').screens).not.toContain('review');
  });
  it('clients and the examiner also get the filing screen', () => {
    for (const k of ['ngozi', 'erik', 'irs'] as RoleKey[]) expect(R(k).screens).toEqual(['home', 'documents', 'filing']);
  });
});

describe('can', () => {
  const empty = stateOf([]);
  it('refuses Marcus a reveal with the firm rule text', () => {
    const r = can(ix, 'marcus', 'reveal', { payload: { what: 'household:ngozi.ssn' } }, empty);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/sensitive-data clearance/);
    expect(can(ix, 'priya', 'reveal', { payload: { what: 'household:ngozi.ssn' } }, empty).ok).toBe(true);
  });
  it('refuses sign-off on a claim whose last adjustment you authored', () => {
    const s = stateOf([ev('daniel', 'adjustment', { claimId, payload: { value: 1, status: 'applied' } })]);
    const r = can(ix, 'daniel', 'signoff', { claimId, payload: { level: 'reviewer', note: 'n' } }, s);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/review or sign off on work they prepared/);
    expect(can(ix, 'helen', 'signoff', { claimId, payload: { level: 'partner', note: 'Agreed to the 1098' } }, s).ok).toBe(true);
  });
  it('sign-off level must match the role', () => {
    expect(can(ix, 'priya', 'signoff', { claimId, payload: { level: 'partner', note: 'n' } }, empty).ok).toBe(false);
    expect(can(ix, 'daniel', 'signoff', { claimId, payload: { level: 'reviewer', note: 'Tied to the W-2' } }, empty).ok).toBe(true);
  });
  it('a sign-off on an item needs a review note; the return approval does not', () => {
    for (const note of [undefined, '', '   ']) {
      const r = can(ix, 'daniel', 'signoff', { claimId, payload: { level: 'reviewer', ...(note === undefined ? {} : { note }) } }, empty);
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/what you checked/);
    }
    expect(can(ix, 'daniel', 'signoff', { claimId, payload: { level: 'reviewer', note: 'Tied to the W-2' } }, empty).ok).toBe(true);
    // Stored sign-offs without a note still project (the rule gates new writes only).
    const old = stateOf([ev('daniel', 'signoff', { claimId, payload: { level: 'reviewer', value: String(line.value) } })]);
    expect(old.claims[claimId].signoffs).toHaveLength(1);
  });
  it('preparers may only propose an adjustment; reviewers may apply', () => {
    expect(can(ix, 'priya', 'adjustment', { claimId, payload: { value: 1, status: 'applied' } }, empty).ok).toBe(false);
    expect(can(ix, 'priya', 'adjustment', { claimId, payload: { value: 1, status: 'proposed' } }, empty).ok).toBe(true);
    expect(can(ix, 'daniel', 'adjustment', { claimId, payload: { value: 1, status: 'applied' } }, empty).ok).toBe(true);
  });
  it('partner threshold comes from the standards text', () => {
    expect(partnerThreshold(ix)).toBe(1000);
  });
  it('clients answer only their own questions and attach notes only to their documents', () => {
    const q = ev('priya', 'question_to_client', { claimId, payload: { to: 'ngozi', text: 'Q?' } });
    const s = stateOf([q]);
    expect(can(ix, 'ngozi', 'answer_recorded', { payload: { questionSeq: q.seq, text: 'A' } }, s).ok).toBe(true);
    expect(can(ix, 'erik', 'answer_recorded', { payload: { questionSeq: q.seq, text: 'A' } }, s).ok).toBe(false);
    expect(can(ix, 'ngozi', 'adjustment', { claimId, payload: { value: 1 } }, s).ok).toBe(false);
    const spouseDoc = p.documents.find((d) => d.belongs_to === 'spouse')!;
    const taxpayerDoc = p.documents.find((d) => d.belongs_to === 'taxpayer')!;
    expect(can(ix, 'erik', 'attach_note', { claimId: `doc:${spouseDoc.id}`, payload: { text: 'n' } }, s).ok).toBe(true);
    expect(can(ix, 'erik', 'attach_note', { claimId: `doc:${taxpayerDoc.id}`, payload: { text: 'n' } }, s).ok).toBe(false);
  });
  it('examiner, Sam and next year preparer are read-only', () => {
    const late = projectWorkspace(ix, [ev('jo', 'clock_moved', { payload: { to: '2028-02-01T00:00:00Z' } })], 'daniel', []);
    for (const k of ['irs', 'sam', 'next'] as RoleKey[]) {
      expect(can(ix, k, 'review_note', { claimId, payload: { text: 'x' } }, late).ok).toBe(false);
    }
  });
  it('a role is unavailable before it joins', () => {
    const early = projectWorkspace(ix, [ev('jo', 'clock_moved', { payload: { to: '2026-03-10T00:00:00Z' } })], 'daniel', []);
    const r = can(ix, 'marcus', 'review_note', { claimId, payload: { text: 'x' } }, early);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/joins/);
    expect(can(ix, 'marcus', 'review_note', { claimId, payload: { text: 'x' } }, empty).ok).toBe(true);
  });
  it('the past is view-only: after a rewind every write is refused until the clock is back at the latest point reached', () => {
    const fwd = ev('jo', 'clock_moved', { payload: { to: '2026-07-15T02:10:00Z' } });
    const back = ev('jo', 'clock_moved', { payload: { to: '2026-06-23T06:05:00Z' } });
    const rewound = projectWorkspace(ix, [fwd, back], 'daniel', []);
    expect(rewound.frontierAt).toBe('2026-07-15T02:10:00Z');
    for (const [role, type, payload] of [
      ['daniel', 'adjustment', { value: 12000 }], ['daniel', 'review_note', { text: 'x', blocking: true }],
      ['priya', 'reveal', { what: 'household:ngozi.ssn' }], ['ngozi', 'answer_recorded', { questionSeq: 1, text: 'x' }],
    ] as [RoleKey, NewEvent['type'], Record<string, unknown>][]) {
      const r = can(ix, role, type, { claimId, payload }, rewound);
      expect(r.ok, `${role} ${type}`).toBe(false);
      expect(r.reason).toMatch(/earlier point in the story/);
    }
    // The clock itself still moves, and at the latest point writes are allowed again.
    expect(can(ix, 'jo', 'clock_moved', { payload: { to: '2026-07-15T02:10:00Z' } }, rewound).ok).toBe(true);
    const there = projectWorkspace(ix, [ev('jo', 'clock_moved', { payload: { to: '2026-07-01T00:00:00Z' } })], 'daniel', []);
    expect(can(ix, 'daniel', 'review_note', { claimId, payload: { text: 'x' } }, there).ok).toBe(true);
  });
  it('the latest point reached counts an undone clock move; a reset clears it', () => {
    const fwd = ev('jo', 'clock_moved', { payload: { to: '2026-07-15T02:10:00Z' } });
    const undone = projectWorkspace(ix, [fwd, ev('jo', 'undo', { retracts: fwd.seq, payload: {} })], 'daniel', []);
    expect(undone.storyAt).toBe(AT);
    expect(undone.frontierAt).toBe('2026-07-15T02:10:00Z');
    expect(can(ix, 'daniel', 'review_note', { claimId, payload: { text: 'x' } }, undone).ok).toBe(false);
    const reset = projectWorkspace(ix, [fwd, ev('daniel', 'workspace_reset')], 'daniel', []);
    expect(reset.frontierAt).toBe(AT);
    expect(can(ix, 'daniel', 'review_note', { claimId, payload: { text: 'x' } }, reset).ok).toBe(true);
  });
  it('approval is refused while blockers stand, with the list', () => {
    const s = stateOf([ev('daniel', 'review_note', { claimId, payload: { text: 'fix', blocking: true } })]);
    const r = can(ix, 'helen', 'approve', {}, s);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/fix/);
    expect(can(ix, 'helen', 'approve', {}, stateOf([])).ok).toBe(true);
    expect(can(ix, 'daniel', 'approve', {}, stateOf([])).ok).toBe(false);
  });
  it('approval (a partner sign-off on the return) is refused while blockers stand, and for anyone but the partner', () => {
    const blocked = stateOf([ev('daniel', 'review_note', { claimId, payload: { text: 'fix first', blocking: true } })]);
    const r = can(ix, 'helen', 'signoff', { claimId: 'return', payload: { level: 'partner' } }, blocked);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/fix first/);
    expect(can(ix, 'helen', 'signoff', { claimId: 'return', payload: { level: 'partner' } }, stateOf([])).ok).toBe(true);
    expect(can(ix, 'daniel', 'signoff', { claimId: 'return', payload: { level: 'reviewer' } }, stateOf([])).ok).toBe(false);
  });
  it('verification method must be one of the firm verification types', () => {
    const types = p.firm.starter_standards.verification_types as string[];
    expect(can(ix, 'priya', 'verification', { claimId, payload: { method: types[0] } }, empty).ok).toBe(true);
    expect(can(ix, 'priya', 'verification', { claimId, payload: { method: 'vibes' } }, empty).ok).toBe(false);
  });
  it('a decision needs a known kind and an authority', () => {
    expect(can(ix, 'daniel', 'decision', { claimId, payload: { kind: 'election', authority: 'IRC 1(h)' } }, empty).ok).toBe(true);
    expect(can(ix, 'daniel', 'decision', { claimId, payload: { kind: 'election' } }, empty).ok).toBe(false);
    expect(can(ix, 'daniel', 'decision', { claimId, payload: { kind: 'whim', authority: 'x' } }, empty).ok).toBe(false);
  });
});

describe('masking', () => {
  const ssn = (p.household.people[0].ssn as string);
  it('maskValue keeps last 4 for ssn and account types, never masks EINs', () => {
    expect(maskValue(ssn, 'ssn', R('marcus'), false)).toBe(`•••-••-${ssn.slice(-4)}`);
    expect(maskValue(ssn, 'ssn', R('marcus'), true)).not.toContain(ssn);
    expect(maskValue(ssn, 'ssn', R('priya'), true)).toBe(ssn);
    expect(maskValue(ssn, 'ssn', R('priya'), false)).not.toContain(ssn);
    expect(maskValue('12-3456789', 'ein', R('marcus'), false)).toBe('12-3456789');
    const acct = p.extracted_values.find((v) => v.value_type === 'account_number')!;
    expect(maskValue(String(acct.value), 'account_number', R('marcus'), false)).not.toContain(String(acct.value).slice(0, 8));
    expect(maskValue('1,234.00', 'money', R('marcus'), false)).toBe('1,234.00');
  });
  it('redactText removes signature PINs entirely', () => {
    const tl = p.timeline.find((t) => /PIN \d/.test(t.detail ?? ''))!;
    const pins = tl.detail.match(/PIN (\d+)/g)!.map((m) => m.split(' ')[1]);
    const out = redactText(tl.detail);
    for (const pin of pins) expect(out).not.toContain(pin);
    expect(out).toMatch(/PIN •+/);
  });
  it('maskText catches SSN, IBAN, routing and long account numbers in any text', () => {
    const hh = p.household as unknown as { bank_account_for_refund_or_payment: { routing: string; account: string } };
    const raw = JSON.stringify(p.household);
    const out = maskText(raw, R('marcus'), false);
    for (const person of p.household.people) if (person.ssn) expect(out).not.toContain(person.ssn);
    expect(out).not.toContain(hh.bank_account_for_refund_or_payment.routing);
    expect(out).not.toContain(hh.bank_account_for_refund_or_payment.account);
    const ib = p.extracted_values.find((v) => v.value_type === 'account_number')!;
    expect(maskText(`acct ${ib.value}`, R('marcus'), false)).not.toContain(String(ib.value));
    expect(maskText('EIN 12-3456789; total 142,000', R('marcus'), false)).toBe('EIN 12-3456789; total 142,000');
  });
  it('maskRecord masks identifier fields by name (ip_pin, ero_pin, ssn) but not EINs', () => {
    const fi = p.firm.firm_identity as Record<string, string>;
    const out = JSON.stringify(maskRecord(p.firm.firm_identity, R('priya'), false));
    expect(out).not.toContain(`"${fi.ero_pin}"`);
    expect(out).toContain(fi.ein);
    const people = JSON.stringify(maskRecord(p.household, R('priya'), false));
    for (const person of p.household.people) if (person.ip_pin) expect(people).not.toContain(`"${person.ip_pin}"`);
  });
});

describe('document scope per role', () => {
  it('a client sees their own, joint and dependents\' documents, not the spouse\'s', async () => {
    const { visibleDocIds } = await import('@/domain/policy');
    const ids = visibleDocIds(ix, 'ngozi')!;
    for (const d of p.documents) {
      const expected = d.belongs_to === 'taxpayer' || d.belongs_to === 'joint' || String(d.belongs_to).startsWith('dependent:');
      expect(ids.has(d.id)).toBe(expected);
    }
    expect(visibleDocIds(ix, 'daniel')).toBeNull(); // staff: no restriction
  });
  it('the examiner sees the letter and the documents behind the items under examination', async () => {
    const { visibleDocIds } = await import('@/domain/policy');
    const ids = visibleDocIds(ix, 'irs')!;
    const notice = (p.tax_agency_records as { notices: { type: string; document: string }[] }).notices.find((n) => /566/.test(n.type))!;
    expect(ids.has(notice.document)).toBe(true);
    for (const d of p.documents) if (d.document_type === '1099-NEC' || d.document_type === '1099-K') expect(ids.has(d.id)).toBe(true);
    expect(p.documents.some((d) => d.document_type === 'donation_receipt' && ids.has(d.id)) || p.documents.some((d) => d.document_type === '1098-C' && ids.has(d.id))).toBe(true);
    for (const d of p.documents) if (d.document_type === 'W-2') expect(ids.has(d.id)).toBe(false);
  });
});
