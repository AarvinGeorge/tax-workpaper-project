import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { projectWorkspace, effectOf } from '@/domain/project';
import { DEFAULT_STORY_AT, frozenAt } from '@/domain/clock';
import { can } from '@/domain/policy';
import type { Finding, NewEvent, RoleKey, WorkEvent } from '@/domain/contracts';

const p = loadPacket();
const ix = indexPacket(p);
const AT = DEFAULT_STORY_AT(ix);
const line = ix.latest.lines.find((l) => typeof l.value === 'number' && (l.value as number) > 5000)!;
const claimId = `line:${line.key}`;
let seq = 0;
const ev = (role: RoleKey, type: NewEvent['type'], extra: Partial<WorkEvent> = {}): WorkEvent =>
  ({ seq: ++seq, ws: 'ws-pr', at: '2026-10-17T00:00:00Z', storyAt: AT, role, type, payload: {}, ...extra });
const project = (events: WorkEvent[], role: RoleKey = 'daniel', findings: Finding[] = []) => projectWorkspace(ix, events, role, findings);

describe('projection', () => {
  it('an applied adjustment keeps the original and sets current; a proposal does not change current', () => {
    const prop = ev('priya', 'adjustment', { claimId, payload: { value: 10, status: 'proposed' } });
    let c = project([prop]).claims[claimId];
    expect(c.current).toBe(line.value);
    expect(c.adjusted).toBe(false);
    expect(c.history).toHaveLength(1);
    const appl = ev('daniel', 'adjustment', { claimId, payload: { value: 10, status: 'applied' } });
    c = project([prop, appl]).claims[claimId];
    expect(c.original).toBe(line.value);
    expect(c.current).toBe(10);
    expect(c.adjusted).toBe(true);
    expect(c.version).toBe(1);
  });

  it('a sign-off stores the value it covered and goes stale after a later change', () => {
    const so = ev('daniel', 'signoff', { claimId, payload: { level: 'reviewer' } });
    let c = project([so]).claims[claimId];
    expect(c.signoffs[0]).toMatchObject({ level: 'reviewer', value: String(line.value), stale: false });
    const adj = ev('helen', 'adjustment', { claimId, payload: { value: 99, status: 'applied' } });
    c = project([so, adj]).claims[claimId];
    expect(c.signoffs[0].stale).toBe(true);
  });

  it('undo retracts one event, or a whole group', () => {
    const adj = ev('daniel', 'adjustment', { claimId, payload: { value: 5, status: 'applied' } });
    const undo = ev('daniel', 'undo', { retracts: adj.seq });
    const c = project([adj, undo]).claims[claimId];
    expect(c.current).toBe(line.value);
    expect(c.adjusted).toBe(false);
    expect(c.version).toBe(2);
    const other = `line:${ix.latest.lines[1].key}`;
    const g1 = ev('daniel', 'signoff', { claimId, groupId: 'g1', payload: { level: 'reviewer' } });
    const g2 = ev('daniel', 'signoff', { claimId: other, groupId: 'g1', payload: { level: 'reviewer' } });
    const ug = ev('daniel', 'undo', { groupId: 'g1', payload: { group: true } });
    const s = project([g1, g2, ug]);
    expect(s.claims[claimId].signoffs).toHaveLength(0);
    expect(s.claims[other].signoffs).toHaveLength(0);
  });

  it('an open blocking review note is a blocker until resolved', () => {
    const note = ev('daniel', 'review_note', { claimId, payload: { text: 'Tie to D68', blocking: true } });
    let s = project([note]);
    expect(s.claims[claimId].openNotes).toHaveLength(1);
    expect(s.blockers.some((b) => b.claimId === claimId && /Tie to D68/.test(b.title))).toBe(true);
    s = project([note, ev('priya', 'note_resolved', { claimId, payload: { noteSeq: note.seq } })]);
    expect(s.claims[claimId].openNotes).toHaveLength(0);
    expect(s.blockers).toHaveLength(0);
  });

  const blocker: Finding = {
    id: 'F-1', checkId: 'chk', family: 'x', title: 'Estimates include a 2024 payment', severity: 'blocker',
    claims: [claimId], evidence: [], explanation: 'e', ledgerIds: [],
  };
  it('a visible blocker finding blocks until its claim is adjusted or it is cleared', () => {
    expect(project([], 'daniel', [blocker]).blockers.map((b) => b.claimId)).toEqual(['finding:F-1']);
    const later = { ...blocker, firstVisibleAt: '2027-01-01T00:00:00Z' };
    expect(project([], 'daniel', [later]).blockers).toHaveLength(0);
    const adj = ev('daniel', 'adjustment', { claimId, payload: { value: line.value as number - 1, status: 'applied' } });
    expect(project([adj], 'daniel', [blocker]).blockers.some((b) => b.claimId === 'finding:F-1')).toBe(false);
    const cl = ev('daniel', 'finding_cleared', { claimId: 'finding:F-1', payload: { reason: 'explained' } });
    expect(project([cl], 'daniel', [blocker]).blockers).toHaveLength(0);
  });

  it('an adjustment over the partner threshold needs a partner sign-off', () => {
    const adj = ev('daniel', 'adjustment', { claimId, payload: { value: 0, status: 'applied', effect: { federal: 0, california: 3500, basis: 'tax_effect_rates' } } });
    let s = project([adj]);
    expect(s.blockers.some((b) => b.claimId === claimId && /partner sign-off/i.test(b.title))).toBe(true);
    s = project([adj, ev('helen', 'signoff', { claimId, payload: { level: 'partner' } })]);
    expect(s.blockers.some((b) => b.claimId === claimId)).toBe(false);
  });

  it('tax effect: rates by category, payments and credits 1:1', () => {
    const r = ix.latest.tax_effect_rates.wages;
    expect(effectOf(ix, line.key, 100, { category: 'wages' })).toMatchObject({ federal: Math.round(100 * r.federal_per_dollar), california: Math.round(100 * r.california_per_dollar), basis: 'tax_effect_rates', version: ix.latest.version });
    const pay = ix.latest.lines.find((l) => l.jurisdiction === 'california' && /estimated tax payments/i.test(l.label))!;
    expect(effectOf(ix, pay.key, -3500, {})).toMatchObject({ federal: 0, california: 3500 });
  });

  it('a stale baseVersion is refused by policy as a conflict', () => {
    const adj = ev('daniel', 'adjustment', { claimId, payload: { value: 1, status: 'applied' } });
    const s = project([adj]);
    const r = can(ix, 'helen', 'adjustment', { claimId, baseVersion: 0, payload: { value: 2, status: 'applied' } }, s);
    expect(r).toMatchObject({ ok: false, conflict: true });
  });

  it('after the freeze, value changes are refused: amend on top', () => {
    const fz = frozenAt(ix)!;
    const s = project([ev('jo', 'clock_moved', { payload: { to: fz } })]);
    expect(s.frozen).toBe(true);
    expect(s.stage).toBe('Filed');
    const r = can(ix, 'daniel', 'adjustment', { claimId, payload: { value: 1, status: 'applied' } }, s);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/amend on top/i);
  });

  it('events after the story time are hidden; the clock follows clock_moved', () => {
    const note = ev('daniel', 'review_note', { claimId, payload: { text: 'later' }, storyAt: '2026-07-01T00:00:00Z' });
    const back = ev('jo', 'clock_moved', { payload: { to: '2026-06-01T00:00:00Z' } });
    const s = project([note, back]);
    expect(s.storyAt).toBe('2026-06-01T00:00:00Z');
    expect(s.events.some((e) => e.seq === note.seq)).toBe(false);
  });

  it('clients and the examiner receive no internal events; reveals are logged without the value', () => {
    const note = ev('daniel', 'review_note', { claimId, payload: { text: 'internal' } });
    const q = ev('priya', 'question_to_client', { claimId, payload: { to: 'ngozi', text: 'Did you pay?' } });
    const q2 = ev('priya', 'question_to_client', { claimId, payload: { to: 'erik', text: 'Erik only' } });
    const rv = ev('priya', 'reveal', { payload: { what: 'household:ngozi.ssn' } });
    const ng = project([note, q, q2, rv], 'ngozi');
    expect(ng.events.map((e) => e.seq)).toEqual([q.seq]);
    expect(ng.blockers).toEqual([]);
    expect(ng.reveals).toEqual([]);
    expect(project([note, q, rv], 'irs').events).toEqual([]);
    const st = project([note, q, rv], 'jo');
    expect(st.reveals).toEqual([{ seq: rv.seq, role: 'priya', what: 'household:ngozi.ssn', at: rv.at }]);
  });

  it('masks identifiers in event text for the requesting role', () => {
    const ssn = p.household.people[0].ssn as string;
    const note = ev('daniel', 'review_note', { claimId, payload: { text: `SSN on file ${ssn}` } });
    const s = project([note], 'marcus');
    expect(JSON.stringify(s)).not.toContain(ssn);
  });

  it('a sign-off on a claim with no value is not stale at birth; number formats compare equal', () => {
    const so = ev('daniel', 'signoff', { claimId: 'finding:F-9', payload: { level: 'reviewer', value: '' } });
    expect(project([so]).claims['finding:F-9'].signoffs[0].stale).toBe(false);
    const adj = ev('daniel', 'adjustment', { claimId, payload: { value: 10500, status: 'applied' } });
    const so2 = ev('helen', 'signoff', { claimId, payload: { level: 'partner', value: '10,500' } });
    expect(project([adj, so2]).claims[claimId].signoffs[0].stale).toBe(false);
  });
});
