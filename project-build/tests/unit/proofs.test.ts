// Proofs the tool runs itself on a line, in the firm's verification vocabulary (src/domain/proofs.ts). A proof states a
// fact about agreement, never that the number is right. Ids and figures are allowed here; proofs.ts names none.
import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { proofsFor } from '@/domain/proofs';
import type { Packet } from '@/domain/packet/types';

const p = loadPacket();
const ix = indexPacket(p);
const methods = (key: string, x = ix) => proofsFor(x, key).map((q) => q.method);
const altered = (f: (q: Packet) => void) => { const q: Packet = structuredClone(p); f(q); return indexPacket(q); };
const line = (q: Packet, key: string) => q.return_versions[q.return_versions.length - 1].lines.find((l) => l.key === key)!;

describe('proofs on the real packet', () => {
  it('agreed to source document: wages equal the W-2 box 1 amounts', () => {
    const pr = proofsFor(ix, 'F1040.1a').find((q) => q.method === 'agreed_to_source_document')!;
    expect(pr).toBeDefined();
    expect(pr.text).toMatch(/212,400/);
    expect(pr.refs.length).toBeGreaterThan(0);
  });

  it('recalculated: a sum line whose inputs add up', () => {
    const sum = ix.latest.lines.find((l) => l.rule === 'R-SUM' && (l.inputs || []).length > 1 && typeof l.value === 'number')!;
    expect(methods(sum.key)).toContain('recalculated');
  });

  it('agreed to prior year: a carryover equals the 2024 carryover record, one or several', () => {
    expect(methods('SchD.6')).toContain('agreed_to_prior_year');
    expect(proofsFor(ix, 'SchD.6').find((q) => q.method === 'agreed_to_prior_year')!.text).toMatch(/3,200/);
    expect(methods('F8582.1c')).toContain('agreed_to_prior_year'); // 6,300 + 9,850
  });

  it('a one-input line reads as carried, not recalculated', () => {
    const one = ix.latest.lines.filter((l) => (l.inputs || []).length === 1).map((l) => proofsFor(ix, l.key).find((q) => q.method === 'recalculated')).find(Boolean);
    expect(one, 'some one-input line is proved').toBeDefined();
    expect(one!.text).toMatch(/^Carried from /);
  });

  it('never says a number is correct', () => {
    for (const l of ix.latest.lines) for (const q of proofsFor(ix, l.key)) expect(q.text).not.toMatch(/\bcorrect\b|\bright\b|\bverified\b/i);
  });

  it('only uses the firm’s own verification types', () => {
    const types = p.firm.starter_standards.verification_types as string[];
    for (const l of ix.latest.lines) for (const q of proofsFor(ix, l.key)) expect(types).toContain(q.method);
  });
});

describe('each proof goes silent when its agreement breaks', () => {
  it('wages no longer equal their sources', () => {
    expect(methods('F1040.1a', altered((q) => { line(q, 'F1040.1a').value = 212401; }))).not.toContain('agreed_to_source_document');
  });
  it('a carryover no longer equals last year', () => {
    expect(methods('SchD.6', altered((q) => { line(q, 'SchD.6').value = -3100; }))).not.toContain('agreed_to_prior_year');
  });
  it('a sum that no longer adds up', () => {
    const sum = ix.latest.lines.find((l) => l.rule === 'R-SUM' && (l.inputs || []).length > 1 && typeof l.value === 'number')!;
    expect(methods(sum.key, altered((q) => { line(q, sum.key).value = (sum.value as number) + 7; }))).not.toContain('recalculated');
  });
  it('no coincidental match: not a sub-dollar figure against a 0 field, not one field of a document cited for several', () => {
    expect(methods('F8949.A.X92')).not.toContain('agreed_to_source_document');   // a gain of -0.13 is not "a 0 field"
    expect(methods('F8949.B.N1')).not.toContain('agreed_to_source_document');    // proceeds, basis and dates from one form
    expect(methods('SchC.11')).toContain('agreed_to_source_document');           // books total; the 1099s are other documents
  });
  it('a line with no numeric source and no inputs gets no proof', () => {
    expect(proofsFor(ix, 'SchB.8')).toEqual([]);
  });
});

describe('agreed to a third-party record: an independent copy of the same fact agrees', () => {
  it('a payment line agreeing with the agency record', () => {
    const pr = proofsFor(ix, 'Sch3.10').find((q) => q.method === 'agreed_to_third_party_record')!;
    expect(pr).toBeDefined();
    expect(pr.text).toMatch(/^Confirmed by an independent source: /);
    expect(pr.text).toMatch(/36,000/);
    expect(pr.refs.some((r) => r.startsWith('agency:'))).toBe(true);
  });
  it('an information-return box agreeing with its line, though the line does not cite it', () => {
    const q = altered((x) => { line(x, 'F8283.A1.vehicle').value = 2900; });
    const pr = proofsFor(q, 'F8283.A1.vehicle').find((r) => r.method === 'agreed_to_third_party_record')!;
    expect(pr).toBeDefined();
    expect(pr.text).toMatch(/2,900/);
  });
  it('a dependent whose number agrees with last year’s return (last 4 only)', () => {
    const pr = proofsFor(ix, 'F8812.6').find((q) => q.method === 'agreed_to_third_party_record')!;
    expect(pr).toBeDefined();
    expect(pr.text).toMatch(/ending \d{4}/);
    expect(pr.text).not.toMatch(/\d{3}-\d{2}-\d{4}/);
  });
  it('never on a line whose copies disagree', () => {
    for (const k of ['F1040.26', 'F540NR.72', 'SchB.1.2', 'SchB.1.6', 'F8283.A1.vehicle', 'F8949.B.N1', 'F8812.4', 'F540NR.39']) {
      expect(methods(k), k).not.toContain('agreed_to_third_party_record');
    }
  });
  it('only an exact match with a copy the line does not cite is independent; never an inequality', () => {
    const got = ix.latest.lines.filter((l) => methods(l.key).includes('agreed_to_third_party_record')).map((l) => l.key).sort();
    expect(got).toEqual(['F2441.12', 'F8812.6', 'Sch3.10']);   // SchC.1 (at least the 1099s, a double count) is not one
  });
  it('rests only on records in the story by then: no receipt from a record dated later', () => {
    const at = (t: string) => proofsFor(ix, 'Sch3.10', t).map((q) => q.method);
    expect(at('2026-06-23T06:05:00Z')).not.toContain('agreed_to_third_party_record');   // agency snapshot dated 3 Aug 2026
    expect(at('2026-08-10T00:00:00Z')).toContain('agreed_to_third_party_record');
  });
  it('goes silent when the agency record no longer agrees', () => {
    const q = altered((x) => { line(x, 'Sch3.10').value = 35000; });
    expect(methods('Sch3.10', q)).not.toContain('agreed_to_third_party_record');
  });
});
