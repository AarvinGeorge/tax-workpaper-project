// Duplicate pages and amounts (docs/superpowers/plans/2026-10-24-agent-cpa-toolkit.md, Tasks 1 and 2): one definition
// shared by the calculator's `duplicates` method and verify_all's duplicate_* kinds, so the two always mirror. Pure,
// read-only, generic over the schema (no form, line, document or check id is named here); cached per packet.
//
// How alike two pages are, strongest first:
//   identical       the printed text is the same (whitespace normalised);
//   same_value_set  the same non-empty set of (field, money value) pairs was read from both;
//   near            word-pair similarity (Dice over `bigrams`, src/domain/checks/util.ts) at least NEAR_WORDS, and the
//                   two pages share at least one nonzero amount (money, integer or quantity). `bigrams` keeps words only, so two copies of one
//                   form template score 1 whatever their figures; the shared amount is what makes it a near copy;
//   different       none of the above (given only for the pages of one amount a line cites, never listed as a pair).
import type { PacketIndex } from '../../src/domain/packet/load';
import type { ExtractedValue, ReturnLine } from '../../src/domain/packet/types';
import { bigrams } from '../../src/domain/checks/util';
import { documentLanding } from '../../src/domain/docs';
import { supersession } from '../../src/domain/ai/verify';

export type Likeness = 'identical' | 'same_value_set' | 'near' | 'different';
/** Word-pair similarity at or above which two pages sharing a nonzero amount are a near copy. */
export const NEAR_WORDS = 0.9;
/** Amounts may be added; identifiers, dates, codes and text may not (the calculator re-exports it as AMOUNT_TYPES). */
export const AMOUNTS = new Set(['money', 'integer', 'quantity']);
const NEAR = 1;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const round2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

interface PageFacts { id: string; doc: string; print: string; words: Set<string>; valueSet: string; amounts: Set<number> }
export interface PagePair {
  /** The two pages, `doc#page`, sorted. */
  pages: [string, string];
  likeness: Exclude<Likeness, 'different'>;
  wordSimilarity: number;
  superseded: [boolean, boolean];
  landed: [boolean, boolean];
  cited: [boolean, boolean];
  /** Latest-return lines citing a value on either page, sorted. */
  lines: string[];
}
export interface AmountCopies {
  amount: number;
  /** The cited value ids carrying the amount, in the line's source order. */
  ids: string[];
  /** Their distinct pages, in that order (2 or more). */
  pages: string[];
  added: number;
  /** The line's value against the amount: once (corroboration), the copies added (double_count), or neither. */
  relation: 'corroboration' | 'double_count' | 'neither';
  superseded: boolean[];
  /** Every pair of those pages and how alike they are. */
  pairs: { pages: [string, string]; likeness: Likeness; wordSimilarity: number }[];
}

interface Index { pages: Map<string, PageFacts>; pairs: PagePair[]; byPage: Map<string, PagePair[]>; sup: Map<string, unknown> }
const cache = new WeakMap<PacketIndex, Index>();

/** Dice coefficient over the two pages' word pairs (0 when both have none). */
function similarity(a: PageFacts, b: PageFacts): number {
  const n = a.words.size + b.words.size;
  if (!n) return 0;
  let both = 0;
  for (const w of a.words) if (b.words.has(w)) both++;
  return Math.round(((2 * both) / n) * 1000) / 1000;
}

function likenessOf(a: PageFacts, b: PageFacts, sim: number): Likeness {
  if (a.print && a.print === b.print) return 'identical';
  if (a.valueSet && a.valueSet === b.valueSet) return 'same_value_set';
  if (sim >= NEAR_WORDS && [...a.amounts].some((x) => b.amounts.has(x))) return 'near';
  return 'different';
}

function index(ix: PacketIndex): Index {
  const hit = cache.get(ix);
  if (hit) return hit;
  const sup = supersession(ix);
  const landed = new Set(documentLanding(ix, '9999-12-31T00:00:00Z').filter((d) => d.status === 'landed').map((d) => d.docId));
  const citedBy = new Map<string, Set<string>>();
  for (const l of ix.latest.lines) for (const s of l.sources ?? []) {
    const x = ix.valueById.get(s);
    if (x) { const k = `${x.document_id}#${x.page}`; citedBy.set(k, (citedBy.get(k) ?? new Set()).add(l.key)); }
  }
  const pages = new Map<string, PageFacts>();
  for (const d of ix.packet.documents) for (const p of d.pages) {
    const id = `${d.id}#${p.page}`;
    const vals = (ix.valuesByDoc.get(d.id) ?? []).filter((x) => x.page === p.page && isNum(x.value));
    pages.set(id, {
      id, doc: d.id, print: norm(p.printed_content ?? ''), words: new Set(bigrams(p.printed_content ?? '')),
      valueSet: vals.filter((x) => x.value_type === 'money').map((x) => `${x.field}=${JSON.stringify(x.value)}`).sort().join('|'),
      amounts: new Set(vals.filter((x) => AMOUNTS.has(x.value_type) && x.value !== 0).map((x) => x.value as number)),
    });
  }
  const all = [...pages.values()];
  const pairs: PagePair[] = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const sim = similarity(all[i], all[j]);
    const likeness = likenessOf(all[i], all[j], sim);
    if (likeness === 'different') continue;
    const [a, b] = [all[i].id, all[j].id].sort() as [string, string];
    const docOf = (x: string) => pages.get(x)!.doc;
    pairs.push({
      pages: [a, b], likeness, wordSimilarity: sim,
      superseded: [sup.has(docOf(a)), sup.has(docOf(b))], landed: [landed.has(docOf(a)), landed.has(docOf(b))],
      cited: [citedBy.has(a), citedBy.has(b)],
      lines: [...new Set([...(citedBy.get(a) ?? []), ...(citedBy.get(b) ?? [])])].sort(),
    });
  }
  pairs.sort((x, y) => x.pages.join('|').localeCompare(y.pages.join('|')));
  const byPage = new Map<string, PagePair[]>();
  for (const p of pairs) for (const id of p.pages) byPage.set(id, [...(byPage.get(id) ?? []), p]);
  const out: Index = { pages, pairs, byPage, sup };
  cache.set(ix, out);
  return out;
}

/** Every page pair that is identical, has the same value set, or is near, in `doc#page` order. */
export const pagePairs = (ix: PacketIndex): PagePair[] => index(ix).pairs;

/** The pairs with a page of one document (pages of that document paired with each other included, once each). */
export function documentPairs(ix: PacketIndex, docId: string): PagePair[] {
  return pagePairs(ix).filter((p) => p.pages.some((x) => x.startsWith(`${docId}#`)));
}

/** A line's cited nonzero amounts that come from 2 or more distinct pages; null when the line cites fewer than 2
 *  amount values (the comparison does not apply). */
export function amountCopies(ix: PacketIndex, l: ReturnLine): AmountCopies[] | null {
  const vs = (l.sources ?? []).map((s) => ix.valueById.get(s)).filter((x): x is ExtractedValue => !!x && AMOUNTS.has(x.value_type) && isNum(x.value) && x.value !== 0);
  if (vs.length < 2) return null;
  const { pages, sup } = index(ix);
  const byAmount = new Map<number, ExtractedValue[]>();
  for (const x of vs) byAmount.set(x.value as number, [...(byAmount.get(x.value as number) ?? []), x]);
  const out: AmountCopies[] = [];
  for (const [amount, xs] of [...byAmount].sort((a, b) => a[0] - b[0])) {
    const ps = [...new Set(xs.map((x) => `${x.document_id}#${x.page}`))];
    if (ps.length < 2) continue;
    const added = round2(xs.reduce((s, x) => s + (x.value as number), 0));
    const relation = !isNum(l.value) ? 'neither' : Math.abs(Math.abs(l.value) - Math.abs(amount)) < NEAR ? 'corroboration' : Math.abs(Math.abs(l.value) - Math.abs(added)) < NEAR ? 'double_count' : 'neither';
    const pairs: AmountCopies['pairs'] = [];
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = pages.get(ps[i]); const b = pages.get(ps[j]);
      const sim = a && b ? similarity(a, b) : 0;
      pairs.push({ pages: [ps[i], ps[j]], likeness: a && b ? likenessOf(a, b, sim) : 'different', wordSimilarity: sim });
    }
    out.push({ amount, ids: xs.map((x) => x.id), pages: ps, added, relation, superseded: ps.map((p) => sup.has(p.split('#')[0])), pairs });
  }
  return out;
}
