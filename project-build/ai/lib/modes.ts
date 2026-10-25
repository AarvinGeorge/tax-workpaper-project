// The agent's measurement modes. 'default' is production. 'blind' takes away the tools that hand over our checks'
// results (run_checks, find_fact_copies) and computes leftovers as if no check had run, so recall on all 27 ledger
// mistakes is a fair comparison with the reader. 'hide-checks' hides a seeded half of the check ids, so the harness can
// score the agent on exactly the ledger entries only those checks reach. The harness recomputes the hidden set from the
// seed (hiddenCheckIds) and the real checks; it never takes it from the agent's output.
import { CHECKS, runChecks } from '../../src/domain/checks/index';
import type { PacketIndex } from '../../src/domain/packet/load';
import type { Finding } from '../../src/domain/contracts';

export type AgentMode = { kind: 'default' } | { kind: 'blind' } | { kind: 'hide-checks'; seed: number };
export const DEFAULT_MODE: AgentMode = { kind: 'default' };

/** mulberry32: a small deterministic PRNG, so a seed always hides the same checks. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A deterministic half (rounded down) of all check ids, chosen by the seed; sorted. */
export function hiddenCheckIds(seed: number): string[] {
  const ids = CHECKS.map((c) => c.id).sort();
  const r = rng(seed);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids.slice(0, Math.floor(ids.length / 2)).sort();
}

/** 'default', 'blind' or 'hide-<seed>': used in file names and prompt versions. */
export const modeLabel = (m: AgentMode) => (m.kind === 'hide-checks' ? `hide-${m.seed}` : m.kind);

// ---------- The findings a mode lets the agent see (shared by the tools, the calculator and the case file) ----------
const allFindingsCache = new WeakMap<PacketIndex, Finding[]>();
const modeCache = new WeakMap<PacketIndex, Map<string, Finding[]>>();
function allFindings(ix: PacketIndex): Finding[] {
  let f = allFindingsCache.get(ix);
  if (!f) { f = runChecks(ix); allFindingsCache.set(ix, f); }
  return f;
}
/** The findings a mode lets the agent use: all (default), none (blind), or those of the checks not hidden. */
export function findingsFor(ix: PacketIndex, mode: AgentMode = DEFAULT_MODE): Finding[] {
  let m = modeCache.get(ix);
  if (!m) { m = new Map(); modeCache.set(ix, m); }
  const key = modeLabel(mode);
  if (!m.has(key)) {
    if (mode.kind === 'blind') m.set(key, []);
    else if (mode.kind === 'default') m.set(key, allFindings(ix));
    else { const hidden = new Set(hiddenCheckIds(mode.seed)); m.set(key, allFindings(ix).filter((f) => !hidden.has(f.checkId))); }
  }
  return m.get(key)!;
}
/** The hidden checks' findings (empty outside hide-checks): what must not leak through any tool. */
export function hiddenFindings(ix: PacketIndex, mode: AgentMode): Finding[] {
  if (mode.kind !== 'hide-checks') return [];
  const hidden = new Set(hiddenCheckIds(mode.seed));
  return allFindings(ix).filter((f) => hidden.has(f.checkId));
}
