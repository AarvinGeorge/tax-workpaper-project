// Versions: compare any two (v1, v2, v3, finalized), the finalized overlay, swings against last year, what-ifs, forms.
// Rules (variance thresholds) and values all come from the packet; the only recomputation is the projection's
// flow-through (src/domain/flow.ts), read here through each claim's current value.
import type { CompareRow, FinalizedLine, Swing, WhatIf, WorkspaceState } from './contracts';
import type { PacketIndex } from './packet/load';
import type { ReturnLine } from './packet/types';

/** Pseudo-version name for the finalized return (latest version plus applied adjustments). */
export const FINALIZED = 'finalized';

type Cell = { value: unknown; label: string; form: string };

function cellsOf(ix: PacketIndex, v: string, fin?: FinalizedLine[]): Map<string, Cell> {
  if (v === FINALIZED) {
    if (!fin) throw new Error('compareVersions: the finalized version needs the finalized lines');
    return new Map(fin.map((f) => {
      const l = ix.line(ix.latest.version, f.key);
      return [f.key, { value: f.value, label: l?.label ?? f.key, form: l?.form ?? f.key.split('.')[0] }];
    }));
  }
  const rv = ix.version(v);
  if (!rv) throw new Error(`Unknown version ${v}`);
  return new Map(rv.lines.map((l) => [l.key, { value: l.value, label: l.label, form: l.form }]));
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * Line-by-line comparison of version a against b. When b is the version right after a, the change type comes from b's
 * changes_from_previous (the packet's own record of what moved); otherwise the lines are diffed.
 */
export function compareVersions(ix: PacketIndex, a: string, b: string, fin?: FinalizedLine[]): CompareRow[] {
  const A = cellsOf(ix, a, fin);
  const B = cellsOf(ix, b, fin);
  const ia = ix.versions.findIndex((rv) => rv.version === a);
  const ib = ix.versions.findIndex((rv) => rv.version === b);
  const adjacent = ia >= 0 && ib === ia + 1;
  const cfp = adjacent ? new Map(ix.versions[ib].changes_from_previous.map((c) => [c.key, c])) : null;

  const keys: string[] = [...A.keys()];
  for (const k of B.keys()) if (!A.has(k)) keys.push(k);
  return keys.map((key) => {
    const ca = A.get(key);
    const cb = B.get(key);
    const meta = cb ?? ca!;
    let change: CompareRow['change'];
    if (cfp) {
      const c = cfp.get(key);
      change = c && (c.change === 'added' || c.change === 'removed' || c.change === 'changed') ? c.change : 'same';
    } else {
      change = !ca ? 'added' : !cb ? 'removed' : same(ca.value, cb.value) ? 'same' : 'changed';
    }
    return { key, label: meta.label, form: meta.form, a: ca?.value ?? null, b: cb?.value ?? null, change };
  });
}

/** The finalized return: the latest version with each adjusted line's value and each line recomputed from it (derived)
 *  overlaid. A line past a non-linear computation keeps the engine value and says it needs the engine. */
export function finalized(ix: PacketIndex, state: WorkspaceState): FinalizedLine[] {
  return ix.latest.lines.map((l) => {
    const c = state.claims[`line:${l.key}`];
    const adjusted = !!c && c.adjusted;
    const derived = !!c && !adjusted && !!c.derived;
    return { key: l.key, v3: l.value, value: adjusted || derived ? c.current : l.value, adjusted, derived, needsEngine: !!c?.needsEngine, recomputed: derived };
  });
}

/** What the figures are: "v3, as computed", "v3 plus 1 adjustment" (every affected figure recomputed), or "v3 plus 1
 *  adjustment; N figures need the engine". One wording for every screen that shows finalized figures. */
export function basisText(version: string, state: WorkspaceState): string {
  const claims = Object.values(state.claims);
  const n = claims.filter((c) => c.adjusted).length;
  const e = claims.filter((c) => c.needsEngine).length;
  if (!n) return `${version}, as computed`;
  return `${version} plus ${n} adjustment${n === 1 ? '' : 's'}${e ? `; ${e} figure${e === 1 ? ' needs' : 's need'} the engine` : ''}`;
}

/** The tax effect estimate of every applied adjustment, summed (tax_effect_rates or 1:1), for figures the flow cannot
 *  recompute; null when no adjustment carries one. An estimate, never a figure on the return. */
export function effectEstimate(state: WorkspaceState): { federal: number; california: number } | null {
  const fx = Object.values(state.claims).filter((c) => c.adjusted && c.effect).map((c) => c.effect!);
  return fx.length ? { federal: fx.reduce((s, x) => s + x.federal, 0), california: fx.reduce((s, x) => s + x.california, 0) } : null;
}

/** Current (finalized) value of one line; every post-latest amount reads through this. */
export function finalizedValue(fin: FinalizedLine[], key: string): unknown {
  return fin.find((f) => f.key === key)?.value;
}

interface VarianceRule { percent: number; amount: number }

function varianceRule(ix: PacketIndex): VarianceRule {
  const r = ix.packet.firm.starter_standards.variance_review as Record<string, unknown> | undefined;
  const percent = Number(r?.flag_if_change_over_percent);
  const amount = Number(r?.and_over_amount);
  if (!Number.isFinite(percent) || !Number.isFinite(amount)) {
    throw new Error('firm.starter_standards.variance_review is missing flag_if_change_over_percent or and_over_amount');
  }
  return { percent, amount };
}

/**
 * Year-over-year swings: every numeric latest line and every 2024 line, flagged by the firm's variance rule
 * (over the percent AND over the amount). A line absent last year is 'new' when it is over the amount.
 */
export function swings(ix: PacketIndex, fin?: FinalizedLine[]): Swing[] {
  const now = fin ? new Map(fin.map((f) => [f.key, f.value])) : null;
  const rule = varianceRule(ix);
  const py = ix.packet.prior_years.return_2024 as Record<string, unknown>;
  const prior = (py.lines as Record<string, unknown>) || {};
  const labels = (py.line_labels as Record<string, string>) || {};
  const sources = (py.line_sources as Record<string, string>) || {};
  const priorNum = (k: string): number | null => (typeof prior[k] === 'number' ? (prior[k] as number) : null);
  const priorRef = (k: string) => sources[k] ?? (k in prior ? `py:/return_2024/lines/${k.replace(/~/g, '~0').replace(/\//g, '~1')}` : undefined);

  const flagOf = (p: number | null, cur: number): Swing['flag'] => {
    const delta = cur - (p ?? 0);
    if (p === null) return Math.abs(cur) > rule.amount ? 'new' : null;
    if (Math.abs(delta) <= rule.amount) return null;
    if (p === 0) return 'swing';
    return (Math.abs(delta) / Math.abs(p)) * 100 > rule.percent ? 'swing' : null;
  };

  const out: Swing[] = [];
  const seen = new Set<string>();
  for (const l of ix.latest.lines as ReturnLine[]) {
    if (typeof l.value !== 'number') continue;
    seen.add(l.key);
    const p = priorNum(l.key);
    // The current column follows the finalized return when given (adjusted and derived values), else the engine's.
    const f = Number(String(now?.get(l.key) ?? '').replace(/,/g, ''));
    const cur = now && String(now.get(l.key) ?? '').trim() !== '' && Number.isFinite(f) ? f : l.value;
    out.push({ key: l.key, label: l.label, prior: p, current: cur, delta: cur - (p ?? 0), flag: flagOf(p, cur), priorRef: priorRef(l.key) });
  }
  for (const k of Object.keys(prior)) {
    if (seen.has(k)) continue;
    const p = priorNum(k);
    if (p === null) continue;
    const l = ix.line(ix.latest.version, k);
    out.push({ key: k, label: l?.label ?? labels[k] ?? k, prior: p, current: 0, delta: -p, flag: flagOf(p, 0), priorRef: priorRef(k) });
  }
  return out;
}

/** Engine-computed alternatives. Not a change; nothing is saved to the return. */
export function whatIfs(ix: PacketIndex): WhatIf[] {
  return (ix.packet.what_if.alternatives as Record<string, unknown>[]).map((a) => {
    const fed = (a.federal as Record<string, unknown>) || {};
    const ca = (a.california as Record<string, unknown>) || {};
    const pen = [fed.penalty_change, ca.penalty_change].filter((x): x is number => typeof x === 'number');
    return {
      id: String(a.id), description: String(a.description ?? ''),
      federalChange: Number(fed.total_tax_change ?? 0), californiaChange: Number(ca.total_tax_change ?? 0),
      ...(pen.length ? { penaltyChange: pen.reduce((s, x) => s + x, 0) } : {}),
      changedLines: ((a.changed_lines as { key: string }[]) || []).map((c) => c.key),
    };
  });
}

/** Readable form name from a README form code (F1040 -> Form 1040, SchA -> Schedule A, FTB3885A -> FTB 3885A). */
export function formLabel(code: string): string {
  if (code === 'SchCA540NR') return 'Schedule CA (540NR)';
  if (code === 'F540NR') return 'Form 540NR';
  let m = /^Schedule(\w+)$/.exec(code);
  if (m) return `Schedule ${m[1]}`;
  m = /^Sch(\w+)$/.exec(code);
  if (m) return `Schedule ${m[1]}`;
  m = /^FTB(\w+)$/.exec(code);
  if (m) return `FTB ${m[1]}`;
  m = /^F(\d\w*)(?:-(\w+))?$/.exec(code);
  if (m) return m[2] ? `Form ${m[1]} (${m[2]})` : `Form ${m[1]}`;
  return code;
}

/** Forms of a version in the order their lines appear, each with its line keys. */
export function formsOf(ix: PacketIndex, version: string): { form: string; label: string; lines: string[] }[] {
  const rv = ix.version(version);
  if (!rv) throw new Error(`Unknown version ${version}`);
  const order: { form: string; label: string; lines: string[] }[] = [];
  const byForm = new Map<string, { form: string; label: string; lines: string[] }>();
  for (const l of rv.lines) {
    let g = byForm.get(l.form);
    if (!g) {
      g = { form: l.form, label: formLabel(l.form), lines: [] };
      byForm.set(l.form, g);
      order.push(g);
    }
    g.lines.push(l.key);
  }
  return order;
}

/** Cells of one Return row. When comparing, the latest column is the engine's value and the other column carries the
 *  comparison (Finalized = adjusted); without a comparison, the latest column shows our adjusted value with "was". */
export function cmpCells(engine: unknown, claim: { adjusted: boolean; derived?: boolean; current: unknown } | undefined, cmp: string | null, other: unknown): { latest: unknown; other: unknown; wasNote: boolean } {
  if (cmp) return { latest: engine, other, wasNote: false };
  const moved = !!claim?.adjusted || !!claim?.derived;
  return { latest: moved ? claim!.current : engine, other: undefined, wasNote: moved };
}

export function differLine(n: number, a: string, b: string): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'line differs' : 'lines differ'} between ${a} and ${b}.`;
}
