// Lane C (client side of the brief): answers that become evidence, per-spouse 8879 signing, the client's copy.
import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { can } from '@/domain/policy';
import { projectWorkspace } from '@/domain/project';
import { EVENT_TYPES } from '@/domain/events';
import { frozenAt } from '@/domain/clock';
import type { NewEvent, RoleKey, WorkEvent } from '@/domain/contracts';
import { DEFAULT_STORY_AT } from '@/domain/clock';
import { clientCopy, keyAmounts, returnFingerprint, signatures, SIGN_FORMS } from '@/components/client/signing';

const ix = indexPacket(loadPacket());
const AT = DEFAULT_STORY_AT(ix);
let seq = 0;
const ev = (role: RoleKey, type: NewEvent['type'], extra: Partial<WorkEvent> = {}): WorkEvent =>
  ({ seq: ++seq, ws: 'ws-c', at: '2026-10-17T00:00:00Z', storyAt: AT, role, type, payload: {}, ...extra });
const view = (events: WorkEvent[], role: RoleKey) => projectWorkspace(ix, events, role, []);
const approval = () => ev('helen', 'signoff', { claimId: 'return', payload: { scope: 'return', level: 'partner', value: ix.latest.version } });
const sig = (role: RoleKey, value: string, extra: Partial<WorkEvent> = {}) =>
  ev(role, 'client_signature', { claimId: 'return', payload: { forms: [...SIGN_FORMS], value }, ...extra });
const sign = (role: RoleKey, events: WorkEvent[], value = 'abc12345') =>
  can(ix, role, 'client_signature', { claimId: 'return', payload: { forms: [...SIGN_FORMS], value } }, view(events, role));
const afterAcceptance = () => {
  const fz = frozenAt(ix)!;
  return ev('jo', 'clock_moved', { payload: { to: new Date(Date.parse(fz) + 86_400_000).toISOString() } });
};

describe('answers to client questions', () => {
  const q = ev('daniel', 'question_to_client', { claimId: 'line:F540NR.72', payload: { to: 'erik', text: 'Was the April payment for 2024?' } });
  it('the addressed spouse may answer; the other spouse is refused', () => {
    const ok = can(ix, 'erik', 'answer_recorded', { claimId: 'line:F540NR.72', payload: { questionSeq: q.seq, text: 'Yes' } }, view([q], 'erik'));
    expect(ok.ok).toBe(true);
    const no = can(ix, 'ngozi', 'answer_recorded', { claimId: 'line:F540NR.72', payload: { questionSeq: q.seq, text: 'Yes' } }, view([q], 'ngozi'));
    expect(no).toMatchObject({ ok: false });
    expect(no.reason).toMatch(/addressed to you/);
  });
  it('an answer files on the claim the question was asked on, nowhere else', () => {
    const r = can(ix, 'erik', 'answer_recorded', { claimId: 'line:F1040.11', payload: { questionSeq: q.seq, text: 'Yes' } }, view([q], 'erik'));
    expect(r.ok).toBe(false);
  });
  it('the asker sees the answer on the claim, as evidence', () => {
    const a = ev('erik', 'answer_recorded', { claimId: 'line:F540NR.72', payload: { questionSeq: q.seq, text: 'Yes, for 2024' } });
    const staff = view([q, a], 'daniel');
    expect(staff.claims['line:F540NR.72'].history.map((e) => e.type)).toEqual(['question_to_client', 'answer_recorded']);
  });
});

describe('client approval and e-file signature', () => {
  it('client_signature is an event type', () => {
    expect(EVENT_TYPES).toContain('client_signature');
  });
  it('is refused before the partner approves the return', () => {
    const r = sign('ngozi', []);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/partner/i);
  });
  it('is allowed after the partner approval, for each spouse, once', () => {
    const a = approval();
    expect(sign('ngozi', [a]).ok).toBe(true);
    const s1 = sig('ngozi', 'abc12345');
    const again = sign('ngozi', [a, s1]);
    expect(again.ok).toBe(false);
    expect(again.reason).toMatch(/already signed/i);
    expect(sign('erik', [a, s1]).ok).toBe(true);
  });
  it('a spouse may sign again only when the return changed since (a stale signature)', () => {
    const a = approval();
    expect(sign('ngozi', [a, sig('ngozi', 'abc12345')], 'ffff0000').ok).toBe(true);
  });
  it('an undone approval stops signing again', () => {
    const a = approval();
    const u = ev('helen', 'undo', { retracts: a.seq });
    expect(sign('ngozi', [a, u]).ok).toBe(false);
  });
  it('is refused once federal acceptance has frozen the record', () => {
    const r = sign('erik', [approval(), afterAcceptance()]);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/filed|accept/i);
  });
  it('needs both forms and the fingerprint of what is signed; staff cannot sign for a client', () => {
    const a = approval();
    expect(can(ix, 'ngozi', 'client_signature', { claimId: 'return', payload: { forms: ['8879'], value: 'x1' } }, view([a], 'ngozi')).ok).toBe(false);
    expect(can(ix, 'ngozi', 'client_signature', { claimId: 'return', payload: { forms: [...SIGN_FORMS] } }, view([a], 'ngozi')).ok).toBe(false);
    expect(can(ix, 'helen', 'client_signature', { claimId: 'return', payload: { forms: [...SIGN_FORMS], value: 'x1' } }, view([a], 'helen')).ok).toBe(false);
  });
  it('never stores a PIN: a payload carrying one is refused', () => {
    const r = can(ix, 'ngozi', 'client_signature', { claimId: 'return', payload: { forms: [...SIGN_FORMS], value: 'abc12345', pin: '12345' } }, view([approval()], 'ngozi'));
    expect(r.ok).toBe(false);
  });
});

describe('fingerprint, key amounts and signature status', () => {
  it('the fingerprint is short and changes when any finalized value changes', () => {
    const base = returnFingerprint(ix, view([], 'daniel'));
    expect(base).toMatch(/^[0-9a-f]{8}$/);
    const adj = ev('daniel', 'adjustment', { claimId: 'line:F540NR.72', payload: { value: 10500, status: 'applied' } });
    expect(returnFingerprint(ix, view([adj], 'daniel'))).not.toBe(base);
    expect(returnFingerprint(ix, view([], 'helen'))).toBe(base);
  });
  it('key amounts per jurisdiction come from the latest version labels, finalized', () => {
    const rows = keyAmounts(ix, view([], 'daniel'));
    const fed = rows.find((r) => r.jurisdiction === 'federal')!;
    const ca = rows.find((r) => r.jurisdiction === 'california')!;
    const summary = ix.latest.summary as unknown as Record<string, Record<string, number>>;
    expect(fed.income?.value).toBe(summary.federal.agi);
    expect(fed.totalTax?.value).toBe(summary.federal.total_tax);
    expect(fed.payments?.value).toBe(summary.federal.payments);
    expect(fed.result?.kind).toBe('owe');
    expect(ca.totalTax?.value).toBe(summary.california.total_tax);
    expect(ca.result?.kind).toBe('refund');
    expect(ca.result?.value).toBe(-summary.california.balance_due);
    const tot = ix.latest.lines.find((l) => l.jurisdiction === 'federal' && /^total tax$/i.test(l.label))!;
    const adj = ev('daniel', 'adjustment', { claimId: `line:${tot.key}`, payload: { value: 1, status: 'applied' } });
    expect(keyAmounts(ix, view([adj], 'daniel')).find((r) => r.jurisdiction === 'federal')!.totalTax?.value).toBe(1);
  });
  it('signatures: who signed, when, and stale once the finalized return changes', () => {
    const fp = returnFingerprint(ix, view([], 'daniel'));
    const evs = [approval(), sig('ngozi', fp), sig('erik', fp)];
    const now = signatures(ix, view(evs, 'daniel'));
    expect(now.approved).toBe(true);
    expect(now.spouses.map((s) => [s.key, !!s.signed, s.signed?.stale])).toEqual([['ngozi', true, false], ['erik', true, false]]);
    const adj = ev('daniel', 'adjustment', { claimId: 'line:F540NR.72', payload: { value: 10500, status: 'applied' } });
    const later = signatures(ix, view([...evs, adj], 'daniel'));
    expect(later.spouses.every((s) => s.signed?.stale)).toBe(true);
  });
  it('a client sees the approval and both signatures, nothing else from the staff file', () => {
    const fp = returnFingerprint(ix, view([], 'daniel'));
    const note = ev('daniel', 'review_note', { claimId: 'line:F540NR.72', payload: { text: 'internal' } });
    const evs = [note, approval(), sig('erik', fp)];
    const s = view(evs, 'ngozi');
    expect(s.events.map((e) => e.type).sort()).toEqual(['client_signature', 'signoff']);
    const st = signatures(ix, s);
    expect(st.approved).toBe(true);
    expect(st.spouses.find((x) => x.key === 'erik')!.signed).toBeTruthy();
  });
  it("the client's copy is empty before acceptance and lists accepted dates after", () => {
    expect(clientCopy(ix, view([], 'ngozi'))).toBeNull();
    const after = clientCopy(ix, view([afterAcceptance()], 'ngozi'))!;
    expect(after.map((j) => j.jurisdiction)).toEqual(['federal', 'california']);
    for (const j of after) expect(j.acceptedAt).toBeTruthy();
  });
});
