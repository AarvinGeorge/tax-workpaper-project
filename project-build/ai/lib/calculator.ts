// The agent's calculator (docs/superpowers/plans/2026-10-24-agent-case-file.md, Part B): the model chooses which check
// to run and passes ids; this code does every number. Ids only: a number or a numeric string where an id belongs is
// refused, so the model cannot bring a figure of its own. Read-only. Results are masked, labelled as data, bounded and
// SSN-scanned by runTool (agent-tools.ts), like every other tool result.
//
// `flowGraph` and `proofsFor` report agreement only (flowGraph picks the operation because it fits), so recompute_line,
// sum_to and prior_year carry a little "differ" arithmetic of their own: plain sums and differences, never tax.
import type { PacketIndex } from '../../src/domain/packet/load';
import type { ReturnLine } from '../../src/domain/packet/types';
import { FLOW_RULES } from '../../src/domain/flow';
import { sameFacts } from '../../src/domain/facts';
import { masker } from './reader-core';
import { DEFAULT_MODE, findingsFor, hiddenFindings, type AgentMode } from './modes';

export const VERIFY_METHODS = ['recompute_line', 'sum_to', 'prior_year', 'fact_copies', 'glossary'] as const;
export type VerifyMethod = (typeof VERIFY_METHODS)[number];
export interface VerifyInput { method: string; ids: unknown[]; target: unknown }

type Obj = Record<string, unknown>;
/** Amounts may be added; identifiers, dates, codes and text may not. */
export const AMOUNT_TYPES = new Set(['money', 'integer', 'quantity']);
/** Up to 12 inputs, every sign combination is tried (4,096 at most). */
export const MAX_SIGNED_INPUTS = 12;
const NEAR = 1;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const looksNumeric = (x: unknown) => typeof x === 'number' || (typeof x === 'string' && /^[\s$€£(+-]*[\d.,]+[)%\s]*$/.test(x));
const round2 = (n: number) => Math.round(n * 100) / 100;

const lineOf = (ix: PacketIndex, key: string) => ix.line(ix.latest.version, key);
const ruleText = (ix: PacketIndex, rule: string | null) => (rule ? (ix.packet.engine_reference.rules as Record<string, string>)[rule] ?? null : null);
const isArithmetic = (rule: string | null) => !!rule && FLOW_RULES.includes(rule);

/** Runs one method. Errors are results ({ error }), never throws. */
export function verify(ix: PacketIndex, input: VerifyInput, mode: AgentMode = DEFAULT_MODE): Obj {
  const ids = Array.isArray(input.ids) ? input.ids : [];
  const target = input.target ?? null;
  if (!(VERIFY_METHODS as readonly string[]).includes(input.method)) return { error: `Unknown method ${String(input.method)}. Use one of ${VERIFY_METHODS.join(', ')}.` };
  if (input.method !== 'glossary' && ([...ids, target].some(looksNumeric))) {
    return { error: 'Pass ids, not numbers: line keys (e.g. F1040.11) or value ids (ev-NNNN). The calculator reads every figure itself.' };
  }
  if (!ids.length) return { error: 'ids is empty.' };
  const first = String(ids[0]);
  switch (input.method as VerifyMethod) {
    case 'recompute_line': return recomputeLine(ix, first);
    case 'sum_to': return sumTo(ix, ids.map(String), target === null ? null : String(target));
    case 'prior_year': return priorYear(ix, first);
    case 'fact_copies': return factCopies(ix, first, mode);
    case 'glossary': return glossary(ix, first);
  }
}

// ---------- recompute_line ----------
/** The first sign combination (inputs in order, + before -) whose total is within 1 of the value, or null. */
export function signsReaching(keys: string[], vals: number[], value: number): string[] | null {
  if (vals.length > MAX_SIGNED_INPUTS) return null;
  for (let mask = 0; mask < 1 << vals.length; mask++) {
    const total = vals.reduce((s, v, i) => s + (mask & (1 << i) ? -v : v), 0);
    if (Math.abs(total - value) < NEAR) return keys.map((k, i) => `${mask & (1 << i) ? '-' : '+'}${k}`);
  }
  return null;
}

function recomputeLine(ix: PacketIndex, key: string): Obj {
  const l = lineOf(ix, key);
  if (!l) return { error: `No line ${key} on the latest return (${ix.latest.version}).` };
  const head = { key, rule: l.rule, ruleText: ruleText(ix, l.rule), value: l.value };
  if (!isArithmetic(l.rule)) {
    return { ...head, arithmetic: false, needsEngine: true, note: 'This rule is past plain arithmetic (rates, caps, phase-outs or a tax computation); the calculator does not estimate it.' };
  }
  const keys = l.inputs ?? [];
  if (!keys.length) return { ...head, arithmetic: true, note: 'No input lines are listed; its figures come from source values. Use sum_to with the line\'s sources (get_line lists them).' };
  const vals = keys.map((k) => lineOf(ix, k)?.value);
  // Compact (KEY = value): a total over many lots lists every input without a large result.
  const inputs = keys.map((k, i) => `${k} = ${vals[i] === undefined || vals[i] === null ? 'none' : String(vals[i])}`);
  if (!isNum(l.value) || !vals.every(isNum)) return { ...head, arithmetic: true, inputs, note: 'The line or an input is not a number; nothing to add.' };
  const operation = keys.length === 1 ? 'carry' : 'sum';
  const result = round2((vals as number[]).reduce((s, v) => s + v, 0));
  const difference = round2(l.value - result);
  const agrees = Math.abs(difference) < NEAR;
  return {
    ...head, arithmetic: true, operation, inputs, result, difference, agrees,
    signsReaching: agrees ? 'all +' : signsReaching(keys, vals as number[], l.value),
  };
}

// ---------- sum_to ----------
type Term = { id: string; kind: 'line' | 'value'; label: string; value: number; doc?: string; page?: number } | { error: string };

function term(ix: PacketIndex, id: string, m: (s: string) => string): Term {
  const l = lineOf(ix, id);
  if (l) return isNum(l.value) ? { id, kind: 'line', label: m(l.label), value: l.value } : { error: `Line ${id} is not an amount.` };
  const v = ix.valueById.get(id);
  if (!v) return { error: `Unknown id ${id}: give a line key or an extracted value id (ev-NNNN).` };
  if (!AMOUNT_TYPES.has(v.value_type) || !isNum(v.value)) return { error: `${id} is not an amount (${v.value_type}).` };
  return { id, kind: 'value', label: m(v.label), value: v.value, doc: v.document_id, page: v.page };
}

function sumTo(ix: PacketIndex, ids: string[], target: string | null): Obj {
  if (!target) return { error: 'sum_to needs a target: the line key or value id the ids should add to.' };
  const m = masker(ix);
  const items = ids.map((id) => term(ix, id, m));
  const bad = items.find((t) => 'error' in t);
  if (bad) return bad as Obj;
  const tgt = term(ix, target, m);
  if ('error' in tgt) return tgt;
  const total = round2(items.reduce((s, t) => s + (t as { value: number }).value, 0));
  const difference = round2(tgt.value - total);
  return { items, total, target: tgt, difference, agrees: Math.abs(difference) < NEAR };
}

// ---------- prior_year ----------
const pointer = (root: unknown, ptr: string): unknown =>
  ptr.split('/').slice(1).reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Obj)[k.replace(/~1/g, '/').replace(/~0/g, '~')] : undefined), root);

function priorYear(ix: PacketIndex, key: string): Obj {
  const l: ReturnLine | undefined = lineOf(ix, key);
  if (!l) return { error: `No line ${key} on the latest return (${ix.latest.version}).` };
  const py = ix.packet.prior_years as { return_2024?: { lines?: Obj } };
  const prior = py.return_2024?.lines?.[key];
  const records = (l.sources ?? []).filter((s) => s.startsWith('py:')).map((s) => ({ ref: s, value: pointer(ix.packet.prior_years, s.slice(3)) ?? null }));
  const vr = (ix.packet.firm.starter_standards.variance_review ?? {}) as { flag_if_change_over_percent?: number; and_over_amount?: number };
  const rule = { percent: vr.flag_if_change_over_percent ?? null, amount: vr.and_over_amount ?? null };
  const out: Obj = { key, value: l.value, priorReturnValue: prior ?? null, priorRecords: records, firmVarianceRule: rule };
  if (isNum(l.value) && isNum(prior)) {
    const change = round2(l.value - prior);
    const pct = prior === 0 ? null : round2((change / Math.abs(prior)) * 100);
    out.change = change;
    out.changePercent = pct;
    out.overFirmThreshold = rule.percent !== null && rule.amount !== null && Math.abs(change) > rule.amount && (pct === null || Math.abs(pct) > rule.percent);
  }
  const nums = records.map((r) => r.value).filter(isNum);
  if (isNum(l.value) && nums.length === records.length && nums.length) {
    const sum = round2(nums.reduce((s, v) => s + v, 0));
    out.priorRecordsTotal = sum;
    // Reported apart, so a sign error shows: a loss carried as a positive figure agrees in amount, not in sign.
    out.amountAgreesWithPriorRecords = Math.abs(Math.abs(sum) - Math.abs(l.value)) < NEAR;
    out.signAgreesWithPriorRecords = Math.sign(sum) === Math.sign(l.value) || sum === 0 || l.value === 0;
    out.agreesWithPriorRecords = Math.abs(sum - l.value) < NEAR;
  }
  if (prior === undefined && !records.length) out.note = 'Not on last year\'s return and no prior-year record is cited for it.';
  return out;
}

// ---------- fact_copies ----------
function refDoc(ix: PacketIndex, ref: string): string | null {
  if (ix.valueById.has(ref)) return ix.valueById.get(ref)!.document_id;
  if (ref.startsWith('doc:')) return ref.slice(4).split('#')[0] || null;
  return null;
}

/** Every copy of the facts on a line or document. Blind: agreements only (every disagreement is a check's finding).
 *  Hide-checks: a disagreement is hidden when a hidden check reports it (same title or same claims) or when any of its
 *  claims is claimed by a hidden finding and by no visible one (a check's one finding can span several per-item
 *  disagreements with other titles, e.g. a lot-basis check over three lots). */
function factCopies(ix: PacketIndex, target: string, mode: AgentMode): Obj {
  const isLine = !!lineOf(ix, target);
  if (!isLine && !ix.docById.has(target)) return { error: `No line or document ${target}.` };
  const hid = hiddenFindings(ix, mode);
  const visible = new Set(findingsFor(ix, mode).flatMap((f) => f.claims));
  const hiddenOnly = new Set(hid.flatMap((f) => f.claims).filter((c) => !visible.has(c)));
  const hiddenBy = (c: { title: string; claims: string[] }) =>
    c.claims.some((x) => hiddenOnly.has(x)) || hid.some((f) => f.title === c.title || f.claims.join('|') === c.claims.join('|'));
  const items = sameFacts(ix)
    .filter((c) => c.agree || (mode.kind !== 'blind' && !hiddenBy(c)))
    .filter((c) => (isLine ? c.claims.includes(`line:${target}`) : c.claims.includes(`doc:${target}`) || c.copies.some((x) => x.ref && refDoc(ix, x.ref) === target)))
    .map((c) => ({ rule: c.rule, agree: c.agree, claims: c.claims, title: c.title, explanation: c.explanation, receipt: c.receipt ?? null, copies: c.copies }));
  return { target, items };
}

// ---------- glossary ----------
/** README entries whose name or text holds the term (case-insensitive), nested sections flattened. */
function glossary(ix: PacketIndex, term: string): Obj {
  const q = term.trim().toLowerCase();
  if (q.length < 2) return { error: 'Give a term of at least 2 characters.' };
  const entries: { term: string; text: string }[] = [];
  for (const [k, v] of Object.entries(ix.packet.readme as Obj)) {
    if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v as Obj)) entries.push({ term: `${k}.${k2}`, text: String(v2) });
    else entries.push({ term: k, text: String(v) });
  }
  const hits = entries.filter((e) => e.term.toLowerCase().includes(q) || e.text.toLowerCase().includes(q));
  return { term, items: hits };
}
