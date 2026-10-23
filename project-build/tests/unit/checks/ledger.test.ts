// One test per ledger finding: its check fires on the real packet, on the claim the ledger names, with evidence that
// resolves and the tax effect the ledger records (ids and figures are allowed here; the checks never name them).
import { describe, expect, it } from 'vitest';
import { runChecks } from '@/domain/checks';
import { LEDGER } from '@/domain/checks/catalogue';
import { realIx, refResolves } from './helpers';

// ledger id -> a claim the finding must sit on, and the ledger's tax effect (federal, California) or null when the
// ledger records none. Sign: + means the return currently understates tax or balance due.
const EXPECT: Record<string, { claim: string; fed: number | null; ca: number | null }> = {
  'GT-A01': { claim: 'line:F8949.B.N1', fed: -15536, ca: -2445 }, // CA: only N1, N3 sold during CA residency (R-CA-CAPGAIN-SOURCE)
  'GT-A02': { claim: 'line:SchCA540NR.1.E', fed: null, ca: -5685 },
  'GT-A03': { claim: 'line:F540NR.72', fed: null, ca: 3500 },
  'GT-A04': { claim: 'line:F1040.26', fed: 1000, ca: null },
  'GT-A05': { claim: 'line:F8812.4', fed: null, ca: null },
  'GT-A06': { claim: 'line:Sch1.17', fed: 4464, ca: 605 },
  'GT-A07': { claim: 'line:F2441.1b', fed: null, ca: null },
  'GT-A08': { claim: 'line:F2441.1a', fed: null, ca: null },
  'GT-B01': { claim: 'line:SchB.1.2', fed: -640, ca: -127 },
  'GT-B02': { claim: 'line:SchB.1.6', fed: 43, ca: 9 },
  'GT-B03': { claim: 'line:F8949.H.C6', fed: -1312, ca: -195 },
  'GT-B04': { claim: 'doc:D31', fed: -21, ca: 0 },     // CA: M18 sold 2025-12-15, after the move
  'GT-B05': { claim: 'doc:D07', fed: null, ca: null },
  'GT-C01': { claim: 'line:SchC.1', fed: -4402, ca: -384 },
  'GT-C02': { claim: 'line:SchC.44a', fed: 919, ca: 80 },
  'GT-C04': { claim: 'line:SchC.25', fed: 541, ca: 47 },
  'GT-C05': { claim: 'line:SchE.14A', fed: 3633, ca: 896 },
  'GT-C06': { claim: 'line:F4562-C.12', fed: 0, ca: -1050 },
  'GT-C07': { claim: 'line:Sch1.16', fed: null, ca: null },
  'GT-C08': { claim: 'line:SchC.30', fed: 195, ca: 17 },
  'GT-C10': { claim: 'doc:D06', fed: null, ca: null },
  'GT-D01': { claim: 'line:SchA.8a', fed: 559, ca: 103 },
  'GT-D02': { claim: 'line:SchA.5b', fed: 1462, ca: 332 },
  'GT-D03': { claim: 'line:F8283.A1.vehicle', fed: 806, ca: 149 },
  'GT-D04': { claim: 'line:ScheduleS.credit', fed: null, ca: 209 },
  'GT-D05': { claim: 'line:F2210.19', fed: -147, ca: null },
  'GT-D06': { claim: 'line:SchCA540NR.1.D', fed: null, ca: null },
};

describe('ledger catalogue', () => {
  it('lists the 27 distinct ledger findings, with the two merged duplicates as aliases', () => {
    expect(LEDGER).toHaveLength(27);
    expect(new Set(LEDGER.map((e) => e.id)).size).toBe(27);
    expect(LEDGER.map((e) => e.id).sort()).toEqual(Object.keys(EXPECT).sort());
    const aliases = LEDGER.flatMap((e) => e.aliases ?? []);
    expect(aliases.sort()).toEqual(['GT-C03', 'GT-C09']);
    for (const e of LEDGER) {
      expect(e.checkIds.length).toBeGreaterThan(0);
      expect(e.title).not.toMatch(/—/);
      expect(e.surfaced).not.toMatch(/—/);
    }
  });
});

describe('every ledger finding is surfaced on the real packet', () => {
  const ix = realIx();
  const findings = runChecks(ix);

  for (const id of Object.keys(EXPECT)) {
    it(`${id} is surfaced by its check`, () => {
      const entry = LEDGER.find((e) => e.id === id)!;
      const hits = findings.filter((f) => f.ledgerIds.includes(id));
      expect(hits.length, `no finding carries ${id}`).toBeGreaterThan(0);
      for (const f of hits) {
        expect(entry.checkIds).toContain(f.checkId);
        for (const a of entry.aliases ?? []) expect(f.ledgerIds).toContain(a);
        expect(f.evidence.length).toBeGreaterThan(0);
        for (const r of f.evidence) expect(refResolves(ix, r), `${id} evidence ${r} does not resolve`).toBe(true);
        for (const c of f.claims) {
          if (c.startsWith('line:')) expect(ix.line(ix.latest.version, c.slice(5)), c).toBeDefined();
          else expect(c).toMatch(/^doc:/);
        }
      }
      const exp = EXPECT[id];
      const main = hits.find((f) => f.claims.includes(exp.claim));
      expect(main, `${id} not on ${exp.claim}; claims ${hits.map((h) => h.claims.join(',')).join(' | ')}`).toBeDefined();
      if (exp.fed === null && exp.ca === null) return;
      expect(main!.effect).toBeDefined();
      if (exp.fed !== null) expect(Math.abs((main!.effect!.federal ?? 0) - exp.fed)).toBeLessThanOrEqual(2);
      if (exp.ca !== null) expect(Math.abs((main!.effect!.california ?? 0) - exp.ca)).toBeLessThanOrEqual(2);
    });
  }

  it('every finding is well formed: wording without em dashes, severity set, evidence resolves', () => {
    for (const f of findings) {
      expect(f.id).toBeTruthy();
      expect(['blocker', 'check', 'judgment', 'info']).toContain(f.severity);
      expect(f.title + f.explanation + (f.plain ?? '')).not.toMatch(/—/);
      for (const r of f.evidence) expect(refResolves(ix, r), `${f.checkId} evidence ${r}`).toBe(true);
    }
    expect(new Set(findings.map((f) => f.id)).size).toBe(findings.length);
  });

  it('raises nothing beyond the ledger on the real packet (no false alarms)', () => {
    const extra = findings.filter((f) => f.ledgerIds.length === 0);
    expect(extra.map((f) => `${f.checkId} ${f.claims.join(',')}`)).toEqual([]);
  });

  it('a sale dated after the move to Texas has no California effect (R-CA-CAPGAIN-SOURCE sources sales by date)', () => {
    const eff = (id: string) => findings.find((f) => f.ledgerIds.includes(id))!.effect!;
    expect(eff('GT-B04').california).toBe(0);                 // M18 sold 2025-12-15
    expect(eff('GT-A01').california).toBe(-2445);             // N1, N3 in residency; N4 sold 2025-08-12 adds nothing
  });

  it('does not repeat engine diagnostics as findings', () => {
    const codes = new Set(ix.versions.flatMap((v) => v.diagnostics.map((d) => d.code)));
    for (const f of findings) expect(codes.has(f.checkId)).toBe(false);
  });

  it('severity follows the firm rule: over the partner threshold or stopping e-file is a blocker', () => {
    const sev = (id: string) => findings.find((f) => f.ledgerIds.includes(id))!.severity;
    expect(sev('GT-A01')).toBe('blocker');   // 15,536 federal
    expect(sev('GT-A03')).toBe('blocker');   // 3,500 California
    expect(sev('GT-A05')).toBe('blocker');   // stops e-file
    expect(sev('GT-B02')).not.toBe('blocker'); // 43 federal
    expect(sev('GT-C08')).toBe('judgment');
  });

  it('sets firstVisibleAt from the evidence the finding depends on', () => {
    const at = (id: string) => findings.find((f) => f.ledgerIds.includes(id))!.firstVisibleAt;
    const msg07 = ix.packet.client.messages.find((m) => m.id === 'msg-07')!.sent_at;
    expect(at('GT-B03')).toBe(msg07);                       // the client's cost arrived after v3
    expect(at('GT-A03')! <= ix.latest.computed_at).toBe(true); // visible on the return as computed
    for (const f of findings) expect(Number.isNaN(Date.parse(f.firstVisibleAt ?? ''))).toBe(false);
  });

  it('asOf limits the result to findings visible by then', () => {
    const before = runChecks(ix, ix.latest.computed_at);
    expect(before.some((f) => f.ledgerIds.includes('GT-B03'))).toBe(false);
    expect(before.some((f) => f.ledgerIds.includes('GT-A03'))).toBe(true);
  });
});
