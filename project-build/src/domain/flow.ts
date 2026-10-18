// Flow-through: an adjustment moves the lines that depend on it, as far as the packet's line graph is plain arithmetic.
// Every line carries rule + inputs, so the packet is the dependency graph. A line is replayed only when its rule is on
// the arithmetic allowlist AND the engine's own numbers fit one operation exactly; anything past a tax computation
// (brackets, SE tax, QBI, phase-outs, AMT, ratios, text flags) needs the engine and is marked so, never estimated.
import type { PacketIndex } from './packet/load';
import type { ReturnVersion } from './packet/types';

/** Rules replayed as arithmetic. Evidence (python3 -I over data/packet.json, v1, v2 and v3): every line under these rules
 *  with an integer value fits an operation below within 0.5, and the engine reference describes them as arithmetic:
 *  R-SUM "Arithmetic combination of the listed input lines" (79 of 85 lines fit; the 6 misses have unlisted inputs or
 *  three-term differences and stay with the engine); R-CARRY "Value carried from the listed line" (47 of 48);
 *  R-RENTAL-LINE "mapped to the Schedule E line" (2 of 2, a carry); R-8949-LOT "proceeds minus basis plus adjustment"
 *  (1 of 1, a carry). Rules that fit only where a cap or phase-out is not binding (R-DEDUCTION-CHOICE, R-CA-DEDUCTION,
 *  R-AOTC-PHASEOUT, R-SCORP-BASIS, R-HSA) are left out: the data fitting today does not make them arithmetic. */
export const FLOW_RULES = ['R-SUM', 'R-CARRY', 'R-RENTAL-LINE', 'R-8949-LOT'];

export interface FlowOp { name: 'sum' | 'a-b' | 'b-a' | 'max0(a-b)' | 'max0(b-a)'; apply(v: number[]): number }
const OPS: FlowOp[] = [
  { name: 'sum', apply: (v) => v.reduce((s, x) => s + x, 0) },
  { name: 'a-b', apply: (v) => v[0] - v[1] },
  { name: 'b-a', apply: (v) => v[1] - v[0] },
  { name: 'max0(a-b)', apply: (v) => Math.max(0, v[0] - v[1]) },
  { name: 'max0(b-a)', apply: (v) => Math.max(0, v[1] - v[0]) },
];
const TOLERANCE = 0.5;

/** One version's graph: lines with inputs in dependency order, and the operations each fits (empty = needs the engine). */
export interface FlowGraph { order: string[]; inputs: Map<string, string[]>; ops: Map<string, FlowOp[]> }

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** The operation table of one version, inferred from the engine's own output. Static data: built once in indexPacket. */
export function flowGraph(rv: ReturnVersion): FlowGraph {
  const byKey = new Map(rv.lines.map((l) => [l.key, l]));
  const inputs = new Map<string, string[]>();
  const ops = new Map<string, FlowOp[]>();
  for (const l of rv.lines) {
    if (!l.inputs?.length) continue;
    inputs.set(l.key, l.inputs);
    const vals = l.inputs.map((k) => byKey.get(k)?.value);
    const eligible = !!l.rule && FLOW_RULES.includes(l.rule) && isNum(l.value) && Number.isInteger(l.value) && vals.every(isNum);
    ops.set(l.key, eligible ? OPS.filter((o) => (o.name === 'sum' || vals.length === 2) && Math.abs(o.apply(vals as number[]) - (l.value as number)) <= TOLERANCE) : []);
  }
  // Depth-first topological order over the lines that have inputs (the packet's graph has no cycles; a cycle stops).
  const order: string[] = [];
  const state = new Map<string, 'open' | 'done'>();
  const visit = (k: string) => {
    if (state.has(k) || !inputs.has(k)) return;
    state.set(k, 'open');
    for (const i of inputs.get(k)!) visit(i);
    state.set(k, 'done');
    order.push(k);
  };
  for (const k of inputs.keys()) visit(k);
  return { order, inputs, ops };
}

export type FlowLine = { value: number; from: string[] } | { needsEngine: true; frontier: boolean; from: string[] };

const toNum = (x: unknown): number | null => {
  if (isNum(x)) return x;
  const s = String(x ?? '').replace(/,/g, '').trim();
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};

/** The lines an adjustment moves, from the adjusted values (line key -> current) over the version in view. A derived
 *  line is recomputed exactly; a line past a non-linear computation, or whose candidate operations disagree (a sign
 *  flip), needs the engine (frontier), and so does everything below it. Adjusted lines keep their own value. */
export function flowThrough(ix: PacketIndex, adjusted: Record<string, unknown>): Map<string, FlowLine> {
  const out = new Map<string, FlowLine>();
  const keys = Object.keys(adjusted);
  if (!keys.length) return out;
  const v = ix.latest.version;
  const g = ix.flowGraph(v);
  const value = (k: string): unknown => (k in adjusted ? adjusted[k] : out.get(k) && 'value' in out.get(k)! ? (out.get(k) as { value: number }).value : ix.line(v, k)?.value);
  const fromOf = new Map<string, string[]>(keys.map((k) => [k, [k]]));
  for (const k of g.order) {
    if (k in adjusted) continue;
    const ins = g.inputs.get(k)!;
    const moved = ins.filter((i) => fromOf.has(i));
    if (!moved.length) continue;
    const from = [...new Set(moved.flatMap((i) => fromOf.get(i)!))].sort();
    if (moved.some((i) => { const o = out.get(i); return !!o && 'needsEngine' in o; })) {
      out.set(k, { needsEngine: true, frontier: false, from });
      fromOf.set(k, from);
      continue;
    }
    const vals = ins.map((i) => toNum(value(i)));
    const ops = g.ops.get(k) ?? [];
    const results = vals.every((x) => x !== null) ? [...new Set(ops.map((o) => o.apply(vals as number[])))] : [];
    if (results.length !== 1) {
      out.set(k, { needsEngine: true, frontier: true, from });
      fromOf.set(k, from);
      continue;
    }
    // A line that lands on its engine value has not moved: nothing below it moves through it.
    if (results[0] === ix.line(v, k)?.value) continue;
    out.set(k, { value: results[0], from });
    fromOf.set(k, from);
  }
  return out;
}
