// verify_all (docs/superpowers/plans/2026-10-24-agent-cpa-toolkit.md, Task 1): one sweep of every deterministic
// comparison code can settle, over every line of the latest return, listing only the disagreements, with coverage
// accounting so a zero can be read. It is not a second check engine: it reports raw comparisons (benign ones too), never
// blocks, never becomes a Finding, and runChecks never calls it. A disagreement becomes a suggestion only after the
// model grounds it in a quote and the verifier passes it. Pure and read-only; generic over the packet schema (no form,
// line, document or check id is named here). Reuses the calculator (recompute_line, prior_year), the source receipt
// (proofs.ts), sameFacts (facts.ts) and the duplicates definition (duplicates.ts).
//
// Modes hide our checks' findings, never raw comparisons: the item set is identical in every mode. Blind drops every
// finding-derived field (onCheck; a comparison's title, explanation, receipt, effect, trigger, stopsEfile, which are the
// "Two sources disagree" finding's own text); hide-checks drops them for comparisons a hidden check reports, and onCheck
// comes only from the mode's findings (findingsFor).
import type { PacketIndex } from '../../src/domain/packet/load';
import type { ExtractedValue, ReturnLine } from '../../src/domain/packet/types';
import type { Copy } from '../../src/domain/facts';
import { FLOW_RULES } from '../../src/domain/flow';
import { sameFacts } from '../../src/domain/facts';
import { sourceReceipt } from '../../src/domain/proofs';
import { masker } from './reader-core';
import { MAX_SIGNED_INPUTS, priorReturn, signsReaching, verify } from './calculator';
import { NEAR_WORDS, amountCopies, pagePairs } from './duplicates';
import { DEFAULT_MODE, comparisonPayloadHidden, findingsFor, isBlind, modeLabel, type AgentMode } from './modes';

/** Hardest first: the order items are listed in. The first six are `differs`; the last three are listed on `kind` only. */
export const VERIFY_ALL_KINDS = [
  'arithmetic_unreachable', 'source_unreachable', 'prior_record_differs', 'copies_disagree', 'duplicate_amount_cited',
  'version_change_unlisted', 'sign_subtraction', 'variance_over_firm_rule', 'duplicate_page',
] as const;
export type VerifyAllKind = (typeof VERIFY_ALL_KINDS)[number];
export const DIFFERS_KINDS: readonly VerifyAllKind[] = VERIFY_ALL_KINDS.slice(0, 6);
export const VERIFY_ALL_DEFAULT_LIMIT = 20;
export const VERIFY_ALL_MAX_LIMIT = 50;
/** A page's own bytes: the tool-result bound (agent-tools.ts TOOL_RESULT_MAX_BYTES, 16,000) less room for runTool's
 *  envelope (tool name, data note, budget line). A page holds as many of the next `limit` items as fit. */
export const VERIFY_ALL_PAGE_BYTES = 15_000;

export type LineStatus = 'tried' | 'needs_engine' | 'not_comparable';
export interface SweepItemFull {
  kind: VerifyAllKind;
  /** The return line the item is about (absent for a page pair). */
  key?: string;
  /** What was compared with the line: input line keys, value ids, py: refs, a version, or doc#page pairs. */
  ids?: string[];
  /** copies_disagree: the comparison's claims (line:/doc: strings, as sameFacts gives them). */
  claims?: string[];
  /** Line keys the item touches (copies_disagree: its line claims; duplicate_page: lines citing either page). */
  lines?: string[];
  compared: string;
  numbers: Record<string, unknown> | null;
  difference: number | null;
  rule: string | null;
  ruleText: string | null;
  receipted?: boolean;
  signs?: string[];
  relation?: 'corroboration' | 'double_count' | 'neither';
  likeness?: 'identical' | 'same_value_set' | 'near';
  superseded?: boolean[];
  agree?: boolean;
  copies?: Copy[];
  onCheck?: boolean;
  title?: string; explanation?: string; receipt?: string | null; effect?: unknown; trigger?: string[]; stopsEfile?: boolean;
}

interface MethodCoverage { definition: string; applicable: number; ran: number; agree: number; differ: number; needsEngine: number; notComparable: number }
export interface Coverage {
  lines: { numeric: number; tried: number; needsEngine: number; notComparable: number };
  lineStatus: Record<string, LineStatus>;
  methods: {
    arithmetic: MethodCoverage & { signReached: number; unreachable: number };
    sources: MethodCoverage & { receipted: number };
    prior_year: MethodCoverage & { recordsCompared: number; recordsDiffer: number; overFirmRule: number };
    fact_copies: MethodCoverage;
    version_changes: MethodCoverage & { listed: number };
    duplicates: MethodCoverage;
  };
}
export interface Sweep {
  coverage: Coverage;
  byKind: Record<VerifyAllKind, number>;
  /** Found and counted, not listed: page pairs where either document is superseded (a correction re-sends a page). */
  countedOnly: { duplicatePagesWithSuperseded: { identical: number; sameValueSet: number; near: number } };
  items: SweepItemFull[];
}

type Obj = Record<string, unknown>;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const round2 = (n: number) => Math.round(n * 100) / 100;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const ruleTextOf = (ix: PacketIndex, rule: string | null) => (rule ? (ix.packet.engine_reference.rules as Record<string, string>)[rule] ?? null : null);
const isArithmetic = (l: ReturnLine) => !!l.rule && FLOW_RULES.includes(l.rule) && (l.inputs ?? []).length > 0;
/** Numeric values cited from ev- sources (the source tie's terms). */
const numericSources = (ix: PacketIndex, l: ReturnLine): ExtractedValue[] =>
  (l.sources ?? []).filter((s) => s.startsWith('ev-')).map((s) => ix.valueById.get(s)).filter((v): v is ExtractedValue => !!v && isNum(v.value));

/** Every string masked as the tools mask it, and each household member's full name cut to the first name. */
function scrubber(ix: PacketIndex): <T>(x: T) => T {
  const m = masker(ix);
  const people = ((ix.packet.household as { people?: { name?: unknown }[] }).people ?? [])
    .map((p) => (typeof p.name === 'string' ? p.name.trim() : '')).filter((n) => n.includes(' '))
    .sort((a, b) => b.length - a.length);
  const text = (s: string) => people.reduce((t, n) => t.split(n).join(n.split(' ')[0]), m(s));
  const walk = (x: unknown): unknown => {
    if (typeof x === 'string') return text(x);
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v)]));
    return x;
  };
  return <T>(x: T) => walk(x) as T;
}

// ---------- The mode-free sweep: comparisons, items, coverage (cached per packet) ----------
interface Base { coverage: Coverage; byKind: Record<VerifyAllKind, number>; countedOnly: Sweep['countedOnly']; items: SweepItemFull[]; payload: Map<SweepItemFull, Obj & { title: string; claims: string[] }> }
const baseCache = new WeakMap<PacketIndex, Base>();

function base(ix: PacketIndex): Base {
  const hit = baseCache.get(ix);
  if (hit) return hit;
  const v = ix.latest.version;
  const lines = ix.latest.lines;
  const items: SweepItemFull[] = [];
  const payload = new Map<SweepItemFull, Obj & { title: string; claims: string[] }>();
  const status: Record<string, LineStatus> = {};
  const head = (l: ReturnLine) => ({ key: l.key, rule: l.rule, ruleText: ruleTextOf(ix, l.rule) });

  // Arithmetic: a rule in FLOW_RULES with input lines listed, re-footed by the calculator (recompute_line).
  const ar = { definition: 'latest lines with a rule in FLOW_RULES and input lines listed; recompute_line over each (over 12 inputs, or an input that is not a number: not comparable, the sign search is not run)', applicable: 0, ran: 0, agree: 0, differ: 0, needsEngine: 0, notComparable: 0, signReached: 0, unreachable: 0 };
  for (const l of lines.filter(isArithmetic)) {
    ar.applicable++;
    const vals = l.inputs.map((k) => ix.line(v, k)?.value);
    if (!isNum(l.value) || !vals.every(isNum) || vals.length > MAX_SIGNED_INPUTS) { ar.notComparable++; if (isNum(l.value)) status[l.key] = 'not_comparable'; continue; }
    ar.ran++; status[l.key] = 'tried';
    const r = verify(ix, { method: 'recompute_line', ids: [l.key], target: null });
    if (r.agrees === true) { ar.agree++; continue; }
    ar.differ++;
    const signs = Array.isArray(r.signsReaching) ? (r.signsReaching as string[]) : null;
    if (signs) ar.signReached++; else ar.unreachable++;
    items.push({
      kind: signs ? 'sign_subtraction' : 'arithmetic_unreachable', ...head(l), ids: [...l.inputs],
      compared: 'the line against its input lines added (every sign combination tried)',
      numbers: { value: l.value, plainSum: r.result, inputs: vals }, difference: r.difference as number, ...(signs ? { signs } : {}),
    });
  }

  // Sources: a numeric line with no input lines, tied to its 1 to 12 numeric ev- values by some sign combination.
  const so = { definition: 'numeric latest lines with no input lines citing 1 to 12 numeric ev- values; a line is reached when some sign combination of every cited value equals it within 1 (over 12 values: not comparable)', applicable: 0, ran: 0, agree: 0, differ: 0, needsEngine: 0, notComparable: 0, receipted: 0 };
  for (const l of lines) {
    if (!isNum(l.value) || (l.inputs ?? []).length) continue;
    const vs = numericSources(ix, l);
    if (!vs.length) continue;
    if (vs.length > MAX_SIGNED_INPUTS) { so.notComparable++; status[l.key] = 'not_comparable'; continue; }
    so.applicable++; so.ran++; status[l.key] = 'tried';
    const nums = vs.map((x) => x.value as number);
    if (signsReaching(vs.map((x) => x.id), nums, l.value)) { so.agree++; continue; }
    so.differ++;
    const receipted = sourceReceipt(ix, l) !== null;
    if (receipted) so.receipted++;
    const plainSum = round2(nums.reduce((s, n) => s + n, 0));
    items.push({
      kind: 'source_unreachable', ...head(l), ids: vs.map((x) => x.id),
      compared: 'the line against its cited source values (no sign combination reaches it)',
      numbers: { value: l.value, sources: nums, plainSum }, difference: round2(l.value - plainSum), receipted,
    });
  }

  // Prior year: a same-key line on last year's return (priorReturn: return_YYYY) or a cited py: record, through the
  // calculator (prior_year).
  const pr = priorReturn(ix);
  const py = { definition: `latest lines with a same-key line on last year's return (${pr?.name ?? 'none in this packet'}) or a cited py: record; prior_year over each: cited records compared (amount and sign), and the change against the firm variance rule`, applicable: 0, ran: 0, agree: 0, differ: 0, needsEngine: 0, notComparable: 0, recordsCompared: 0, recordsDiffer: 0, overFirmRule: 0 };
  const prior = (pr?.ret.lines as Obj | undefined) ?? {};
  for (const l of lines) {
    const records = (l.sources ?? []).filter((s) => s.startsWith('py:'));
    if (!(l.key in prior) && !records.length) continue;
    py.applicable++;
    if (!isNum(l.value)) { py.notComparable++; continue; }
    py.ran++;
    const r = verify(ix, { method: 'prior_year', ids: [l.key], target: null });
    if (typeof r.agreesWithPriorRecords === 'boolean') {
      py.recordsCompared++;
      if (!status[l.key]) status[l.key] = 'tried';
      if (r.agreesWithPriorRecords) py.agree++;
      else {
        py.differ++; py.recordsDiffer++;
        items.push({
          kind: 'prior_record_differs', ...head(l), ids: records,
          compared: 'the line against the prior-year records it cites (added)',
          numbers: { value: l.value, priorRecordsTotal: r.priorRecordsTotal, amountAgrees: r.amountAgreesWithPriorRecords, signAgrees: r.signAgreesWithPriorRecords },
          difference: round2(l.value - (r.priorRecordsTotal as number)),
        });
      }
    }
    if (r.overFirmThreshold === true) {
      py.overFirmRule++;
      items.push({
        kind: 'variance_over_firm_rule', ...head(l), ids: [`py:/${pr!.name}/lines/${l.key.replace(/~/g, '~0').replace(/\//g, '~1')}`],
        compared: 'the change from last year\'s return line against the firm variance rule (a reason is needed, not a mistake)',
        numbers: { value: l.value, priorReturnValue: r.priorReturnValue, changePercent: r.changePercent, firmVarianceRule: r.firmVarianceRule },
        difference: r.change as number,
      });
    }
  }

  // Fact copies: one item per sameFacts comparison that disagrees. The finding payload is kept apart (modes decide).
  const comps = sameFacts(ix);
  const fc = { definition: 'every sameFacts comparison on the latest return (five rules); one item per comparison that disagrees', applicable: comps.length, ran: comps.length, agree: 0, differ: 0, needsEngine: 0, notComparable: 0 };
  for (const c of comps) {
    if (c.agree) { fc.agree++; continue; }
    fc.differ++;
    const ls = c.claims.filter((x) => x.startsWith('line:')).map((x) => x.slice(5));
    const it: SweepItemFull = {
      kind: 'copies_disagree', ...(ls.length ? { key: ls[0] } : {}), ids: c.copies.map((x) => x.ref).filter((r): r is string => !!r), claims: [...c.claims], lines: ls,
      compared: 'copies of the same fact across sources', numbers: { shown: c.copies.map((x) => x.shown) }, difference: null,
      rule: c.rule, ruleText: null, agree: false, copies: c.copies.map((x) => ({ ...x })),
    };
    items.push(it);
    payload.set(it, {
      title: c.title, claims: c.claims, explanation: c.explanation, receipt: c.receipt ?? null,
      ...(c.effect !== undefined ? { effect: c.effect } : {}), ...(c.trigger !== undefined ? { trigger: c.trigger } : {}), ...(c.stopsEfile !== undefined ? { stopsEfile: c.stopsEfile } : {}),
    });
  }

  // Duplicates (duplicates.ts, shared with the calculator's `duplicates` method so the two mirror). (a) A line citing
  // one nonzero amount from 2+ distinct pages: what a double count leaves on the return.
  const du = { definition: `latest lines citing one nonzero amount-type value (money, integer, quantity) from 2 or more distinct (document, page) pairs; and page pairs with identical printed text (whitespace normalised), the same set of (field, money value) pairs, or near (word-pair similarity at least ${NEAR_WORDS} and a shared nonzero amount)`, applicable: 0, ran: 0, agree: 0, differ: 0, needsEngine: 0, notComparable: 0 };
  for (const l of lines) {
    const groups = amountCopies(ix, l);
    if (!groups) continue;
    du.applicable++; du.ran++;
    if (groups.length) du.differ++; else du.agree++;
    for (const g of groups) {
      const value = isNum(l.value) ? l.value : null;
      items.push({
        kind: 'duplicate_amount_cited', ...head(l), ids: g.ids,
        compared: 'one amount the line cites from two or more pages: once (corroboration), the copies added (double_count), or neither',
        numbers: { value: l.value, amount: g.amount, copies: g.ids.length, added: g.added, pages: g.pages }, difference: value === null ? null : round2(value - g.amount), relation: g.relation,
        superseded: g.superseded,
      });
    }
  }
  // (b) Page pairs: identical printed text, the same (field, money value) set, or near. A pair with a superseded
  // document is only counted: a correction re-sends its pages by design.
  const countedOnly = { duplicatePagesWithSuperseded: { identical: 0, sameValueSet: 0, near: 0 } };
  const counter = { identical: 'identical', same_value_set: 'sameValueSet', near: 'near' } as const;
  for (const p of pagePairs(ix)) {
    if (p.superseded.some(Boolean)) { countedOnly.duplicatePagesWithSuperseded[counter[p.likeness]]++; continue; }
    items.push({
      kind: 'duplicate_page', ids: [...p.pages], lines: p.lines,
      compared: p.likeness === 'identical' ? 'two pages with identical printed text' : p.likeness === 'same_value_set' ? 'two pages with the same set of (field, money value) pairs' : 'two pages with nearly the same words and a shared amount',
      numbers: null, difference: null, rule: null, ruleText: null, likeness: p.likeness, superseded: [...p.superseded],
    });
  }

  // Version changes: every key whose value differs, or that is added or removed, between consecutive versions, must be
  // listed in the later version's changes_from_previous.
  const vc = { definition: 'line keys whose value differs, or that are added or removed, between consecutive return versions (v1 to the latest); each must be listed in the later version\'s changes_from_previous', applicable: 0, ran: 0, agree: 0, differ: 0, needsEngine: 0, notComparable: 0, listed: 0 };
  for (let i = 1; i < ix.versions.length; i++) {
    const prev = ix.versions[i - 1]; const cur = ix.versions[i];
    const a = new Map(prev.lines.map((l) => [l.key, l])); const b = new Map(cur.lines.map((l) => [l.key, l]));
    const listed = new Set((cur.changes_from_previous ?? []).map((c) => c.key));
    for (const k of [...new Set([...a.keys(), ...b.keys()])].sort()) {
      const x = a.get(k); const y = b.get(k);
      if (x && y && same(x.value, y.value)) continue;
      vc.applicable++; vc.ran++;
      if (listed.has(k)) { vc.listed++; vc.agree++; continue; }
      vc.differ++;
      const before = x ? x.value : null; const after = y ? y.value : null;
      const l = y ?? x!;
      items.push({
        kind: 'version_change_unlisted', key: k, ids: [prev.version, cur.version], rule: l.rule, ruleText: ruleTextOf(ix, l.rule),
        compared: `the line in ${prev.version} and ${cur.version}: its value moved, but ${cur.version}'s changes_from_previous does not list it`,
        numbers: { before, after, added: !x, removed: !y }, difference: isNum(before) && isNum(after) ? round2(after - before) : null,
      });
    }
  }

  // Every numeric latest line accounted for exactly once; what no comparison reached needs the engine.
  for (const l of lines) if (isNum(l.value) && !status[l.key]) status[l.key] = 'needs_engine';
  const numeric = lines.filter((l) => isNum(l.value)).length;
  const lineStatus = Object.fromEntries(Object.entries(status).sort((x, y) => x[0].localeCompare(y[0])));
  const count = (s: LineStatus) => Object.values(lineStatus).filter((x) => x === s).length;
  ar.needsEngine = lines.filter((l) => isNum(l.value) && (l.inputs ?? []).length && !isArithmetic(l)).length;

  const rank = (k: VerifyAllKind) => VERIFY_ALL_KINDS.indexOf(k);
  const mag = (i: SweepItemFull) => (i.difference === null ? -1 : Math.abs(i.difference));
  const tie = (i: SweepItemFull) => `${i.key ?? ''}|${(i.ids ?? []).join(',')}|${(i.claims ?? []).join(',')}`;
  items.sort((x, y) => rank(x.kind) - rank(y.kind) || mag(y) - mag(x) || tie(x).localeCompare(tie(y)));
  const byKind = Object.fromEntries(VERIFY_ALL_KINDS.map((k) => [k, items.filter((i) => i.kind === k).length])) as Record<VerifyAllKind, number>;
  const scrub = scrubber(ix);
  const scrubbed = items.map((i) => scrub(i));
  const scrubbedPayload = new Map<SweepItemFull, Obj & { title: string; claims: string[] }>();
  items.forEach((i, n) => { const p = payload.get(i); if (p) scrubbedPayload.set(scrubbed[n], { ...scrub(p), title: p.title, claims: p.claims }); });
  const out: Base = {
    coverage: {
      lines: { numeric, tried: count('tried'), needsEngine: count('needs_engine'), notComparable: count('not_comparable') },
      lineStatus,
      methods: { arithmetic: ar, sources: so, prior_year: py, fact_copies: fc, version_changes: vc, duplicates: du },
    },
    byKind, countedOnly, items: scrubbed, payload: scrubbedPayload,
  };
  baseCache.set(ix, out);
  return out;
}

// ---------- A mode's view: finding-derived fields added only where the mode lets them through ----------
const sweepCache = new WeakMap<PacketIndex, Map<string, Sweep>>();

/** The whole sweep in a mode, every kind, in order (cached per packet and mode). */
export function sweep(ix: PacketIndex, mode: AgentMode = DEFAULT_MODE): Sweep {
  let m = sweepCache.get(ix);
  if (!m) { m = new Map(); sweepCache.set(ix, m); }
  const label = modeLabel(mode);
  const hit = m.get(label);
  if (hit) return hit;
  const b = base(ix);
  const blind = isBlind(mode);
  const claimed = new Set(findingsFor(ix, mode).flatMap((f) => f.claims));
  const hidden = comparisonPayloadHidden(ix, mode);
  const scrub = scrubber(ix);
  const items = b.items.map((i) => {
    const out: SweepItemFull = { ...i };
    const p = b.payload.get(i);
    if (p && !hidden({ title: p.title, claims: p.claims })) {
      const rest: Obj = { ...p };
      delete rest.claims;
      Object.assign(out, scrub(rest));
    }
    if (!blind) {
      const its = i.key ? [`line:${i.key}`, ...(i.claims ?? [])] : [...(i.claims ?? []), ...(i.lines ?? []).map((k) => `line:${k}`)];
      out.onCheck = its.some((c) => claimed.has(c));
    }
    return out;
  });
  const s: Sweep = { coverage: b.coverage, byKind: b.byKind, countedOnly: b.countedOnly, items };
  m.set(label, s);
  return s;
}

export interface VerifyAllInput { kind?: unknown; limit?: unknown; cursor?: unknown }

/** One page of the sweep: `kind` is one kind, 'differs' (the default: the six disagreement kinds) or 'all'. Errors are
 *  results ({ error }), never throws. Coverage and counts by kind come with every page. */
export function verifyAll(ix: PacketIndex, input: VerifyAllInput = {}, mode: AgentMode = DEFAULT_MODE): Obj {
  // Not a strict tool: the schema cannot refuse a bad input, so this does. Nothing is coerced.
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Input must be an object: { kind?, limit?, cursor? }.' };
  const extra = Object.keys(input).filter((k) => !['kind', 'limit', 'cursor'].includes(k));
  if (extra.length) return { error: `Unknown input ${extra.join(', ')}. Valid: kind (${['differs', 'all', ...VERIFY_ALL_KINDS].join(', ')}), limit (integer 1 to ${VERIFY_ALL_MAX_LIMIT}), cursor (integer 0 or more).` };
  const none = (x: unknown) => x === undefined || x === null;
  if (!none(input.kind) && typeof input.kind !== 'string') return { error: `kind must be a string: differs, all, or one of ${VERIFY_ALL_KINDS.join(', ')}.` };
  if (!none(input.limit) && !(typeof input.limit === 'number' && Number.isInteger(input.limit) && input.limit >= 1 && input.limit <= VERIFY_ALL_MAX_LIMIT)) {
    return { error: `limit must be an integer from 1 to ${VERIFY_ALL_MAX_LIMIT} (or null for ${VERIFY_ALL_DEFAULT_LIMIT}); got ${JSON.stringify(input.limit)}.` };
  }
  if (!none(input.cursor) && !(typeof input.cursor === 'number' && Number.isInteger(input.cursor) && input.cursor >= 0)) {
    return { error: `cursor must be an integer, 0 or more (or null for the first page); got ${JSON.stringify(input.cursor)}.` };
  }
  const kind = none(input.kind) ? 'differs' : String(input.kind);
  if (kind !== 'differs' && kind !== 'all' && !(VERIFY_ALL_KINDS as readonly string[]).includes(kind)) {
    return { error: `Unknown kind ${kind}. Use differs, all, or one of ${VERIFY_ALL_KINDS.join(', ')}.` };
  }
  const limit = none(input.limit) ? VERIFY_ALL_DEFAULT_LIMIT : (input.limit as number);
  const cursor = none(input.cursor) ? 0 : (input.cursor as number);
  const s = sweep(ix, mode);
  const pick = kind === 'all' ? s.items : kind === 'differs' ? s.items.filter((i) => DIFFERS_KINDS.includes(i.kind)) : s.items.filter((i) => i.kind === kind);
  const coverage: Obj = { ...s.coverage };
  delete coverage.lineStatus; // 600+ keys: sweep() has it; a page gives the totals
  let page = pick.slice(cursor, cursor + limit);
  const build = () => ({
    kind, coverage, byKind: s.byKind, countedOnly: s.countedOnly, total: pick.length, cursor,
    items: page, nextCursor: cursor + page.length < pick.length ? cursor + page.length : null,
  });
  while (page.length > 1 && Buffer.byteLength(JSON.stringify(build())) > VERIFY_ALL_PAGE_BYTES) page = page.slice(0, -1);
  return build();
}
