// The same-fact engine (src/domain/facts.ts): every copy of one fact compared. Each rule fires on the real packet
// where its copies disagree, goes silent once they agree, and fires on a new case it was not written for. Ids and
// figures are allowed here; facts.ts and box-map.ts name none.
import { describe, expect, it } from 'vitest';
import { indexPacket } from '@/domain/packet/load';
import type { Packet } from '@/domain/packet/types';
import { sameFacts, type SameFactRule } from '@/domain/facts';
import { BOX_MAP, boxAgrees } from '@/domain/forms/box-map';
import { altered, latestLine, realIx, refResolves, value, doc } from './checks/helpers';
import { alteredPacket, REMOVED_FORM } from '../fixtures/altered';

const ix = realIx();
const ixOf = (mutate: (p: Packet) => void) => indexPacket(altered(mutate));
const disputed = (x: typeof ix, rule: SameFactRule) => sameFacts(x).filter((c) => c.rule === rule && !c.agree).flatMap((c) => c.claims);
const agreed = (x: typeof ix, rule: SameFactRule) => sameFacts(x).filter((c) => c.rule === rule && c.agree).flatMap((c) => c.claims);
const page = (p: Packet, d: string, n: number) => doc(p, d).pages.find((x) => x.page === n)!;

describe('box-map: the IRS form-box to return-line table', () => {
  it('names a comparison mode for every entry and only README form-line codes as fixed targets', () => {
    expect(BOX_MAP.length).toBeGreaterThan(10);
    for (const e of BOX_MAP) {
      expect(['equal', 'at_least', 'at_most', 'net', 'converted']).toContain(e.mode);
      if (typeof e.line === 'string') expect(e.line).toMatch(/^(F\d{3,4}[A-Z]*|Sch[A-Z0-9]+)\.[0-9]+[a-z]?$/);
      if (e.mode === 'net') expect(e.minus).toBeTruthy();
    }
  });

  it('comparison modes: equal within a dollar; at least the sum; at most the box', () => {
    expect(boxAgrees('equal', 100, 100.4)).toBe(true);
    expect(boxAgrees('equal', 100, 102)).toBe(false);
    expect(boxAgrees('at_least', 154400, 163700)).toBe(true);
    expect(boxAgrees('at_least', 154400, 150000)).toBe(false);
    expect(boxAgrees('at_most', 2900, 2900)).toBe(true);
    expect(boxAgrees('at_most', 2900, 6000)).toBe(false);
    expect(boxAgrees('net', 6800, 6800)).toBe(true);
    expect(boxAgrees('converted', 1871, 1747)).toBe(false);
  });

  it('a target line missing from the return is skipped, never an error', () => {
    const x = indexPacket(alteredPacket());
    expect(() => sameFacts(x)).not.toThrow();
    expect(sameFacts(x).flatMap((c) => c.claims).some((c) => c.startsWith(`line:${REMOVED_FORM}.`))).toBe(false);
    // On the real packet each fixed target either exists or has no comparison.
    for (const e of BOX_MAP) if (typeof e.line === 'string' && !ix.line(ix.latest.version, e.line)) {
      expect(sameFacts(ix).some((c) => c.claims.includes(`line:${e.line}`))).toBe(false);
    }
  });
});

describe('rule 1: added twice, not corroborated', () => {
  it('fires on the real packet: one account on two forms, a lender statement inside its 1098, a page scanned twice', () => {
    const c = disputed(ix, 'added-twice');
    expect(c).toContain('line:SchB.1.2');
    expect(c).toContain('line:SchA.8a');
    expect(c).toContain('line:SchC.44a');
    // The payoff statement is counted once, with the ledger's effect (it pairs with the 1098's interest and its points).
    const d01 = sameFacts(ix).filter((x) => x.rule === 'added-twice' && x.claims.includes('line:SchA.8a'));
    expect(d01).toHaveLength(1);
    expect(Math.abs((d01[0].effect?.federal ?? 0) - 559)).toBeLessThanOrEqual(2);
  });
  it('goes silent once the copies are separate facts', () => {
    expect(disputed(ixOf((p) => { const pg = page(p, 'D29', 1); pg.printed_content = pg.printed_content.replace('ending 7731', 'ending 9999'); }), 'added-twice')).not.toContain('line:SchB.1.2');
    expect(disputed(ixOf((p) => { page(p, 'D56', 1).printed_content = page(p, 'D56', 1).printed_content.replace(/\(Interest is reported[^)]*\)/, ''); }), 'added-twice')).not.toContain('line:SchA.8a');
    expect(disputed(ixOf((p) => { p.extracted_values.find((v) => v.document_id === 'D23' && v.page === 3 && v.field === 'trip1_miles')!.value = 131; }), 'added-twice')).not.toContain('line:SchC.44a');
  });
  it('negative: two payers with equal amounts on different accounts are two facts', () => {
    // Two banks each pay 312 on their own account; the same edit with one account number is a double count.
    const twoBanks = (b: string) => ixOf((p) => {
      page(p, 'D32', 1).printed_content += ' Recipient taxpayer: interest on savings account ending 1111.';
      page(p, 'D33', 1).printed_content += ` Recipient taxpayer: interest on savings account ending ${b}.`;
      value(p, 'ev-0858').value = 312; latestLine(p, 'SchB.1.5').value = 312;
    });
    expect(disputed(twoBanks('2222'), 'added-twice').filter((c) => /SchB\.1\.[45]$/.test(c))).toEqual([]);
    expect(disputed(twoBanks('1111'), 'added-twice')).toContain('line:SchB.1.5');
  });
  it('fires on a new case: both copies of one duplicated W-2 added into wages', () => {
    const x = ixOf((p) => {
      const l = latestLine(p, 'F1040.1a');
      const dup = p.extracted_values.find((v) => v.document_id === 'D10' && v.field === 'box1')!;
      l.sources = [...l.sources, dup.id]; l.value = (l.value as number) + (dup.value as number);
    });
    expect(disputed(x, 'added-twice')).toContain('line:F1040.1a');
  });
});

describe('rule 2: information-return tie-out', () => {
  it('fires on the real packet: foreign interest at another year’s rate, a car deducted above the charity’s sale price', () => {
    const c = disputed(ix, 'box-to-line');
    expect(c).toContain('line:SchB.1.6');
    expect(c).toContain('line:F8283.A1.vehicle');
    expect(agreed(ix, 'box-to-line')).toContain('line:F1040.1a');
  });
  it('goes silent once the copies agree', () => {
    expect(disputed(ixOf((p) => { latestLine(p, 'F8283.A1.vehicle').value = 2900; }), 'box-to-line')).not.toContain('line:F8283.A1.vehicle');
    expect(disputed(ixOf((p) => { const l = latestLine(p, 'SchB.1.6'); l.sources = ['ev-0960', 'ref:fx.SEK.2025_average']; l.value = 1871; }), 'box-to-line')).not.toContain('line:SchB.1.6');
  });
  it('fires on new cases in each mode: equal, net, at least', () => {
    expect(disputed(ixOf((p) => { latestLine(p, 'F1040.1a').value = 212900; }), 'box-to-line')).toContain('line:F1040.1a');
    expect(disputed(ixOf((p) => { value(p, 'ev-1040').value = 8000; }), 'box-to-line')).toContain('line:F8863.27');
    expect(disputed(ixOf((p) => { latestLine(p, 'SchC.1').value = 150000; }), 'box-to-line')).toContain('line:SchC.1');
  });
  it('negative: a corrected form with its original, where the return cites the corrected one, is no disagreement', () => {
    expect(ix.latest.documents_superseded).toContain('D30');
    const all = [...disputed(ix, 'box-to-line'), ...disputed(ix, 'added-twice')];
    for (const k of ['line:SchB.1.3', 'line:SchB.5.2', 'line:F1040.3a']) expect(all).not.toContain(k);
  });
});

describe('rule 3: payments three ways', () => {
  it('fires on the real packet: federal and California estimates disagree with the agency record', () => {
    const c = disputed(ix, 'payments');
    expect(c).toContain('line:F1040.26');
    expect(c).toContain('line:F540NR.72');
    expect(agreed(ix, 'payments')).toContain('line:Sch3.10');
  });
  it('goes silent once the agency record agrees', () => {
    const x = ixOf((p) => {
      for (const s of p.tax_agency_records.irs_account_transcript_2025 as { transactions: { date: string; amount: unknown }[] }[]) {
        for (const t of s.transactions) if (t.date === '2026-01-15') t.amount = 4000;
      }
    });
    expect(disputed(x, 'payments')).not.toContain('line:F1040.26');
  });
  it('negative: a payment designated for another year left out of the line is no disagreement', () => {
    const x = ixOf((p) => {
      const l = latestLine(p, 'F540NR.72');
      l.value = 10500; l.sources = l.sources.filter((s) => !['ev-1074', 'ev-1075', 'ev-1076'].includes(s));
    });
    expect(disputed(x, 'payments')).not.toContain('line:F540NR.72');
    expect(agreed(x, 'payments')).toContain('line:F540NR.72');
  });
});

describe('rule 4: lot matching across statements', () => {
  it('fires on the real packet: three RSU lots at the broker’s blank basis while the supplement gives one', () => {
    const c = disputed(ix, 'lot');
    for (const k of ['line:F8949.B.N1', 'line:F8949.B.N3', 'line:F8949.E.N4']) expect(c).toContain(k);
    expect(c).not.toContain('line:F8949.A.N2'); // the ESPP line cites the supplement's adjusted basis
  });
  it('goes silent once the copies agree', () => {
    expect(disputed(ixOf((p) => { value(p, 'ev-0066').value = 0; }), 'lot')).not.toContain('line:F8949.B.N1');
  });
});

describe('rule 5: identifier copies', () => {
  it('fires on the real packet on the lines that rest on the person (last 4 only in all text)', () => {
    const c = sameFacts(ix).filter((x) => x.rule === 'identifier' && !x.agree);
    expect(c.flatMap((x) => x.claims)).toContain('line:F8812.4');
    const ssns = ix.packet.household.people.map((p) => String(p.ssn ?? '').replace(/\D/g, '')).filter((s) => s.length === 9);
    for (const x of sameFacts(ix)) {
      const text = JSON.stringify(x).replace(/\D/g, ' ');
      for (const s of ssns) expect(text).not.toContain(s);
    }
  });
  it('goes silent once the organizer agrees with the card, and fires for another person', () => {
    const fixed = ixOf((p) => {
      const card = p.extracted_values.find((v) => v.document_id === 'D71' && v.value_type === 'ssn')!;
      p.household.people.find((x) => x.id === 'theo')!.ssn = String(card.value);
    });
    expect(disputed(fixed, 'identifier')).toEqual([]);
    const ada = ixOf((p) => { const a = p.household.people.find((x) => x.id === 'ada')!; a.ssn = a.ssn!.slice(0, -2) + a.ssn!.slice(-1) + a.ssn!.slice(-2, -1); });
    expect(disputed(ada, 'identifier')).toContain('line:F8812.6');
  });
});

describe('every comparison is well formed', () => {
  it('copies resolve, and a disagreement sits on a line of the latest return or a document', () => {
    for (const c of sameFacts(ix)) {
      expect(c.copies.length).toBeGreaterThan(1);
      for (const r of c.copies.map((x) => x.ref).filter((r): r is string => !!r)) expect(refResolves(ix, r), `${c.rule} ${r}`).toBe(true);
      for (const k of c.claims) {
        if (k.startsWith('line:')) expect(ix.line(ix.latest.version, k.slice(5)), k).toBeDefined();
        else expect(k).toMatch(/^doc:/);
      }
    }
  });
});
