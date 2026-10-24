// The measurement gate for the same-fact checks (family "Two sources disagree", CHK-SAME-FACT-*). On the real packet
// they must reach the ledger findings a copy comparison can reach BEFORE yielding (a zero proven able to be non-zero),
// and then add no row: every draft sits on a claim a specific check already makes, at every story time.
import { afterEach, describe, expect, it } from 'vitest';
import { CHECKS, runChecks } from '@/domain/checks';
import { LEDGER } from '@/domain/checks/catalogue';
import type { Check, Draft } from '@/domain/checks/util';
import { indexPacket, type PacketIndex } from '@/domain/packet/load';
import { alteredPacket } from '../../fixtures/altered';
import { realIx } from './helpers';

const SAME = CHECKS.filter((c) => c.id.startsWith('CHK-SAME-FACT-'));
const drafts = (x: PacketIndex) => SAME.flatMap((c) => c.run(x).map((d) => ({ checkId: c.id, ...d })));

/** runChecks with the same-fact checks taken out of the library (restored after each test). */
let removed: Check[] = [];
function withoutSameFact<T>(f: () => T): T {
  removed = CHECKS.filter((c) => SAME.includes(c));
  for (const c of removed) CHECKS.splice(CHECKS.indexOf(c), 1);
  try { return f(); } finally { CHECKS.push(...removed); removed = []; }
}
afterEach(() => { if (removed.length) CHECKS.push(...removed); removed = []; });

const storyTimes = (x: PacketIndex) => [undefined, ...new Set([
  ...runChecks(x).map((f) => f.firstVisibleAt).filter((t): t is string => !!t),
  ...x.versions.map((v) => v.computed_at), '2026-03-05T00:00:00Z',
])];
const rows = (x: PacketIndex, at?: string) => runChecks(x, at).map((f) => f.id).sort();

describe('the same-fact checks', () => {
  it('are five safety nets in the "Two sources disagree" family', () => {
    expect(SAME.map((c) => c.id).sort()).toEqual([
      'CHK-SAME-FACT-ADDED-TWICE', 'CHK-SAME-FACT-BOX-TO-LINE', 'CHK-SAME-FACT-IDENTIFIER', 'CHK-SAME-FACT-LOT', 'CHK-SAME-FACT-PAYMENTS',
    ]);
    for (const c of SAME) { expect(c.yields).toBe(true); expect(c.family).toBe('Two sources disagree'); }
  });
});

describe('measurement gate on the real packet', () => {
  const ix = realIx();
  const specific = runChecks(ix);
  const claimsOf = (id: string) => new Set(specific.filter((f) => f.ledgerIds.includes(id)).flatMap((f) => f.claims));

  it('before yielding: at least 9 drafts, each on a claim the specific check for A01, A03, A04, A05, B01, B02, C02, D01, D03 makes', () => {
    const NINE = ['GT-A01', 'GT-A03', 'GT-A04', 'GT-A05', 'GT-B01', 'GT-B02', 'GT-C02', 'GT-D01', 'GT-D03'];
    const ds = drafts(ix);
    let on = 0;
    for (const id of NINE) {
      const claims = claimsOf(id);
      expect(claims.size, `${id} has a specific finding`).toBeGreaterThan(0);
      const hits = ds.filter((d) => d.claims.some((c) => claims.has(c)));
      expect(hits.length, `no same-fact draft on ${id} (${[...claims].join(', ')})`).toBeGreaterThan(0);
      on += hits.length;
    }
    expect(on).toBeGreaterThanOrEqual(9);
  });

  it('after yielding: no row added and the blockers unchanged, at every story time', () => {
    for (const at of storyTimes(ix)) {
      const without = withoutSameFact(() => rows(ix, at));
      expect(rows(ix, at), `story time ${at ?? 'latest'}`).toEqual(without);
    }
    // 11 blockers as of the last computation (the late crypto answer adds a 12th after it, as before).
    expect(runChecks(ix, ix.latest.computed_at).filter((f) => f.severity === 'blocker')).toHaveLength(11);
  });

  it('the shared altered fixture (renamed people, a form removed) yields no new rows either', () => {
    const x = indexPacket(alteredPacket());
    expect(drafts(x).length).toBeGreaterThan(0);
    for (const at of storyTimes(x)) expect(rows(x, at), `story time ${at ?? 'latest'}`).toEqual(withoutSameFact(() => rows(x, at)));
  });

  it('measurement: ledger entries reached on their own, and drafts that touch no ledger entry', () => {
    const ds: (Draft & { checkId: string })[] = drafts(ix);
    const touches = (d: Draft, e: (typeof LEDGER)[number]) => d.claims.some((c) => e.claims.includes(c))
      || e.claims.filter((c) => c.startsWith('doc:')).some((c) => d.evidence.some((r) => r === c || r.startsWith(`${c}#`)));
    const reached = LEDGER.filter((e) => ds.some((d) => touches(d, e))).map((e) => e.id);
    const noise = ds.filter((d) => !LEDGER.some((e) => touches(d, e)));
    console.log(`[same-fact] drafts ${ds.length}; ledger entries reached ${reached.length}/27: ${reached.join(' ')}; drafts touching no entry ${noise.length}${noise.length ? `: ${noise.map((d) => `${d.checkId} ${d.claims.join(',')}`).join(' | ')}` : ''}`);
    expect(reached.length).toBeGreaterThanOrEqual(9);
    expect(noise).toEqual([]);
  });
});
