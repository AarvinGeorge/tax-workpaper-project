// Scores what was found against the perturbed packet's planted list (tests/fixtures/perturbed.ts), offline. The planted
// list is the gold, with the harness's strict rule (harness-core.ts matchesStrict): a finding, sweep item or suggestion
// matches a plant when one of its claim lines is in the plant's claim set. A claim on the planted line itself is
// counted apart from one on a cascade line only (an ancestor the delta moved). Scoring side only: agent code never
// imports this file, and nothing here reaches the model.
import type { AiPayload } from '../../src/domain/ai/contract';
import type { Finding } from '../../src/domain/contracts';
import type { PacketIndex } from '../../src/domain/packet/load';
import type { Plant } from '../../tests/fixtures/perturbed';
import { isGrounded } from './reader-core';

/** A verify_all item (Task 1): its line key, or line keys among its ids or lines. */
export interface SweepItem { kind: string; key?: string; ids?: string[]; lines?: string[] }
export type Claimant = { id: string; lines: string[] };
export interface PlantMatch { kind: Plant['kind']; lines: string[]; onLine: boolean; onCascade: boolean; by: string[] }
export interface KindTally { plants: number; onLine: number; onCascadeOnly: number }
export interface PlantedScore {
  /** findings | items | payload */
  source: 'findings' | 'items' | 'payload';
  /** Claimants scored: new findings only when a baseline is given; grounded suggestions only for a payload. */
  considered: number; matched: number; precision: number;
  perPlant: PlantMatch[]; perKind: Record<string, KindTally>;
}

const lineKey = (c: string) => c.replace(/^line:/, '');
const findingKey = (f: Pick<Finding, 'checkId' | 'claims'>) => `${f.checkId}|${[...f.claims].sort().join(',')}`;

function claimants(ix: PacketIndex, source: Finding[] | SweepItem[] | AiPayload, baseline?: Finding[]): { source: PlantedScore['source']; list: Claimant[] } {
  if (!Array.isArray(source)) {
    const grounded = source.suggestions.filter((s) => isGrounded(ix, s));
    return { source: 'payload', list: grounded.map((s) => ({ id: s.id, lines: s.claims.map(lineKey) })) };
  }
  if (source.length && 'checkId' in source[0]) {
    const known = new Set((baseline ?? []).map(findingKey));
    const fresh = (source as Finding[]).filter((f) => !known.has(findingKey(f)));
    return { source: 'findings', list: fresh.map((f) => ({ id: f.id ?? f.checkId, lines: f.claims.filter((c) => c.startsWith('line:')).map(lineKey) })) };
  }
  const isLine = (k: string) => !!ix.line(ix.latest.version, k);
  return {
    source: 'items',
    list: (source as SweepItem[]).map((it, i) => ({
      id: `${it.kind}#${i}`, lines: [...new Set([...(it.key ? [it.key] : []), ...(it.lines ?? []), ...(it.ids ?? [])].map(lineKey).filter(isLine))],
    })),
  };
}

/** One source scored against the plants. `baseline` (findings of the real packet) keeps only new findings. */
export function plantedScore(ix: PacketIndex, planted: Plant[], source: Finding[] | SweepItem[] | AiPayload, opts: { baseline?: Finding[] } = {}): PlantedScore {
  const { source: kind, list } = claimants(ix, source, opts.baseline);
  const perPlant: PlantMatch[] = planted.map((p) => {
    const own = new Set(p.lines); const cascade = new Set(p.claims.filter((c) => !own.has(c)));
    const onLine = list.filter((c) => c.lines.some((l) => own.has(l)));
    const onCascade = list.filter((c) => !c.lines.some((l) => own.has(l)) && c.lines.some((l) => cascade.has(l)));
    return { kind: p.kind, lines: p.lines, onLine: onLine.length > 0, onCascade: onLine.length === 0 && onCascade.length > 0, by: [...onLine, ...onCascade].map((c) => c.id) };
  });
  const all = new Set(planted.flatMap((p) => p.claims));
  const matched = list.filter((c) => c.lines.some((l) => all.has(l))).length;
  const perKind: Record<string, KindTally> = {};
  planted.forEach((p, i) => {
    const t = (perKind[p.kind] ??= { plants: 0, onLine: 0, onCascadeOnly: 0 });
    t.plants++;
    if (perPlant[i].onLine) t.onLine++;
    else if (perPlant[i].onCascade) t.onCascadeOnly++;
  });
  return { source: kind, considered: list.length, matched, precision: list.length ? matched / list.length : 0, perPlant, perKind };
}

export interface PlantedReport {
  checks: PlantedScore; sweep: PlantedScore | null; agent: PlantedScore | null;
  /** Per kind: plants, checks caught, sweep surfaced, agent recorded (null until that source is given). */
  perKind: Record<string, { plants: number; checks: KindTally; sweep: KindTally | null; agent: KindTally | null }>;
}

/** The per-kind triple: runChecks on the perturbed packet (new findings only), verify_all items, an agent payload. */
export function plantedReport(ix: PacketIndex, planted: Plant[], o: { findings: Finding[]; baseline: Finding[]; sweep?: SweepItem[]; agent?: AiPayload }): PlantedReport {
  const checks = plantedScore(ix, planted, o.findings, { baseline: o.baseline });
  const sweep = o.sweep ? plantedScore(ix, planted, o.sweep) : null;
  const agent = o.agent ? plantedScore(ix, planted, o.agent) : null;
  const perKind: PlantedReport['perKind'] = {};
  for (const k of Object.keys(checks.perKind)) {
    perKind[k] = { plants: checks.perKind[k].plants, checks: checks.perKind[k], sweep: sweep?.perKind[k] ?? null, agent: agent?.perKind[k] ?? null };
  }
  return { checks, sweep, agent, perKind };
}
