// The firm's required steps as closed-world gates: every item of a step needs an explanation (a verification naming the
// step) before approval. Ids and figures are allowed here; src/domain/steps.ts never names them.
import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { indexAt } from '@/domain/clock';
import { firmSteps, STEP_WORDING } from '@/domain/steps';
import { projectWorkspace } from '@/domain/project';
import { can } from '@/domain/policy';
import { CLAIM_ID } from '@/domain/events';
import type { WorkEvent } from '@/domain/contracts';
import type { Packet } from '@/domain/packet/types';

const p = loadPacket();
const ix = indexPacket(p);
const LATEST = ix.versions[ix.versions.length - 1].computed_at;
const at = (t: string) => indexAt(ix, t);
let seq = 0;
const verify = (claimId: string, step: string, extra: Partial<WorkEvent> = {}): WorkEvent =>
  ({ seq: ++seq, ws: 'ws-st', at: '2026-10-24T00:00:00Z', storyAt: LATEST, role: 'daniel', type: 'verification', claimId,
    payload: { method: 'agreed_to_source_document', note: 'explained', step }, ...extra });
const steps = (events: WorkEvent[] = [], pix = at(LATEST)) => firmSteps(pix, events);
const stepOf = (name: keyof typeof STEP_WORDING, events: WorkEvent[] = [], pix = at(LATEST)) =>
  steps(events, pix).find((s) => STEP_WORDING[name].test(s.step))!;
const claims = (name: keyof typeof STEP_WORDING) => stepOf(name).items.map((i) => i.claimId);

describe('the three firm steps on the real packet', () => {
  it('yields exactly the three steps the firm lists, by its own wording', () => {
    expect(steps().map((s) => s.step).sort()).toEqual(['All documents accounted for', 'Diagnostics resolved', 'Prior-year variances explained']);
  });

  it('diagnostics resolved: every diagnostic of the latest version, CA AMT included', () => {
    const c = claims('diagnostics');
    expect(c).toContain('diag:CA_AMT_NOT_COMPUTED');
    expect(c).toHaveLength(ix.latest.diagnostics.length);
  });

  it('documents: the unused documents carrying money, not the duplicate, the superseded or the ones with no amounts', () => {
    const c = claims('documents');
    for (const d of ['D73', 'D15', 'D47', 'D54']) expect(c).toContain(`doc:${d}`);
    for (const d of ['D10', 'D30', 'D02', 'D04', 'D05']) expect(c).not.toContain(`doc:${d}`);
  });

  it('documents: a landed document with money no line cites, D11 (the RSU supplement) among them', () => {
    const amounts = stepOf('documents').items.filter((i) => i.kind === 'amounts');
    expect(amounts.map((i) => i.claimId)).toContain('doc:D11');
    expect(amounts.find((i) => i.claimId === 'doc:D11')!.detail).toMatch(/19,100/);
    expect(amounts.map((i) => i.claimId)).not.toContain('doc:D10');
  });

  it('variances: leaf lines on both returns over the firm rule; no totals, no new lines; dropped forms collapse to one item', () => {
    const items = stepOf('variances').items;
    const lines = items.filter((i) => i.claimId.startsWith('line:')).map((i) => i.claimId.slice(5));
    expect(lines.length).toBeGreaterThan(0);
    for (const k of lines) expect(ix.line(ix.latest.version, k)?.inputs ?? []).toEqual([]);
    expect(lines).not.toContain('SchC.28'); // a total: explained through its inputs
    const dropped = items.filter((i) => i.kind === 'form');
    expect(dropped.map((i) => i.claimId)).toContain('form:CA540');
    expect(items.length).toBeLessThan(30);
  });

  it('a form still on this return is not described as gone, only its missing lines are', () => {
    const items = stepOf('variances').items;
    expect(items.find((i) => i.claimId === 'form:CA540')!.title).toMatch(/not on this one/);
    expect(items.find((i) => i.claimId === 'form:SchC')!.title).not.toMatch(/not on this one/);
    expect(items.find((i) => i.claimId === 'form:SchC')!.title).toMatch(/lines .* not on this year/);
  });

  it('before the first computation every step is empty (no phantom swings or documents)', () => {
    const early = at('2026-03-01T00:00:00Z');
    for (const s of steps([], early)) expect(s.items, s.step).toEqual([]);
  });

  it('a firm that does not list a step gets no gate for it', () => {
    const q: Packet = structuredClone(p);
    q.firm.starter_standards.required_steps = (q.firm.starter_standards.required_steps as string[]).filter((s) => !/diagnostics/i.test(s));
    const qix = indexPacket(q);
    expect(firmSteps(indexAt(qix, LATEST), []).map((s) => s.step)).not.toContain('Diagnostics resolved');
  });
});

describe('explaining an item', () => {
  it('a verification naming the step closes that item and only that item', () => {
    const before = stepOf('documents');
    const after = stepOf('documents', [verify('doc:D73', 'All documents accounted for')]);
    expect(after.items.find((i) => i.claimId === 'doc:D73')!.explained).toBe(true);
    expect(after.open).toBe(before.open - 1);
  });

  it('a verification for another purpose on the same claim does not close it', () => {
    const s = stepOf('documents', [verify('doc:D73', '')]);
    expect(s.items.find((i) => i.claimId === 'doc:D73')!.explained).toBe(false);
  });
});

describe('the gate', () => {
  const AT = ix.versions[ix.versions.length - 1].computed_at.slice(0, 16) + ':00Z';
  const state = (events: WorkEvent[] = [], role: 'daniel' | 'ngozi' | 'helen' = 'daniel') => projectWorkspace(ix, events, role, []);
  const stepBlockers = (events: WorkEvent[] = [], role: 'daniel' | 'ngozi' | 'helen' = 'daniel') => state(events, role).blockers.filter((b) => b.claimId.startsWith('step:'));

  it('one blocker per open step, named with its counts', () => {
    const b = stepBlockers();
    expect(b.map((x) => x.claimId).sort()).toEqual(['step:All documents accounted for', 'step:Diagnostics resolved', 'step:Prior-year variances explained']);
    expect(b.find((x) => x.claimId === 'step:Diagnostics resolved')!.title).toBe(`Firm step open: Diagnostics resolved (${ix.latest.diagnostics.length} of ${ix.latest.diagnostics.length} unexplained)`);
  });

  it('explaining every item of a step removes its blocker; undoing one brings it back', () => {
    const s = firmSteps(at(AT), []).find((x) => x.step === 'Diagnostics resolved')!;
    const evs = s.items.map((i) => verify(i.claimId, s.step, { storyAt: AT }));
    expect(stepBlockers(evs).map((x) => x.claimId)).not.toContain('step:Diagnostics resolved');
    const undo: WorkEvent = { seq: ++seq, ws: 'ws-st', at: '2026-10-24T00:00:00Z', storyAt: AT, role: 'daniel', type: 'undo', retracts: evs[0].seq, payload: {} };
    expect(stepBlockers([...evs, undo]).find((x) => x.claimId === 'step:Diagnostics resolved')!.title).toMatch(/\(1 of /);
  });

  it('clients get no step blockers', () => {
    expect(stepBlockers([], 'ngozi')).toEqual([]);
  });

  it('the partner cannot approve while a step is open', () => {
    const v = can(ix, 'helen', 'signoff', { claimId: 'return', payload: { level: 'partner', scope: 'return', note: 'x' } }, state([], 'helen'));
    expect(v.ok).toBe(false);
    expect(v.ok ? '' : v.reason).toMatch(/Firm step open: Diagnostics resolved/);
  });

  it('the server accepts the claims a step item lives on', () => {
    for (const c of ['diag:CA_AMT_NOT_COMPUTED', 'diag:X#2', 'form:CA540', 'doc:D73', 'line:SchC.1']) expect(CLAIM_ID.test(c), c).toBe(true);
  });
});
