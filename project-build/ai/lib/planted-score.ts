// Scores what was found against the perturbed packet's planted list (tests/fixtures/perturbed.ts), offline. The planted
// list is the gold, with the harness's strict rule (harness-core.ts matchesStrict): a finding, sweep item or suggestion
// matches a plant when one of its claim lines is in the plant's claim set. A claim on the planted line itself is
// counted apart from one on a cascade line only (an ancestor the delta moved). Attributable (neither a hit nor a false
// positive, out of precision's denominator) is per plant: a claimant that hits no plant's claim set is attributable to
// plant P only when it claims one of P's stale parents (an input moved, the engine-only value did not) AND names P's
// source (plantSources: an id or document P changed, or one P's planted lines cite). A claim on a stale top line that
// names nothing is a false positive, so a shotgun of top-line claims cannot buy precision. Scoring side only: agent
// code never imports this file, and nothing here reaches the model.
import type { AiPayload } from '../../src/domain/ai/contract';
import type { Finding } from '../../src/domain/contracts';
import type { PacketIndex } from '../../src/domain/packet/load';
import type { Plant } from '../../tests/fixtures/perturbed';
import { isGrounded } from './reader-core';

/** A verify_all item (Task 1): its line key, or line keys among its ids or lines. */
export interface SweepItem { kind: string; key?: string; ids?: string[]; lines?: string[] }
/** lines: the line keys it claims; refs: the ids and document ids it names (evidence, compared ids). */
export type Claimant = { id: string; lines: string[]; refs: string[] };
/** onStale: some claimant claims one of the plant's stale parents (descriptive); attributable: claimants attributed to
 *  this plant (on a stale parent, naming its source, hitting no plant). */
export interface PlantMatch { kind: Plant['kind']; lines: string[]; onLine: boolean; onCascade: boolean; onStale: boolean; attributable: number; by: string[] }
export interface KindTally { plants: number; onLine: number; onCascadeOnly: number }
export interface PlantedScore {
  /** findings | items | payload */
  source: 'findings' | 'items' | 'payload';
  /** Claimants scored: new findings only when a baseline is given; grounded suggestions only for a payload. */
  considered: number; matched: number;
  /** Claimants attributable to a plant (see the header; no claim set hit): reported apart, out of precision's
   *  denominator. Every report prints it beside precision. */
  attributable: number; falsePositives: number;
  /** matched / (considered - attributable) */
  precision: number;
  perPlant: PlantMatch[]; perKind: Record<string, KindTally>;
}

const lineKey = (c: string) => c.replace(/^line:/, '');
/** An id and the document it sits in: ev-NNNN (its document), doc:Dnn#pageN (Dnn), Dnn#N or Dnn (Dnn). */
function refsOf(ix: PacketIndex, ref: string): string[] {
  const out = [ref];
  if (ref.startsWith('ev-')) { const d = ix.valueById.get(ref)?.document_id; if (d) out.push(d); }
  const m = ref.match(/^(?:doc:)?(D\d+)(?:#|$)/);
  if (m) out.push(m[1]);
  return out;
}
/** What names a plant's source: the ids and documents its refs changed (documents/<D>, extracted_values/<ev>) and the
 *  sources (and their documents) of its planted lines in the latest return. */
export function plantSources(ix: PacketIndex, p: Plant): { ids: Set<string>; docs: Set<string> } {
  const ids = new Set<string>(); const docs = new Set<string>();
  const add = (r: string) => { for (const x of refsOf(ix, r)) (/^D\d+$/.test(x) ? docs : ids).add(x); };
  for (const r of p.refs) {
    const d = r.path.match(/^documents\/(D\d+)/); if (d) docs.add(d[1]);
    const v = r.path.match(/^extracted_values\/(ev-\d+)/); if (v) add(v[1]);
  }
  for (const k of p.lines) for (const src of ix.line(ix.latest.version, k)?.sources ?? []) add(String(src));
  return { ids, docs };
}
const findingKey = (f: Pick<Finding, 'checkId' | 'claims'>) => `${f.checkId}|${[...f.claims].sort().join(',')}`;

function claimants(ix: PacketIndex, source: Finding[] | SweepItem[] | AiPayload, baseline?: Finding[]): { source: PlantedScore['source']; list: Claimant[] } {
  if (!Array.isArray(source)) {
    const grounded = source.suggestions.filter((s) => isGrounded(ix, s));
    return { source: 'payload', list: grounded.map((s) => ({ id: s.id, lines: s.claims.map(lineKey), refs: [...new Set(s.evidence.map((e) => e.doc))] })) };
  }
  if (!source.length || 'checkId' in source[0]) { // an empty list has nothing to score, whatever its source
    const known = new Set((baseline ?? []).map(findingKey));
    const fresh = (source as Finding[]).filter((f) => !known.has(findingKey(f)));
    return { source: 'findings', list: fresh.map((f) => ({
      id: f.id ?? f.checkId, lines: f.claims.filter((c) => c.startsWith('line:')).map(lineKey),
      refs: [...new Set([...(f.evidence ?? []), ...f.claims.filter((c) => !c.startsWith('line:'))].flatMap((r) => refsOf(ix, String(r))))],
    })) };
  }
  const isLine = (k: string) => !!ix.line(ix.latest.version, k);
  return {
    source: 'items',
    list: (source as SweepItem[]).map((it, i) => ({
      id: `${it.kind}#${i}`, lines: [...new Set([...(it.key ? [it.key] : []), ...(it.lines ?? []), ...(it.ids ?? [])].map(lineKey).filter(isLine))],
      refs: [...new Set((it.ids ?? []).filter((x) => !isLine(lineKey(x))).flatMap((r) => refsOf(ix, r)))],
    })),
  };
}

/** One source scored against the plants. `baseline` (findings of the real packet) keeps only new findings. */
export function plantedScore(ix: PacketIndex, planted: Plant[], source: Finding[] | SweepItem[] | AiPayload, opts: { baseline?: Finding[] } = {}): PlantedScore {
  const { source: kind, list } = claimants(ix, source, opts.baseline);
  const all = new Set(planted.flatMap((p) => p.claims));
  const isHit = (c: Claimant) => c.lines.some((l) => all.has(l));
  const sources = planted.map((p) => plantSources(ix, p));
  /** The plant a non-hit claimant is attributable to (the first, in plant order), or -1. */
  const attributedTo = (c: Claimant) => (isHit(c) ? -1 : planted.findIndex((p, i) => {
    const stale = new Set(p.stale ?? []); const own = new Set(p.lines);
    return c.lines.some((l) => stale.has(l)) && (c.lines.some((l) => own.has(l)) || c.refs.some((r) => sources[i].ids.has(r) || sources[i].docs.has(r)));
  }));
  const owner = list.map(attributedTo);
  const perPlant: PlantMatch[] = planted.map((p, i) => {
    const own = new Set(p.lines); const cascade = new Set(p.claims.filter((c) => !own.has(c)));
    const onLine = list.filter((c) => c.lines.some((l) => own.has(l)));
    const onCascade = list.filter((c) => !c.lines.some((l) => own.has(l)) && c.lines.some((l) => cascade.has(l)));
    const stale = new Set(p.stale ?? []);
    const onStale = list.some((c) => c.lines.some((l) => stale.has(l)));
    return { kind: p.kind, lines: p.lines, onLine: onLine.length > 0, onCascade: onLine.length === 0 && onCascade.length > 0, onStale, attributable: owner.filter((o) => o === i).length, by: [...onLine, ...onCascade].map((c) => c.id) };
  });
  const matched = list.filter(isHit).length;
  const attributable = owner.filter((o) => o >= 0).length;
  const scored = list.length - attributable;
  const perKind: Record<string, KindTally> = {};
  planted.forEach((p, i) => {
    const t = (perKind[p.kind] ??= { plants: 0, onLine: 0, onCascadeOnly: 0 });
    t.plants++;
    if (perPlant[i].onLine) t.onLine++;
    else if (perPlant[i].onCascade) t.onCascadeOnly++;
  });
  return { source: kind, considered: list.length, matched, attributable, falsePositives: scored - matched, precision: scored ? matched / scored : 0, perPlant, perKind };
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
