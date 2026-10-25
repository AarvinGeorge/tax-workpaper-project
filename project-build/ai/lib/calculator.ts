// The agent's calculator (docs/superpowers/plans/2026-10-24-agent-case-file.md, Part B): the model chooses which check
// to run and passes ids; this code does every number. Ids only: a number or a numeric string where an id belongs is
// refused, so the model cannot bring a figure of its own. Read-only. Results are masked, labelled as data, bounded and
// SSN-scanned by runTool (agent-tools.ts), like every other tool result.
//
// `flowGraph` and `proofsFor` report agreement only (flowGraph picks the operation because it fits), so recompute_line,
// sum_to and prior_year carry a little "differ" arithmetic of their own: plain sums and differences, never tax.
// compare_to_limit, convert and duplicates (docs/superpowers/plans/2026-10-24-agent-cpa-toolkit.md, Task 2) are the
// same kind of thing: a comparison with an engine parameter, one fx rate applied both ways, and duplicate pages or
// amounts (duplicates.ts, shared with verify_all). None of them decides whether a rule applies.
import type { PacketIndex } from '../../src/domain/packet/load';
import type { ReturnLine } from '../../src/domain/packet/types';
import { FLOW_RULES } from '../../src/domain/flow';
import { taxYear } from '../../src/domain/checks/util';
import { sameFacts } from '../../src/domain/facts';
import { masker } from './reader-core';
import { DEFAULT_MODE, comparisonPayloadHidden, type AgentMode } from './modes';
import { AMOUNTS, amountCopies, documentPairs } from './duplicates';

export const VERIFY_METHODS = ['recompute_line', 'sum_to', 'prior_year', 'fact_copies', 'glossary', 'compare_to_limit', 'convert', 'duplicates'] as const;
export type VerifyMethod = (typeof VERIFY_METHODS)[number];
export interface VerifyInput { method: string; ids: unknown[]; target: unknown }

type Obj = Record<string, unknown>;
/** Amounts may be added; identifiers, dates, codes and text may not (one set, defined beside the duplicates rule). */
export const AMOUNT_TYPES = AMOUNTS;
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
    case 'compare_to_limit': return compareToLimit(ix, first, target === null ? null : String(target));
    case 'convert': return convert(ix, first, target === null ? null : String(target));
    case 'duplicates': return duplicates(ix, first);
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

/** Every copy of the facts on a line or document, with whether the copies agree: raw comparisons, in every mode.
 *  The comparison's finding wording (title, explanation, receipt) is dropped where the mode hides it
 *  (modes.ts comparisonPayloadHidden: always in blind; in hide-checks for comparisons a hidden check reports).
 *  blind-v3 keeps the agent-v3 baseline's definition: agreements only. */
function factCopies(ix: PacketIndex, target: string, mode: AgentMode): Obj {
  const isLine = !!lineOf(ix, target);
  if (!isLine && !ix.docById.has(target)) return { error: `No line or document ${target}.` };
  const v3 = mode.kind === 'blind-v3';
  const hidden = comparisonPayloadHidden(ix, mode);
  const items = sameFacts(ix)
    .filter((c) => !v3 || c.agree)
    .filter((c) => (isLine ? c.claims.includes(`line:${target}`) : c.claims.includes(`doc:${target}`) || c.copies.some((x) => x.ref && refDoc(ix, x.ref) === target)))
    .map((c) => (!v3 && hidden(c)
      ? { rule: c.rule, agree: c.agree, claims: c.claims, copies: c.copies }
      : { rule: c.rule, agree: c.agree, claims: c.claims, title: c.title, explanation: c.explanation, receipt: c.receipt ?? null, copies: c.copies }));
  return { target, items };
}

// ---------- compare_to_limit ----------
const params = (ix: PacketIndex) => ix.packet.engine_reference.parameters as Obj;
const JUDGMENT = 'A comparison only, never a tax computation: whether the parameter applies is your judgment (a cap, threshold or phase-in can depend on other lines).';

/** One figure (a line or an amount value) against one numeric engine parameter: above, equal or below, and by how much. */
function compareToLimit(ix: PacketIndex, id: string, target: string | null): Obj {
  if (!target) return { error: 'compare_to_limit needs a target: ref:param.<name> (an engine_reference parameter).' };
  if (target.startsWith('ref:fx.')) return { error: `${target} is an fx rate: use convert.` };
  const name = target.startsWith('ref:param.') ? target.slice('ref:param.'.length) : target;
  const all = params(ix);
  if (!Object.prototype.hasOwnProperty.call(all, name)) {
    return { error: `Unknown parameter ${target}. Use ref:param.<name> with one of: ${Object.keys(all).filter((k) => isNum(all[k])).join(', ')}.` };
  }
  const p = all[name];
  if (!isNum(p)) return { error: `ref:param.${name} is a ${Array.isArray(p) ? 'list (brackets or a range)' : 'table'}, not one number: comparing a figure with it needs the engine.` };
  const t = term(ix, id, masker(ix));
  if ('error' in t) return t;
  const difference = round2(t.value - p);
  // Whole-number parameters (dollar limits) are equal within rounding to the dollar; rates and factors exactly.
  const equal = Number.isInteger(p) ? Math.abs(difference) < 0.5 : difference === 0;
  return {
    id, kind: t.kind, label: t.label, value: t.value, parameter: { ref: `ref:param.${name}`, value: p },
    relation: equal ? 'equal' : difference > 0 ? 'above' : 'below', difference, note: JUDGMENT,
  };
}

// ---------- convert ----------
type Rate = { ref: string | null; key: string | null; period: string; value: number; from: string; to: string; fxRatesValue?: number };

/** One rate, named as ref:fx.<CUR>.<rate> (engine_reference.parameters.fx) or <A>_per_<B>.<rate> (fx_rates). The
 *  direction comes from the fx_rates key: <A>_per_<B> is units of A for one unit of B. */
function rateOf(ix: PacketIndex, target: string): Rate | { error: string } {
  const fxp = (params(ix).fx ?? {}) as Record<string, Record<string, unknown>>;
  const fxr = ((ix.packet as { fx_rates?: unknown }).fx_rates ?? {}) as Record<string, Record<string, unknown>>;
  const known = [
    ...Object.entries(fxp).flatMap(([c, rs]) => Object.keys(rs ?? {}).map((r) => `ref:fx.${c}.${r}`)),
    ...Object.entries(fxr).flatMap(([k, rs]) => Object.keys(rs ?? {}).map((r) => `${k}.${r}`)),
  ];
  const unknown = { error: `Unknown rate ${target}. Use one of: ${known.join(', ')}.` };
  const byRef = /^ref:fx\.([^.]+)\.(.+)$/.exec(target);
  const byKey = /^(?:fx_rates\.)?([A-Za-z]+)_per_([A-Za-z]+)\.(.+)$/.exec(target);
  if (byRef) {
    const [, cur, r] = byRef;
    const value = fxp[cur]?.[r];
    if (!isNum(value) || value <= 0) return unknown;
    const key = Object.keys(fxr).find((k) => k.startsWith(`${cur}_per_`) && fxr[k]?.[r] !== undefined);
    const to = key ? key.slice(`${cur}_per_`.length) : 'the other currency';
    const alt = key ? fxr[key][r] : undefined;
    return { ref: target, key: key ? `${key}.${r}` : null, period: r, value, from: cur, to, ...(isNum(alt) && alt !== value ? { fxRatesValue: alt } : {}) };
  }
  if (byKey) {
    const [, a, b, r] = byKey;
    const value = fxr[`${a}_per_${b}`]?.[r];
    if (!isNum(value) || value <= 0) return unknown;
    const alt = fxp[a]?.[r];
    return { ref: alt !== undefined ? `ref:fx.${a}.${r}` : null, key: `${a}_per_${b}.${r}`, period: r, value, from: a, to: b, ...(isNum(alt) && alt !== value ? { fxRatesValue: alt } : {}) };
  }
  return unknown;
}

/** One amount at one named rate, both ways, each labelled with its currencies. */
function convert(ix: PacketIndex, id: string, target: string | null): Obj {
  if (!target) return { error: 'convert needs a target: ref:fx.<currency>.<rate> or an fx_rates key with its rate (<A>_per_<B>.<rate>).' };
  const rate = rateOf(ix, target);
  if ('error' in rate) return rate;
  const t = term(ix, id, masker(ix));
  if ('error' in t) return t;
  const r = rate.value;
  // The rate's period (its key's last part, e.g. a year's average) against the return's tax year: a rate of another
  // year is visible without the model reading the key. Read from the packet, never an input.
  const y = /(?:^|\D)(\d{4})(?:\D|$)/.exec(rate.period);
  const year = y ? Number(y[1]) : null;
  const tax = taxYear(ix);
  return {
    id, kind: t.kind, label: t.label, amount: t.value,
    ratePeriod: { period: rate.period, year, taxYear: tax, periodYearMatchesTaxYear: year === null ? null : year === tax },
    rate: { ref: rate.ref, key: rate.key, value: r, per: `${rate.from} per ${rate.to}`, ...(rate.fxRatesValue !== undefined ? { fxRatesValue: rate.fxRatesValue } : {}) },
    results: [
      { from: rate.from, to: rate.to, operation: `amount / ${r}`, result: round2(t.value / r) },
      { from: rate.to, to: rate.from, operation: `amount x ${r}`, result: round2(t.value * r) },
    ],
    note: 'Which currency the amount is in, and which rate the rule calls for, is your judgment: read the document and the rule.',
  };
}

// ---------- duplicates ----------
/** A line: each nonzero amount it cites from 2+ pages, with how alike those pages are and whether the line counts the
 *  amount once or the copies added. A document: every page pair with one of its pages that is identical, has the same
 *  value set, or is near, each page marked superseded, landed and cited. Raw packet comparisons: the same in every mode. */
function duplicates(ix: PacketIndex, target: string): Obj {
  const l = lineOf(ix, target);
  if (l) {
    const groups = amountCopies(ix, l) ?? [];
    return {
      target, kind: 'line', items: groups,
      ...(groups.length ? {} : { note: 'No nonzero amount this line cites appears on two or more pages.' }),
    };
  }
  if (ix.docById.has(target)) return { target, kind: 'document', items: documentPairs(ix, target).map((p) => ({ ...p, pages: [...p.pages] })) };
  return { error: `No line or document ${target}.` };
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
