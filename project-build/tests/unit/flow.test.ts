import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { flowThrough, FLOW_RULES } from '@/domain/flow';
import { projectWorkspace } from '@/domain/project';
import { effectEstimate, finalized } from '@/domain/versions';
import { keyAmounts } from '@/components/client/signing';
import { DEFAULT_STORY_AT } from '@/domain/clock';
import { can, signingBlock } from '@/domain/policy';
import type { NewEvent, RoleKey, WorkEvent } from '@/domain/contracts';

const p = loadPacket();
const ix = indexPacket(p);
const AT = DEFAULT_STORY_AT(ix);
let seq = 0;
const ev = (role: RoleKey, type: NewEvent['type'], extra: Partial<WorkEvent> = {}): WorkEvent =>
  ({ seq: ++seq, ws: 'ws-flow', at: '2026-10-18T00:00:00Z', storyAt: AT, role, type, payload: {}, ...extra });
const adj = (key: string, value: number | string) => ev('daniel', 'adjustment', { claimId: `line:${key}`, payload: { value, status: 'applied', reason: 'test' } });
const project = (events: WorkEvent[]) => projectWorkspace(ix, events, 'daniel', []);
const engine = (key: string) => ix.line(ix.latest.version, key)!.value as number;

describe('flowThrough', () => {
  it('California payments at 10,500: total payments and the overpayment recompute exactly; nothing needs the engine', () => {
    const f = flowThrough(ix, { 'F540NR.72': 10500 });
    expect(f.get('F540NR.78')).toEqual({ value: 23630, from: ['F540NR.72'] });
    expect(f.get('F540NR.97')).toEqual({ value: 4756, from: ['F540NR.72'] });
    expect([...f.values()].some((x) => 'needsEngine' in x)).toBe(false);
    expect(f.has('F540NR.72')).toBe(false);
  });

  it('a wage change: the AGI chain recomputes, the first tax computation and everything below it need the engine', () => {
    const wages = engine('F1040.1a');
    const f = flowThrough(ix, { 'F1040.1a': wages + 10000 });
    expect(f.get('F1040.1z')).toMatchObject({ value: wages + 10000 });
    expect(f.get('F1040.11')).toMatchObject({ value: engine('F1040.11') + 10000 });
    expect(f.get('F540NR.13')).toMatchObject({ value: engine('F1040.11') + 10000 });
    // SALT cap and California wage additions are computations, not arithmetic: the frontier.
    expect(f.get('SchA.5e')).toMatchObject({ needsEngine: true, frontier: true, from: ['F1040.1a'] });
    for (const k of ['F1040.15', 'F1040.16', 'F1040.24', 'F1040.37', 'F540NR.34', 'F540NR.64', 'F540NR.97']) {
      expect(f.get(k), k).toMatchObject({ needsEngine: true });
    }
    // Downstream of a line that needs the engine is not a frontier of its own.
    expect(f.get('F1040.24')).toMatchObject({ frontier: false });
  });

  it('a sign flip: when total payments fall below total tax, the candidates disagree and the overpayment needs the engine', () => {
    const f = flowThrough(ix, { 'F540NR.72': 0 });
    expect(f.get('F540NR.78')).toMatchObject({ value: engine('F540NR.78') - 14000 });
    expect(engine('F540NR.78') - 14000).toBeLessThan(engine('F540NR.64'));
    expect(f.get('F540NR.97')).toMatchObject({ needsEngine: true, frontier: true });
  });

  it('no adjustments: an empty result', () => {
    expect(flowThrough(ix, {}).size).toBe(0);
  });

  it('a line the user adjusted keeps its own value, and feeds the lines below it', () => {
    const f = flowThrough(ix, { 'F540NR.72': 10500, 'F540NR.78': 30000 });
    expect(f.has('F540NR.78')).toBe(false);
    // 72 no longer reaches 97: the adjusted 78 stands in its way.
    expect(f.get('F540NR.97')).toEqual({ value: 30000 - engine('F540NR.64'), from: ['F540NR.78'] });
  });
});

describe('the operation table (indexPacket, per version)', () => {
  // Measured with python3 -I over data/packet.json: 221 lines with inputs in every version; on the allowlist with an
  // integer value that fits an operation exactly, 129; the other 92 need the engine.
  it.each(p.return_versions.map((rv) => rv.version))('%s: 129 replayable lines, 92 need the engine, every replay reproduces the stored value', (v) => {
    const g = ix.flowGraph(v);
    const derived = ix.version(v)!.lines.filter((l) => l.inputs.length);
    expect(derived).toHaveLength(221);
    const replay = derived.filter((l) => g.ops.get(l.key)!.length > 0);
    expect(replay).toHaveLength(129);
    expect(derived.length - replay.length).toBe(92);
    for (const l of replay) {
      expect(FLOW_RULES).toContain(l.rule);
      const vals = l.inputs.map((k) => ix.line(v, k)!.value as number);
      for (const op of g.ops.get(l.key)!) expect(Math.abs(op.apply(vals) - (l.value as number)), `${v} ${l.key} ${op.name}`).toBeLessThanOrEqual(0.5);
    }
  });

  it('ratio lines and text flags always need the engine', () => {
    const g = ix.flowGraph(ix.latest.version);
    for (const k of ['F540NR.34', 'F540NR.36', 'F8606.10', 'F8938.req', 'F8867.status']) expect(g.ops.get(k), k).toEqual([]);
    // Total payments and the overpayment are arithmetic (R-SUM).
    expect(g.ops.get('F540NR.78')!.map((o) => o.name)).toEqual(['sum']);
    expect(g.ops.get('F540NR.97')!.map((o) => o.name).sort()).toEqual(['b-a', 'max0(b-a)']);
  });
});

describe('the projection carries the flow', () => {
  it('derived claims: current is the derived value, original the engine value, never an adjustment', () => {
    const s = project([adj('F540NR.72', 10500)]);
    expect(s.claims['line:F540NR.78']).toMatchObject({ current: 23630, original: 27130, adjusted: false, derived: true, from: ['F540NR.72'] });
    expect(s.claims['line:F540NR.97']).toMatchObject({ current: 4756, original: 8256, adjusted: false, derived: true });
    expect(s.claims['line:F540NR.78'].effect).toBeUndefined();
    expect(s.blockers.some((b) => /engine/i.test(b.title))).toBe(false);
  });

  it('finalized and the key amounts follow: California payments 23,630 and refund 4,756', () => {
    const s = project([adj('F540NR.72', 10500)]);
    const fin = finalized(ix, s);
    expect(fin.find((f) => f.key === 'F540NR.97')).toMatchObject({ value: 4756, v3: 8256, adjusted: false, derived: true, recomputed: true });
    const ca = keyAmounts(ix, s).find((k) => k.jurisdiction === 'california')!;
    expect(ca.payments?.value).toBe(23630);
    expect(ca.result).toMatchObject({ kind: 'refund', value: 4756 });
  });

  it('no adjustments: no derived claims, and the projection is unchanged by a note', () => {
    const note = ev('daniel', 'review_note', { claimId: 'line:F540NR.78', payload: { text: 'tie out' } });
    const s = project([note]);
    expect(Object.keys(s.claims)).toEqual(['line:F540NR.78']);
    expect(s.claims['line:F540NR.78'].current).toBe(27130);
    expect(s.claims['line:F540NR.78'].derived).toBeUndefined();
    expect(Object.values(project([]).claims)).toHaveLength(0);
  });

  it('a derived line merges into its existing claim: notes and sign-offs are kept, and a sign-off before the change goes stale', () => {
    const note = ev('daniel', 'review_note', { claimId: 'line:F540NR.78', payload: { text: 'tie out' } });
    const so = ev('priya', 'signoff', { claimId: 'line:F540NR.78', payload: { level: 'preparer' } });
    const c = project([note, so, adj('F540NR.72', 10500)]).claims['line:F540NR.78'];
    expect(c).toMatchObject({ current: 23630, derived: true });
    expect(c.openNotes).toHaveLength(1);
    expect(c.signoffs[0]).toMatchObject({ value: '27130', stale: true });
    // A sign-off after the change covers the derived value and is fresh.
    const later = project([adj('F540NR.72', 10500), ev('priya', 'signoff', { claimId: 'line:F540NR.78', payload: { level: 'preparer' } })]).claims['line:F540NR.78'];
    expect(later.signoffs[0]).toMatchObject({ value: '23630', stale: false });
  });

  it('undoing the adjustment removes the derived values', () => {
    const a = adj('F540NR.72', 10500);
    const s = project([a, ev('daniel', 'undo', { retracts: a.seq })]);
    expect(s.claims['line:F540NR.78']).toBeUndefined();
  });

  it('a wage change: needs-engine lines block approval, the blocker sits on those lines and never on the adjusted one', () => {
    const s = project([adj('F1040.1a', engine('F1040.1a') + 10000)]);
    expect(s.claims['line:F1040.24']).toMatchObject({ current: engine('F1040.24'), needsEngine: true });
    expect(s.claims['line:F1040.24'].derived).toBeUndefined();
    const eng = s.blockers.filter((b) => /^Needs engine re-run: /.test(b.title));
    expect(eng.length).toBeGreaterThan(0);
    expect(eng.find((b) => b.claimId === 'line:SchA.5e')!.title).toMatch(/depends on .*F1040\.1a/);
    expect(eng.some((b) => b.claimId === 'line:F1040.1a')).toBe(false);
    // Only the frontier carries a blocker; the lines below it follow from it.
    expect(eng.some((b) => b.claimId === 'line:F1040.24')).toBe(false);
    const r = can(ix, 'helen', 'approve', { claimId: 'return' }, s);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Needs engine re-run/);
  });
});

describe('review follow-ups', () => {
  const approveEv = () => ev('helen', 'signoff', { claimId: 'return', payload: { scope: 'return', level: 'partner', value: 'v3' } });
  const sign = { claimId: 'return', payload: { forms: ['8879', 'FTB 8879'], value: 'abcd1234' } };

  it('a client cannot sign once the return changed after the partner approved it', () => {
    const ok = project([approveEv()]);
    expect(signingBlock(ix, ok)).toBeNull();
    expect(can(ix, 'ngozi', 'client_signature', sign, ok).ok).toBe(true);
    const s = project([approveEv(), adj('F1040.1a', engine('F1040.1a') + 1000)]);
    expect(signingBlock(ix, s)).toMatch(/changed the return after approving it/);
    const r = can(ix, 'ngozi', 'client_signature', sign, s);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/changed the return after approving it/);
  });

  it('a client cannot sign while a figure needs the engine, even with a fresh approval', () => {
    const s = project([adj('F1040.1a', engine('F1040.1a') + 1000), approveEv()]);
    expect(signingBlock(ix, s)).toMatch(/re-run/);
  });

  it('the estimate on a needs-engine line counts only the adjustments it depends on', () => {
    const wages = ev('daniel', 'adjustment', { claimId: 'line:F1040.1a', payload: { value: engine('F1040.1a') + 1000, status: 'applied', category: 'wages' } });
    const s = project([wages, adj('F540NR.72', 10500)]);
    const all = effectEstimate(s)!;
    const mine = effectEstimate(s, s.claims['line:F1040.24'].from)!;
    expect(mine).toEqual({ federal: s.claims['line:F1040.1a'].effect!.federal, california: s.claims['line:F1040.1a'].effect!.california });
    expect(all.california).toBe(mine.california + 3500);
  });
});
