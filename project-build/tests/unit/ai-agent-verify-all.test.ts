// verify_all (ai/lib/verify-all.ts): one sweep of every deterministic comparison over every line, disagreements only,
// with coverage accounting. Real packet, altered and perturbed copies, no network. Cases are picked by probing the
// packet, never from the ledger; the expected counts are the plan's measured probe (docs/superpowers/plans/
// 2026-10-24-agent-cpa-toolkit.md, Task 1).
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { runChecks } from '@/domain/checks/index';
import { FLOW_RULES } from '@/domain/flow';
import { sameFacts } from '@/domain/facts';
import { proofsFor, sourceReceipt } from '@/domain/proofs';
import { SSN_SHAPED, supersession } from '@/domain/ai/verify';
import { hiddenCheckIds, rng, type AgentMode } from '../../ai/lib/modes';
import { verify } from '../../ai/lib/calculator';
import { runTool } from '../../ai/lib/agent-tools';
import { loadContextFiles } from '../../ai/lib/agent-core';
import { caseFile } from '../../ai/lib/case-file';
import { DIFFERS_KINDS, VERIFY_ALL_KINDS, VERIFY_ALL_PAGE_BYTES, sweep, verifyAll, type SweepItemFull } from '../../ai/lib/verify-all';
import { alteredPacket } from '../fixtures/altered';
import { perturbedPacket } from '../fixtures/perturbed';

const real = loadPacket();
const ix = indexPacket(real);
const DEFAULT: AgentMode = { kind: 'default' };
const BLIND: AgentMode = { kind: 'blind' };
const HIDE: AgentMode = { kind: 'hide-checks', seed: 1 };
const MODES: [string, AgentMode][] = [['default', DEFAULT], ['blind', BLIND], ['hide-checks seed 1', HIDE]];
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const V = ix.latest.version;
const sig = (i: SweepItemFull) => JSON.stringify([i.kind, i.key ?? null, i.ids ?? null, i.numbers ?? null]);
const PAYLOAD_KEYS = ['title', 'explanation', 'receipt', 'effect', 'trigger', 'stopsEfile'];
/** Every page of a kind (or view), walked with the cursor. */
function allPages(x: ReturnType<typeof indexPacket>, kind: string, mode: AgentMode = DEFAULT) {
  const out: SweepItemFull[] = []; const pages: string[] = [];
  for (let cursor: number | null = 0; cursor !== null;) {
    const r = verifyAll(x, { kind, limit: 20, cursor }, mode) as { items: SweepItemFull[]; nextCursor: number | null };
    pages.push(JSON.stringify(r));
    out.push(...r.items);
    cursor = r.nextCursor;
  }
  return { items: out, pages };
}

describe('verify_all: real packet, default mode', () => {
  const s = sweep(ix, DEFAULT);

  it('counts by kind: the plan\'s probe', () => {
    expect(s.byKind).toMatchObject({
      arithmetic_unreachable: 5, source_unreachable: 29, prior_record_differs: 7, copies_disagree: 11,
      duplicate_amount_cited: 5, version_change_unlisted: 0, sign_subtraction: 19, variance_over_firm_rule: 51,
    });
    expect(Object.keys(s.byKind).sort()).toEqual([...VERIFY_ALL_KINDS].sort());
  });

  it('`differs` lists the six disagreement kinds only (57 items, pages of up to 20 that fit the bound); sign_subtraction and variance only on `kind`', () => {
    const d = allPages(ix, 'differs');
    expect(d.items).toHaveLength(57);
    expect(new Set(d.items.map(sig)).size).toBe(57); // the cursor walk neither repeats nor skips
    expect(d.pages.length).toBeGreaterThanOrEqual(3);
    expect(new Set(d.items.map((i) => i.kind))).toEqual(new Set(DIFFERS_KINDS.filter((k) => s.byKind[k] > 0)));
    expect(d.items.some((i) => ['sign_subtraction', 'variance_over_firm_rule', 'duplicate_page'].includes(i.kind))).toBe(false);
    expect(allPages(ix, 'sign_subtraction').items).toHaveLength(19);
    expect(allPages(ix, 'variance_over_firm_rule').items).toHaveLength(51);
    expect(allPages(ix, 'all').items).toHaveLength(s.items.length);
    const first = verifyAll(ix) as { kind: string; total: number; items: unknown[] };
    expect(first.kind).toBe('differs');
    expect(first.total).toBe(57);
    expect(first.items).toHaveLength(20);
  });

  it('coverage accounts for every numeric latest line exactly once: tried, needs_engine or not_comparable', () => {
    const numeric = ix.latest.lines.filter((l) => isNum(l.value)).map((l) => l.key).sort();
    const st = s.coverage.lineStatus;
    expect(Object.keys(st).sort()).toEqual(numeric);
    const c = s.coverage.lines;
    expect(c.numeric).toBe(numeric.length);
    expect(c.tried + c.needsEngine + c.notComparable).toBe(numeric.length);
    for (const k of ['tried', 'needs_engine', 'not_comparable'] as const) {
      expect(Object.values(st).filter((x) => x === k).length).toBe(k === 'tried' ? c.tried : k === 'needs_engine' ? c.needsEngine : c.notComparable);
    }
    // Over 12 inputs or over 12 cited values: 3 arithmetic lines today (13, 119 and 160 inputs).
    const over = ix.latest.lines.filter((l) => !!l.rule && FLOW_RULES.includes(l.rule) && (l.inputs ?? []).length > 12);
    expect(over.map((l) => l.inputs.length).sort((a, b) => a - b)).toEqual([13, 119, 160]);
    expect(c.notComparable).toBe(3);
    for (const l of over) expect(st[l.key]).toBe('not_comparable');
  });

  it('every denominator is defined in code and asserted', () => {
    const m = s.coverage.methods;
    // arithmetic: rule in FLOW_RULES, inputs listed
    const arith = ix.latest.lines.filter((l) => !!l.rule && FLOW_RULES.includes(l.rule) && (l.inputs ?? []).length > 0);
    expect(arith).toHaveLength(136);
    expect(m.arithmetic).toMatchObject({ applicable: 136, ran: 133, notComparable: 3, differ: 24, signReached: 19, unreachable: 5 });
    expect(m.arithmetic.agree + m.arithmetic.differ).toBe(m.arithmetic.ran);
    // sources: numeric, no inputs, 1 to 12 numeric ev- sources
    const srcN = (l: (typeof ix.latest.lines)[number]) => (l.sources ?? []).filter((x) => x.startsWith('ev-') && isNum(ix.valueById.get(x)?.value)).length;
    const src = ix.latest.lines.filter((l) => isNum(l.value) && !(l.inputs ?? []).length && srcN(l) >= 1 && srcN(l) <= 12);
    expect(src).toHaveLength(375);
    expect(m.sources).toMatchObject({ applicable: 375, ran: 375, agree: 346, differ: 29, receipted: 5 });
    // prior_year: a same-key 2024 line or a py: source
    const py = (real.prior_years as { return_2024?: { lines?: Record<string, unknown> } }).return_2024?.lines ?? {};
    const pyLines = ix.latest.lines.filter((l) => l.key in py || (l.sources ?? []).some((x) => x.startsWith('py:')));
    expect(pyLines).toHaveLength(94);
    expect(m.prior_year).toMatchObject({ applicable: 94, recordsDiffer: 7, overFirmRule: 51 });
    // version changes: value differs or key added/removed, v1 to v3
    expect(m.version_changes).toMatchObject({ applicable: 152, listed: 152, differ: 0 });
    // fact copies: every sameFacts comparison
    expect(m.fact_copies).toMatchObject({ applicable: sameFacts(ix).length, agree: 25, differ: 11 });
    for (const k of Object.keys(m) as (keyof typeof m)[]) expect(typeof m[k].definition, k).toBe('string');
  });

  it('5 of the 29 source items carry the agreed-to-source receipt (one matching source), and say so', () => {
    const items = s.items.filter((i) => i.kind === 'source_unreachable');
    expect(items).toHaveLength(29);
    expect(items.filter((i) => i.receipted === true)).toHaveLength(5);
    for (const i of items) expect(i.receipted, i.key).toBe(sourceReceipt(ix, ix.line(V, i.key!)!) !== null);
  });

  it('the source-receipt predicate is the one proofsFor uses (its agreed_to_source_document proof is unchanged)', () => {
    for (const l of ix.latest.lines) {
      const p = proofsFor(ix, l.key).find((x) => x.method === 'agreed_to_source_document') ?? null;
      const r = isNum(l.value) ? sourceReceipt(ix, l) : null;
      expect(r, l.key).toEqual(p);
    }
  });

  it('copies_disagree: one item per sameFacts comparison that disagrees, with copies and values', () => {
    const items = s.items.filter((i) => i.kind === 'copies_disagree');
    const dis = sameFacts(ix).filter((c) => !c.agree);
    expect(items).toHaveLength(dis.length);
    for (const i of items) {
      expect(i.copies!.length).toBeGreaterThan(1);
      expect(i.claims!.some((c) => c.startsWith('line:'))).toBe(true);
    }
  });

  it('duplicate_amount_cited: the 5 lines, each with its relation; identical-print pairs with a superseded document only counted (28)', () => {
    const items = s.items.filter((i) => i.kind === 'duplicate_amount_cited');
    expect(items).toHaveLength(5);
    for (const i of items) expect(['corroboration', 'double_count', 'neither']).toContain(i.relation);
    expect(items.filter((i) => i.relation === 'corroboration')).toHaveLength(3);
    expect(s.countedOnly.duplicatePagesWithSuperseded.identical).toBe(28);
    const sup = supersession(ix);
    for (const i of s.items.filter((x) => x.kind === 'duplicate_page')) for (const id of i.ids!) expect(sup.has(id.split('#')[0]), id).toBe(false);
  });

  it('no ledger id, finding id, check id or full name in any item; SSN-free; deterministic order', () => {
    const f = runChecks(ix);
    const text = JSON.stringify(s.items);
    expect(text).not.toMatch(/GT-[A-Z]\d\d|CHK-[A-Z]/);
    for (const x of f) {
      expect(text.includes(`"${x.id}"`), x.id).toBe(false);
      expect(text.includes(x.checkId), x.checkId).toBe(false);
      for (const id of x.ledgerIds) expect(text.includes(id), id).toBe(false);
    }
    const people = ((real.household as { people?: { name?: string }[] }).people ?? []).map((p) => p.name ?? '').filter((n) => n.includes(' '));
    expect(people.length).toBeGreaterThan(0);
    for (const n of people) expect(text.includes(n)).toBe(false);
    expect(SSN_SHAPED.test(text)).toBe(false);
    expect(JSON.stringify(sweep(indexPacket(structuredClone(real)), DEFAULT).items)).toBe(text);
    // hardest first: kinds in rank order, then by |difference|
    const rank = s.items.map((i) => VERIFY_ALL_KINDS.indexOf(i.kind));
    expect([...rank].sort((a, b) => a - b)).toEqual(rank);
  });

  it('every page at the default size fits the tool-result bound; a bad kind or limit is an error, not a throw', () => {
    for (const [, mode] of MODES) for (const k of ['differs', 'all', ...VERIFY_ALL_KINDS]) for (const p of allPages(ix, k, mode).pages) expect(Buffer.byteLength(p), k).toBeLessThanOrEqual(VERIFY_ALL_PAGE_BYTES);
    expect(VERIFY_ALL_PAGE_BYTES).toBeLessThan(16_000);
    expect(verifyAll(ix, { kind: 'nope' })).toHaveProperty('error');
    expect(verifyAll(ix, { kind: '1000' })).toHaveProperty('error');
    expect((verifyAll(ix, { kind: 'all', limit: 500 }) as { items: unknown[] }).items.length).toBeLessThanOrEqual(50);
  });
});

describe('verify_all: modes (raw comparisons in every mode; only finding-derived fields differ)', () => {
  const lines = ix.latest.lines.map((l) => l.key);

  it.each(MODES)('%s: arithmetic and prior-year kinds mirror their verify method over every line', (_n, mode) => {
    const s = sweep(ix, mode);
    const keysOf = (k: string) => s.items.filter((i) => i.kind === k).map((i) => i.key).sort();
    const rl = lines.map((k) => verify(ix, { method: 'recompute_line', ids: [k], target: null }, mode));
    const notComparable = new Set(Object.entries(s.coverage.lineStatus).filter(([, v]) => v === 'not_comparable').map(([k]) => k));
    expect(keysOf('arithmetic_unreachable')).toEqual(rl.filter((r) => r.agrees === false && r.signsReaching === null && !notComparable.has(r.key as string)).map((r) => r.key).sort());
    expect(keysOf('sign_subtraction')).toEqual(rl.filter((r) => r.agrees === false && Array.isArray(r.signsReaching)).map((r) => r.key).sort());
    const py = lines.map((k) => verify(ix, { method: 'prior_year', ids: [k], target: null }, mode));
    expect(keysOf('prior_record_differs')).toEqual(py.filter((r) => r.agreesWithPriorRecords === false).map((r) => r.key).sort());
    expect(keysOf('variance_over_firm_rule')).toEqual(py.filter((r) => r.overFirmThreshold === true).map((r) => r.key).sort());
  });

  it('default: copies_disagree mirrors fact_copies disagreements over every line and document', () => {
    const seen = new Set<string>();
    for (const t of [...lines, ...real.documents.map((d) => d.id)]) {
      for (let c: number | null = 0; c !== null;) {
        const r = JSON.parse(runTool(ix, 'verify', { method: 'fact_copies', ids: [t], target: null, limit: 50, cursor: c })) as { data: { items?: { agree: boolean; rule: string; claims: string[] }[]; nextCursor?: number | null } };
        for (const i of r.data.items ?? []) if (!i.agree) seen.add(JSON.stringify([i.rule, i.claims]));
        c = r.data.nextCursor ?? null;
      }
    }
    const mine = new Set(sweep(ix, DEFAULT).items.filter((i) => i.kind === 'copies_disagree').map((i) => JSON.stringify([i.rule, i.claims])));
    expect(mine).toEqual(seen);
  });

  it('the item sets (kind, key, ids, numbers) are identical in every mode', () => {
    const base = sweep(ix, DEFAULT).items.map(sig);
    for (const [n, mode] of MODES) {
      expect(sweep(ix, mode).items.map(sig), n).toEqual(base);
      expect(sweep(ix, mode).byKind, n).toEqual(sweep(ix, DEFAULT).byKind);
      expect(sweep(ix, mode).coverage, n).toEqual(sweep(ix, DEFAULT).coverage);
    }
  });

  it('default: copies_disagree items carry the comparison wording; onCheck from the findings', () => {
    const s = sweep(ix, DEFAULT);
    const claimed = new Set(runChecks(ix).flatMap((f) => f.claims));
    expect(s.items.filter((i) => i.kind === 'copies_disagree').every((i) => typeof i.title === 'string')).toBe(true);
    for (const i of s.items.filter((x) => x.key)) expect(i.onCheck, i.key).toBe(claimed.has(`line:${i.key}`));
    expect(s.items.some((i) => i.onCheck === false)).toBe(true);
  });

  it('blind leak test: no finding title, explanation, check id, ledger id or finding id in any tool result or the case file', () => {
    const f = runChecks(ix);
    const esc = (t: string) => JSON.stringify(t).slice(1, -1);
    const out: string[] = [];
    for (const k of ['all', 'differs', ...VERIFY_ALL_KINDS]) out.push(...allPages(ix, k, BLIND).pages);
    const all = sweep(ix, BLIND).items;
    for (const l of lines) {
      out.push(runTool(ix, 'get_line', { key: l }, { mode: BLIND }));
      for (const m of ['recompute_line', 'prior_year', 'fact_copies']) out.push(runTool(ix, 'verify', { method: m, ids: [l], target: null }, { mode: BLIND }));
    }
    for (const d of real.documents) for (const p of d.pages) out.push(runTool(ix, 'get_page', { doc: d.id, page: p.page }, { mode: BLIND }));
    out.push(runTool(ix, 'list_open_leftovers', { kind: null, limit: 50, cursor: 0 }, { mode: BLIND }));
    const { digest } = loadContextFiles(process.cwd());
    const cf = caseFile(ix, digest, BLIND);
    out.push(cf);
    const text = out.join('\n');
    expect(text).not.toMatch(/GT-[A-Z]\d\d|CHK-[A-Z]/);
    for (const x of f) {
      expect(text.includes(esc(x.title)), x.title).toBe(false);
      expect(text.includes(esc(x.explanation)), `${x.checkId} explanation`).toBe(false);
      expect(text.includes(`"${x.id}"`), x.id).toBe(false);
      expect(text.includes(x.checkId), x.checkId).toBe(false);
    }
    // verify_all in blind: no onCheck key, no finding payload on copies_disagree, which are present with values
    expect(JSON.stringify(all)).not.toContain('"onCheck"');
    const copies = all.filter((i) => i.kind === 'copies_disagree');
    expect(copies).toHaveLength(11);
    for (const i of copies) {
      for (const k of PAYLOAD_KEYS) expect(i, k).not.toHaveProperty(k);
      expect(i.copies!.every((c) => typeof c.shown === 'string')).toBe(true);
    }
    // the case file in blind has no F status
    const rows = cf.split('\n## ').find((x) => x.startsWith('State map'))!.split('\n').filter((l) => /^\S+ \| .* \| \S* \| [PFOE]$/.test(l));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((l) => l.endsWith(' | F'))).toBe(false);
  });

  it('hide-checks: no hidden finding\'s payload fields, no onCheck: true from a hidden finding', () => {
    const f = runChecks(ix);
    const hidden = new Set(hiddenCheckIds(HIDE.kind === 'hide-checks' ? HIDE.seed : 0));
    const gone = f.filter((x) => hidden.has(x.checkId));
    const visibleClaims = new Set(f.filter((x) => !hidden.has(x.checkId)).flatMap((x) => x.claims));
    expect(gone.length).toBeGreaterThan(0);
    const s = sweep(ix, HIDE);
    const text = JSON.stringify(s.items);
    const esc = (t: string) => JSON.stringify(t).slice(1, -1);
    for (const x of gone) {
      expect(text.includes(esc(x.title)), x.title).toBe(false);
      expect(text.includes(esc(x.explanation)), `${x.checkId} explanation`).toBe(false);
    }
    for (const i of s.items) if (i.onCheck === true) expect((i.key ? [`line:${i.key}`] : i.claims!).some((c) => visibleClaims.has(c)), i.key ?? i.claims!.join()).toBe(true);
    // a hidden comparison keeps rule, claims, copies and agree, and drops the payload
    const bare = s.items.filter((i) => i.kind === 'copies_disagree' && !('title' in i));
    expect(bare.length).toBeGreaterThan(0);
    for (const i of bare) for (const k of PAYLOAD_KEYS) expect(i).not.toHaveProperty(k);
  });
});

describe('verify_all: perturbation (proves the non-zeros), altered and perturbed packets', () => {
  const base = sweep(ix, DEFAULT).items;
  const baseSigs = new Set(base.map(sig));
  const touches = (i: SweepItemFull, keys: Set<string>, evs: Set<string>) =>
    (i.key && keys.has(i.key)) || (i.claims ?? []).some((c) => keys.has(c.replace(/^line:/, ''))) || (i.ids ?? []).some((x) => evs.has(x) || keys.has(x));

  it('one arithmetic input +1,000, one cited source +500, one change unlisted: each an item of its kind, nothing else moves', () => {
    const p = structuredClone(real);
    const lat = p.return_versions[p.return_versions.length - 1];
    const byKey = new Map(lat.lines.map((l) => [l.key, l]));
    const parents = (k: string) => lat.lines.filter((l) => (l.inputs ?? []).includes(k));
    const r = rng(1);
    const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
    // arithmetic: a line its 2..12 inputs add up to plainly; an input that feeds only it
    const arithCands = lat.lines.filter((l) => !!l.rule && FLOW_RULES.includes(l.rule) && l.inputs.length >= 2 && l.inputs.length <= 12
      && l.inputs.every((k) => isNum(byKey.get(k)?.value)) && Math.abs(l.inputs.reduce((s, k) => s + (byKey.get(k)!.value as number), 0) - (l.value as number)) < 1
      && l.inputs.some((k) => parents(k).length === 1));
    expect(arithCands.length).toBeGreaterThan(0);
    const P = pick(arithCands);
    const X = P.inputs.find((k) => parents(k).length === 1)!;
    (byKey.get(X)!.value as number) += 1000;
    // source: a line tied to its one cited money value, cited by no other line
    const citers = (ev: string) => lat.lines.filter((l) => (l.sources ?? []).includes(ev));
    const srcCands = lat.lines.filter((l) => l.key !== P.key && l.key !== X && !(l.inputs ?? []).length && isNum(l.value) && Math.abs(l.value) > 0
      && (l.sources ?? []).length === 1 && l.sources[0].startsWith('ev-') && citers(l.sources[0]).length === 1
      && ix.valueById.get(l.sources[0])?.value === l.value);
    expect(srcCands.length).toBeGreaterThan(0);
    const L = pick(srcCands);
    const ev = p.extracted_values.find((v) => v.id === L.sources[0])!;
    (ev.value as number) += 500;
    // version change: drop one listed change on a line not otherwise touched
    const ch = lat.changes_from_previous.filter((c) => ![P.key, X, L.key].includes(c.key));
    expect(ch.length).toBeGreaterThan(0);
    const K = pick(ch).key;
    lat.changes_from_previous = lat.changes_from_previous.filter((c) => c.key !== K);

    const s = sweep(indexPacket(p), DEFAULT);
    expect(s.items.some((i) => i.kind === 'arithmetic_unreachable' && i.key === P.key), P.key).toBe(true);
    expect(s.items.some((i) => i.kind === 'source_unreachable' && i.key === L.key), L.key).toBe(true);
    expect(s.items.some((i) => i.kind === 'version_change_unlisted' && i.key === K), K).toBe(true);
    const keys = new Set([P.key, X, L.key, K]); const evs = new Set([ev.id]);
    const now = new Set(s.items.map(sig));
    for (const i of s.items) if (!baseSigs.has(sig(i))) expect(touches(i, keys, evs), `new ${sig(i)}`).toBe(true);
    for (const i of base) if (!now.has(sig(i))) expect(touches(i, keys, evs), `gone ${sig(i)}`).toBe(true);
  });

  it('a shifted input of the 160-input line yields not_comparable, never arithmetic_unreachable', () => {
    const p = structuredClone(real);
    const lat = p.return_versions[p.return_versions.length - 1];
    const big = lat.lines.find((l) => (l.inputs ?? []).length === 160)!;
    const x = lat.lines.find((l) => l.key === big.inputs[0])!;
    (x.value as number) += 1000;
    const s = sweep(indexPacket(p), DEFAULT);
    expect(s.coverage.lineStatus[big.key]).toBe('not_comparable');
    expect(s.items.some((i) => i.key === big.key && i.kind.startsWith('arithmetic'))).toBe(false);
  });

  it('a second, unsuperseded copy of a page whose amount a line cites again yields a duplicate_amount_cited item', () => {
    const p = structuredClone(real);
    const sup = supersession(ix);
    const lat = p.return_versions[p.return_versions.length - 1];
    const L = lat.lines.find((l) => !(l.inputs ?? []).length && (l.sources ?? []).length === 1 && l.sources[0].startsWith('ev-')
      && (() => { const v = ix.valueById.get(l.sources[0]); return !!v && v.value_type === 'money' && isNum(v.value) && v.value !== 0 && !sup.has(v.document_id); })())!;
    expect(L).toBeDefined();
    const v = ix.valueById.get(L.sources[0])!;
    const doc = structuredClone(p.documents.find((d) => d.id === v.document_id)!);
    const newId = 'DCOPY';
    doc.id = newId;
    doc.pages = doc.pages.filter((pg) => pg.page === v.page);
    doc.page_count = 1;
    p.documents.push(doc);
    const copies = p.extracted_values.filter((x) => x.document_id === v.document_id && x.page === v.page).map((x, n) => ({ ...structuredClone(x), id: `ev-9${String(n).padStart(4, '0')}`, document_id: newId }));
    p.extracted_values.push(...copies);
    const again = copies.find((x) => x.field === v.field)!;
    L.sources = [...L.sources, again.id];
    const s = sweep(indexPacket(p), DEFAULT);
    const item = s.items.find((i) => i.kind === 'duplicate_amount_cited' && i.key === L.key);
    expect(item, L.key).toBeDefined();
    expect(item!.relation).toBe('corroboration');
    expect(s.items.some((i) => i.kind === 'duplicate_page' && i.ids!.some((x) => x.startsWith(`${newId}#`)))).toBe(true);
  });

  it('altered packet (renamed people, one form removed): the same counts by kind', () => {
    const a = sweep(indexPacket(alteredPacket()), DEFAULT).byKind;
    const b = sweep(ix, DEFAULT).byKind;
    for (const k of ['arithmetic_unreachable', 'source_unreachable', 'prior_record_differs', 'copies_disagree', 'version_change_unlisted', 'sign_subtraction'] as const) expect(a[k], k).toBe(b[k]);
  });

  it('perturbed seeds 1 and 2: no unlisted version change', () => {
    for (const seed of [1, 2]) expect(sweep(indexPacket(perturbedPacket(seed).packet), DEFAULT).byKind.version_change_unlisted, `seed ${seed}`).toBe(0);
  });
});
