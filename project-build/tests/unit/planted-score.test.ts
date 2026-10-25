// Planted-list scoring (ai/lib/planted-score.ts), Task 6 fix: the attributable bucket is per plant, so a shotgun of
// top-line claims on stale parents cannot buy precision. Offline; the perturbed copy is built in memory.
import { describe, expect, it } from 'vitest';
import { indexPacket } from '@/domain/packet/load';
import type { AiPayload } from '@/domain/ai/contract';
import { PERTURBED_SEED, perturbedPacket } from '../fixtures/perturbed';
import { plantSources, plantedScore } from '../../ai/lib/planted-score';

const base = perturbedPacket(PERTURBED_SEED);
const pIx = indexPacket(base.packet);
const allStale = [...new Set(base.planted.flatMap((p) => p.stale))];
const hits = [base.planted[0], base.planted[1]].map((p, i) => ({ checkId: `H${i}`, claims: [`line:${p.lines[0]}`], evidence: [] as string[] }));

describe('planted score: attributable is per plant (a claim on a stale parent that also names that plant\'s source)', () => {
  it('the shotgun probe: seven claims on stale top lines, naming nothing, are false positives (precision 2/9, not 2/2)', () => {
    const shot = allStale.slice(0, 7).map((k, i) => ({ checkId: `S${i}`, claims: [`line:${k}`], evidence: [] as string[] }));
    expect(shot).toHaveLength(7);
    const s = plantedScore(pIx, base.planted, [...hits, ...shot] as never);
    expect(s).toMatchObject({ considered: 9, matched: 2, attributable: 0, falsePositives: 7 });
    expect(s.precision).toBeCloseTo(2 / 9, 10);
  });

  it('one claim on every stale line at once is one false positive', () => {
    const s = plantedScore(pIx, base.planted, [...hits, { checkId: 'ALL', claims: allStale.map((k) => `line:${k}`), evidence: [] }] as never);
    expect(s).toMatchObject({ considered: 3, matched: 2, attributable: 0, falsePositives: 1 });
  });

  it('a stale claim naming the plant\'s source is attributable to that plant only', () => {
    const p = base.planted.find((x) => x.stale.length)!;
    const src = plantSources(pIx, p);
    expect(src.ids.size + src.docs.size).toBeGreaterThan(0);
    const ref = [...src.ids][0] ?? `doc:${[...src.docs][0]}`;
    const s = plantedScore(pIx, base.planted, [{ checkId: 'A', claims: [`line:${p.stale[0]}`], evidence: [ref] }] as never);
    expect(s).toMatchObject({ considered: 1, matched: 0, attributable: 1, falsePositives: 0 });
    const i = base.planted.indexOf(p);
    expect(s.perPlant[i].attributable).toBe(1);
    expect(s.perPlant.filter((_, j) => j !== i).every((x) => x.attributable === 0)).toBe(true);
    // The same source on a stale line of a different plant (whose sources it does not name) is a false positive.
    const other = base.planted.find((x) => x !== p && x.stale.length && !x.stale.includes(p.stale[0]) && !plantSources(pIx, x).ids.has(ref) && ![...plantSources(pIx, x).docs].some((d) => ref.includes(d)));
    if (other) {
      const t = plantedScore(pIx, base.planted, [{ checkId: 'B', claims: [`line:${other.stale[0]}`], evidence: [ref] }] as never);
      expect(t).toMatchObject({ attributable: 0, falsePositives: 1 });
    }
  });

  it('a payload suggestion is attributable when it quotes a document the plant changed and claims one of its stale lines', () => {
    const p = base.planted.find((x) => x.stale.length && plantSources(pIx, x).docs.size)!;
    const doc = pIx.packet.documents.find((d) => plantSources(pIx, p).docs.has(d.id) && d.pages.length)!;
    const quote = doc.pages[0].printed_content.split('\n').map((l) => l.trim()).find((l) => l.length > 12)!;
    const sug = (claims: string[], d = doc.id) => ({ id: `s${claims.join()}`, kind: 'other', claims, evidence: [{ doc: d, page: doc.pages[0].page, quote }], rationale: 'r', confidence: 0.5 });
    const payload = { suggestions: [sug([p.stale[0]])], rejected: [] } as unknown as AiPayload;
    expect(plantedScore(pIx, base.planted, payload)).toMatchObject({ considered: 1, attributable: 1 });
  });

  it('a claimant that qualifies for more than one plant is ambiguous: a false positive (fix round 1)', () => {
    // A shotgun naming every plant's documents and ids: each stale claim qualifies for several plants.
    const every = [...new Set(base.planted.flatMap((p) => { const s = plantSources(pIx, p); return [...s.ids, ...s.docs]; }))];
    const shared = allStale.filter((k) => base.planted.filter((p) => p.stale.includes(k)).length >= 1);
    const shot = shared.slice(0, 7).map((k, i) => ({ checkId: `S${i}`, claims: [`line:${k}`, ...allStale.filter((x) => x !== k).slice(0, 3).map((x) => `line:${x}`)], evidence: every }));
    const s = plantedScore(pIx, base.planted, [...hits, ...shot] as never);
    // Each shot claims stale lines of more than one plant and names all their sources: ambiguous, never attributable.
    const qualifying = (c: { claims: string[] }) => base.planted.filter((p) => c.claims.some((x) => p.stale.includes(x.slice(5)))).length;
    expect(shot.every((c) => qualifying(c) > 1)).toBe(true);
    expect(s).toMatchObject({ considered: 9, matched: 2, attributable: 0, falsePositives: 7 });
    expect(s.precision).toBeCloseTo(2 / 9, 10);
    // The review's probe: seven claims, each on ONE plant's stale line, each naming every plant document. Before this
    // fix the first qualifying plant took each (precision 1.00); naming several plants' sources is now ambiguous.
    const docs = [...new Set(base.planted.flatMap((x) => [...plantSources(pIx, x).docs]))].map((d) => `doc:${d}`);
    const single = allStale.slice(0, 7).map((k, i) => ({ checkId: `T${i}`, claims: [`line:${k}`], evidence: docs }));
    const t = plantedScore(pIx, base.planted, [...hits, ...single] as never);
    expect(t).toMatchObject({ considered: 9, matched: 2, attributable: 0, falsePositives: 7 });
    expect(t.precision).toBeCloseTo(2 / 9, 10);
    // The same stale line naming only its own plant's source stays attributable.
    const p = base.planted.find((x) => x.stale.length && plantSources(pIx, x).docs.size)!;
    const own = [...plantSources(pIx, p).docs].filter((d) => base.planted.filter((y) => plantSources(pIx, y).docs.has(d)).length === 1).map((d) => `doc:${d}`);
    expect(own.length).toBeGreaterThan(0);
    expect(plantedScore(pIx, base.planted, [{ checkId: 'O', claims: [`line:${p.stale[0]}`], evidence: own }] as never)).toMatchObject({ attributable: 1 });
  });

  it('a claim that hits a plant is matched, never attributable, whatever else it claims', () => {
    const s = plantedScore(pIx, base.planted, [{ checkId: 'M', claims: [`line:${base.planted[0].lines[0]}`, `line:${allStale[0]}`], evidence: [] }] as never);
    expect(s).toMatchObject({ matched: 1, attributable: 0, falsePositives: 0 });
  });
});
