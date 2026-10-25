// Perturbed packet (CPA toolkit plan, Task 0): the generalisation test. Built in memory from the real packet, never
// written to disk, like altered.ts. A seed (mulberry32, as modes.ts) picks targets by schema shape only, never by id,
// and avoids every line a finding of the real packet claims, so each plant is a mistake the checks were not written
// for. Kinds:
//   source_changed  one cited money value changed with its text_as_read and its page's printed_content (the line stays):
//                   the document and the line no longer tie;
//   copied_twice    one document's page repeated as a new page of a second, unsuperseded document of the same type,
//                   its money value cited again by the same line, which is raised by it (a double count);
//   prior_shift     a 2025 line that cites a py: record shifted past the firm's variance rule; the py record and the
//                   prior-year pages stay as the truth;
//   fx_wrong_year   a line citing ref:fx.<cur>.<key> switched to another year's key, its value rescaled by the ratio;
//   page_duplicated one page copied as an extra page of its own document, its cited values cited again.
// Every moved line's delta is carried up its arithmetic ancestors (FLOW_RULES ops, as the engine fitted them) in every
// return version where the line had its latest value, and changes_from_previous entries that quoted a moved value are
// moved with it, so no version change is unlisted. The planted list (the gold) is returned beside the packet and never
// enters it: no note, label or field mentions it.
import { indexPacket, loadPacket, type PacketIndex } from '@/domain/packet/load';
import type { DocPage, ExtractedValue, Packet, PacketDocument, ReturnLine, ReturnVersion } from '@/domain/packet/types';
import { supersession } from '@/domain/ai/verify';
import { runChecks } from '@/domain/checks/index';
import { rng } from '../../ai/lib/modes';

export const PLANT_KINDS = ['source_changed', 'copied_twice', 'prior_shift', 'fx_wrong_year', 'page_duplicated'] as const;
export type PlantKind = (typeof PLANT_KINDS)[number];
/** How many of each kind a seed plants (about 8 in all); fewer when the packet has too few eligible targets. */
export const PLANT_COUNTS: Record<PlantKind, number> = { source_changed: 2, copied_twice: 2, prior_shift: 2, fx_wrong_year: 1, page_duplicated: 1 };
/** The one fixed seed of the measurement (plan: "agent-v4 independent x perturbed, one fixed seed"). */
export const PERTURBED_SEED = 1;

/** One changed place, as packetDiff names it; before/after as this plant found and left it (plants apply in order). */
export interface PlantRef { path: string; before: unknown; after: unknown }
export interface Plant {
  kind: PlantKind;
  /** The planted line(s): the target(s) the mistake sits on. */
  lines: string[];
  /** The claim set: the planted line(s) plus every ancestor whose value moved, in any version. */
  claims: string[];
  refs: PlantRef[];
}
export interface Skipped { kind: PlantKind; reason: string }
export interface Perturbed { packet: Packet; planted: Plant[]; skipped: Skipped[] }

type Obj = Record<string, unknown>;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Money text in the packet's own format ("1,234.56", "-1,234.00", "120.00") ----------
const MONEY = /^(-?)(\$?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?$/;
export function parseMoney(text: string): number | null {
  const m = text.trim().match(MONEY);
  if (!m) return null;
  const n = Number(`${m[3].replace(/,/g, '')}${m[4] ? '.' + m[4] : ''}`);
  return m[1] ? -n : n;
}
/** `n` written the way `like` is written: sign, dollar sign, thousands commas and decimals. */
export function moneyText(like: string, n: number): string {
  const m = like.trim().match(MONEY)!;
  const decimals = m[4]?.length ?? 0;
  const abs = Math.abs(n).toFixed(decimals);
  const [int, frac] = abs.split('.');
  const commas = m[3].includes(',') || m[3].length <= 3; // a short figure says nothing: the packet's style has commas
  const grouped = commas ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : int;
  return `${n < 0 ? '-' : ''}${m[2]}${grouped}${frac !== undefined ? '.' + frac : ''}`;
}
const occurrences = (hay: string, needle: string) => (needle ? hay.split(needle).length - 1 : 0);

// ---------- A generic diff, keyed by ids, so a plant's refs and the difference name places the same way ----------
const ID_KEYS = ['id', 'key', 'version', 'page'];
function idKeyOf(a: unknown[], b: unknown[]): string | null {
  const all = [...a, ...b];
  if (!all.length || !all.every((x) => x && typeof x === 'object' && !Array.isArray(x))) return null;
  for (const k of ID_KEYS) {
    const ok = (arr: unknown[]) => { const ids = arr.map((x) => (x as Obj)[k]); return ids.every((v) => typeof v === 'string' || typeof v === 'number') && new Set(ids).size === ids.length; };
    if (ok(a) && ok(b)) return k;
  }
  return null;
}
/** Every leaf (or added/removed record) that differs, by path: segments joined by '/', records by their id. */
export function packetDiff(a: unknown, b: unknown): Map<string, { before: unknown; after: unknown }> {
  const out = new Map<string, { before: unknown; after: unknown }>();
  const walk = (x: unknown, y: unknown, p: string) => {
    if (same(x, y)) return;
    if (Array.isArray(x) && Array.isArray(y)) {
      const k = idKeyOf(x, y);
      if (!k) { out.set(p, { before: x, after: y }); return; } // a list of plain values (sources, refs) compares whole
      const xm = new Map(x.map((e) => [String((e as Obj)[k]), e]));
      const ym = new Map(y.map((e) => [String((e as Obj)[k]), e]));
      for (const id of new Set([...xm.keys(), ...ym.keys()])) walk(xm.get(id), ym.get(id), `${p}/${id}`);
      return;
    }
    if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x) && !Array.isArray(y)) {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk((x as Obj)[k], (y as Obj)[k], p ? `${p}/${k}` : k);
      return;
    }
    out.set(p, { before: x, after: y });
  };
  walk(a, b, '');
  return out;
}

// ---------- Version changes: every value that moves between versions is listed, with its old and new ----------
/** Problems with changes_from_previous: a line whose value differs from the version before but is not listed, or a
 *  listing whose old/new does not match the lines. The real packet has none; a plant must add none. */
export function versionChangeProblems(p: Packet): string[] {
  const out: string[] = [];
  for (let i = 1; i < p.return_versions.length; i++) {
    const prev = new Map(p.return_versions[i - 1].lines.map((l) => [l.key, l]));
    const cur = p.return_versions[i];
    const curMap = new Map(cur.lines.map((l) => [l.key, l]));
    const listed = new Map(cur.changes_from_previous.map((c) => [c.key, c]));
    for (const k of new Set([...prev.keys(), ...curMap.keys()])) {
      const a = prev.get(k); const b = curMap.get(k); const c = listed.get(k);
      if (a && b && same(a.value, b.value)) continue;
      if (!c) { out.push(`${cur.version} ${k}: not listed`); continue; }
      if ('old' in c && a && !same(c.old, a.value)) out.push(`${cur.version} ${k}: old`);
      if ('new' in c && b && !same(c.new, b.value)) out.push(`${cur.version} ${k}: new`);
    }
  }
  return out;
}

// ---------- The candidate pool, by schema shape ----------
interface Ctx {
  real: Packet; rix: PacketIndex; p: Packet;
  claimed: Set<string>; superseded: Set<string>; latest: string;
  /** line keys (any version) citing each source ref */
  citedBy: Map<string, Set<string>>;
  used: Set<string>; // target lines, values, pages already planted on
  /** set by moveLine when a cascade reaches a line whose fitted operations now disagree */
  ambiguous: boolean;
  nextEv: number;
}

const sumCited = (ix: PacketIndex, l: ReturnLine) => round2(l.sources.map((s) => ix.valueById.get(s)).filter((v): v is ExtractedValue => !!v && isNum(v.value)).reduce((s, v) => s + (v.value as number), 0));
/** A latest line a plant may sit on: numeric, cites sources, no inputs, not claimed by any real finding. */
function baseLines(c: Ctx): ReturnLine[] {
  return c.rix.latest.lines.filter((l) => isNum(l.value) && l.sources.length && !(l.inputs ?? []).length && !c.claimed.has(l.key));
}
/** The page a value is printed on, if its text_as_read is printed there exactly once. */
function soleOnPage(ix: PacketIndex, v: ExtractedValue): DocPage | null {
  const page = ix.docById.get(v.document_id)?.pages.find((pg) => pg.page === v.page);
  return page && occurrences(page.printed_content, v.text_as_read) === 1 ? page : null;
}
const moneyValue = (v: ExtractedValue | undefined): v is ExtractedValue => !!v && v.value_type === 'money' && isNum(v.value) && parseMoney(v.text_as_read) === v.value;

/** +mag or -mag by the seed, but never through zero: a figure keeps its sign (zero moves up). */
function signedDelta(v: number, mag: number, r: () => number): number {
  const d = r() < 0.5 ? -mag : mag;
  if (v === 0) return mag;
  return Math.sign(v + d) === Math.sign(v) ? d : Math.sign(v) * mag;
}

function shuffle<T>(xs: T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------- Applying a plant: record every change, carry line deltas up the arithmetic in every version ----------
class Recorder {
  refs = new Map<string, PlantRef>();
  set(path: string, obj: Obj, field: string, after: unknown) {
    const full = `${path}/${field}`;
    const before = structuredClone(obj[field]);
    obj[field] = after;
    const r = this.refs.get(full);
    if (r) r.after = structuredClone(after); else this.refs.set(full, { path: full, before, after: structuredClone(after) });
  }
  add(path: string, record: unknown) { this.refs.set(path, { path, before: undefined, after: structuredClone(record) }); }
}

const lineIn = (rv: ReturnVersion, k: string) => rv.lines.find((l) => l.key === k);

/** Moves line `key` in every version where it had its latest value: `edit` changes the line (value, sources); then the
 *  difference flows up the version's arithmetic as the engine fitted it. Returns the keys that moved. */
function moveLine(c: Ctx, rec: Recorder, key: string, edit: (l: ReturnLine, path: string) => void): Set<string> {
  const moved = new Set<string>();
  const latestReal = c.rix.line(c.latest, key)!.value;
  for (const rv of c.p.return_versions) {
    const rl = c.rix.line(rv.version, key);
    const l = lineIn(rv, key);
    if (!rl || !l || !same(rl.value, latestReal)) continue;
    const base = `return_versions/${rv.version}/lines`;
    edit(l, `${base}/${key}`);
    moved.add(key);
    // Up the graph, in dependency order, with the operation the engine's own numbers fit (flow.ts).
    const g = c.rix.flowGraph(rv.version);
    const movedHere = new Set([key]);
    for (const k of g.order) {
      const ins = g.inputs.get(k)!;
      if (!ins.some((i) => movedHere.has(i))) continue;
      const vals = ins.map((i) => lineIn(rv, i)?.value);
      if (!vals.every(isNum)) continue;
      const ops = g.ops.get(k) ?? [];
      const results = [...new Set(ops.map((o) => o.apply(vals as number[])))];
      const target = lineIn(rv, k)!;
      // Operations that fitted together now disagree (a - b against max(0, a - b) once a - b turns negative): only
      // the engine could say which, and leaving the line would break its arithmetic, so the plant is refused.
      if (ops.length && results.length !== 1) { c.ambiguous = true; continue; }
      if (results.length !== 1 || results[0] === target.value) continue; // needs the engine, or lands where it was
      rec.set(`${base}/${k}`, target, 'value', results[0]);
      movedHere.add(k); moved.add(k);
    }
  }
  return moved;
}

/** changes_from_previous entries that quoted a value now moved, moved with it (old from the version before). */
function relist(c: Ctx, rec: Recorder) {
  const vs = c.p.return_versions;
  for (let i = 1; i < vs.length; i++) {
    for (const ch of vs[i].changes_from_previous) {
      const path = `return_versions/${vs[i].version}/changes_from_previous/${ch.key}`;
      const cur = lineIn(vs[i], ch.key); const prev = lineIn(vs[i - 1], ch.key);
      const rCur = c.rix.line(vs[i].version, ch.key); const rPrev = c.rix.line(vs[i - 1].version, ch.key);
      if ('new' in ch && cur && rCur && same(ch.new, rCur.value) && !same(ch.new, cur.value)) rec.set(path, ch as Obj, 'new', cur.value);
      if ('old' in ch && prev && rPrev && same(ch.old, rPrev.value) && !same(ch.old, prev.value)) rec.set(path, ch as Obj, 'old', prev.value);
    }
  }
}

const newEvId = (c: Ctx) => `ev-${String(c.nextEv++).padStart(4, '0')}`;

/** A new page at the end of a document, copying a page's printed text, with the given values re-extracted on it. */
function appendPage(c: Ctx, rec: Recorder, doc: PacketDocument, from: DocPage, values: ExtractedValue[]): Map<string, ExtractedValue> {
  const page = Math.max(0, ...doc.pages.map((pg) => pg.page)) + 1;
  const np: DocPage = { ...structuredClone(from), page };
  doc.pages.push(np);
  rec.add(`documents/${doc.id}/pages/${page}`, np);
  rec.set(`documents/${doc.id}`, doc as Obj, 'page_count', doc.page_count + 1);
  const copies = new Map<string, ExtractedValue>();
  for (const v of values) {
    const nv: ExtractedValue = { ...structuredClone(v), id: newEvId(c), document_id: doc.id, page };
    c.p.extracted_values.push(nv);
    rec.add(`extracted_values/${nv.id}`, nv);
    copies.set(v.id, nv);
  }
  rec.set(`documents/${doc.id}/extraction`, doc.extraction as Obj, 'values', doc.extraction.values + values.length);
  return copies;
}

/** Lines citing a value (any version) are exactly the given set: the value is that line's alone. */
const citedOnlyBy = (c: Ctx, ref: string, key: string) => { const s = c.citedBy.get(ref); return !!s && s.size === 1 && s.has(key); };

/** A plant candidate: tries to apply itself; returns the plant, or null when it would break a rule (then undone). */
type Candidate = { lines: string[]; marks: string[]; apply: (c: Ctx, rec: Recorder) => void };

function sourceChanged(c: Ctx, r: () => number): Candidate[] {
  const out: Candidate[] = [];
  for (const l of baseLines(c)) {
    if (sumCited(c.rix, l) !== l.value) continue; // the line ties to its sources today
    for (const s of l.sources) {
      const v = c.rix.valueById.get(s);
      if (!moneyValue(v) || !citedOnlyBy(c, s, l.key) || !soleOnPage(c.rix, v)) continue;
      out.push({
        lines: [l.key], marks: [l.key, v.id, `${v.document_id}#${v.page}`],
        apply: (c2, rec) => {
          const val = c2.p.extracted_values.find((x) => x.id === v.id)!;
          const page = c2.p.documents.find((d) => d.id === v.document_id)!.pages.find((pg) => pg.page === v.page)!;
          const old = val.value as number;
          const mag = Math.max(100, Math.round((Math.abs(old) * (0.1 + 0.2 * r())) / 10) * 10);
          const delta = signedDelta(old, mag, r);
          const nv = round2(old + delta);
          const text = moneyText(val.text_as_read, nv);
          rec.set(`documents/${v.document_id}/pages/${v.page}`, page as Obj, 'printed_content', page.printed_content.replace(val.text_as_read, text));
          rec.set(`extracted_values/${v.id}`, val as Obj, 'text_as_read', text);
          rec.set(`extracted_values/${v.id}`, val as Obj, 'value', nv);
        },
      });
    }
  }
  return out;
}

/** Versions where a line has its latest value must all use a document for the line to cite it there. */
const usedWherever = (c: Ctx, key: string, doc: string) => {
  const latest = c.rix.line(c.latest, key)!.value;
  return c.rix.versions.every((rv) => { const l = c.rix.line(rv.version, key); return !l || !same(l.value, latest) || rv.documents_used.includes(doc); });
};

function copiedTwice(c: Ctx): Candidate[] {
  const out: Candidate[] = [];
  for (const l of baseLines(c)) {
    if (sumCited(c.rix, l) !== l.value) continue;
    for (const s of l.sources) {
      const v = c.rix.valueById.get(s);
      if (!moneyValue(v) || v.value === 0 || !citedOnlyBy(c, s, l.key)) continue;
      const page = soleOnPage(c.rix, v);
      const a = c.rix.docById.get(v.document_id)!;
      if (!page || c.superseded.has(a.id)) continue;
      for (const b of c.rix.packet.documents) {
        if (b.id === a.id || b.document_type !== a.document_type || c.superseded.has(b.id) || !usedWherever(c, l.key, b.id)) continue;
        out.push({
          lines: [l.key], marks: [l.key, v.id, `${a.id}#${v.page}`, `${b.id}#new`],
          apply: (c2, rec) => {
            const doc = c2.p.documents.find((d) => d.id === b.id)!;
            const copy = appendPage(c2, rec, doc, page, [v]).get(v.id)!;
            moveLineMarked(c2, rec, l.key, (line, path) => {
              rec.set(path, line as Obj, 'sources', [...line.sources, copy.id]);
              rec.set(path, line as Obj, 'value', round2((line.value as number) + (v.value as number)));
            });
          },
        });
      }
    }
  }
  return out;
}

function pageDuplicated(c: Ctx): Candidate[] {
  const out: Candidate[] = [];
  const lines = new Map(baseLines(c).filter((l) => sumCited(c.rix, l) === l.value).map((l) => [l.key, l]));
  for (const d of c.rix.packet.documents) {
    if (c.superseded.has(d.id)) continue;
    for (const pg of d.pages) {
      const vals = (c.rix.valuesByDoc.get(d.id) ?? []).filter((v) => v.page === pg.page);
      const cited = vals.filter((v) => c.citedBy.has(v.id));
      if (!cited.length || cited.length > 2) continue;
      const owners = cited.map((v) => [...c.citedBy.get(v.id)!]);
      if (!cited.every((v, i) => moneyValue(v) && v.value !== 0 && owners[i].length === 1 && lines.has(owners[i][0]) && soleOnPage(c.rix, v))) continue;
      const keys = [...new Set(owners.map((o) => o[0]))];
      if (keys.length !== cited.length) continue; // one line per cited value keeps each double count plain
      // The copy's other values are re-extracted too, each printed once on the page (so the copy reads the same).
      if (!vals.every((v) => occurrences(pg.printed_content, v.text_as_read) === 1 && (v.value_type !== 'money' || moneyValue(v)))) continue;
      out.push({
        lines: keys, marks: [...keys, ...cited.map((v) => v.id), `${d.id}#${pg.page}`, `${d.id}#new`],
        apply: (c2, rec) => {
          const doc = c2.p.documents.find((x) => x.id === d.id)!;
          const copies = appendPage(c2, rec, doc, pg, vals);
          cited.forEach((v, i) => moveLineMarked(c2, rec, owners[i][0], (line, path) => {
            rec.set(path, line as Obj, 'sources', [...line.sources, copies.get(v.id)!.id]);
            rec.set(path, line as Obj, 'value', round2((line.value as number) + (v.value as number)));
          }));
        },
      });
    }
  }
  return out;
}

const pointer = (root: unknown, ptr: string): unknown =>
  ptr.split('/').slice(1).reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Obj)[k] : undefined), root);
/** The value at a packetDiff path (records found by their id, key, version or page). */
export function atPath(root: unknown, path: string): unknown {
  let o: unknown = root;
  for (const seg of path.split('/')) {
    if (Array.isArray(o)) o = o.find((x) => x && typeof x === 'object' && ID_KEYS.some((k) => String((x as Obj)[k]) === seg));
    else o = o && typeof o === 'object' ? (o as Obj)[seg] : undefined;
  }
  return o;
}

function priorShift(c: Ctx, r: () => number): Candidate[] {
  const out: Candidate[] = [];
  const vr = c.real.firm.starter_standards.variance_review as { flag_if_change_over_percent?: number; and_over_amount?: number };
  const pct = vr.flag_if_change_over_percent ?? 10; const amt = vr.and_over_amount ?? 1000;
  for (const l of baseLines(c)) {
    const py = l.sources.filter((s) => s.startsWith('py:')).map((s) => pointer(c.real.prior_years, s.slice(3)));
    if (!py.length || !py.some(isNum)) continue;
    const ref = Math.max(Math.abs(l.value as number), ...py.filter(isNum).map(Math.abs));
    out.push({
      lines: [l.key], marks: [l.key],
      apply: (c2, rec) => {
        const over = Math.max(amt, (pct / 100) * ref);
        const mag = Math.ceil((over * (1.5 + r())) / 100) * 100;
        const delta = signedDelta(l.value as number, mag, r);
        moveLineMarked(c2, rec, l.key, (line, path) => rec.set(path, line as Obj, 'value', (line.value as number) + delta));
      },
    });
  }
  return out;
}

function fxWrongYear(c: Ctx, r: () => number): Candidate[] {
  const out: Candidate[] = [];
  const tables = c.real.fx_rates as Record<string, Record<string, unknown>>;
  for (const l of baseLines(c)) {
    if (!Number.isInteger(l.value)) continue;
    const ref = l.sources.find((s) => /^ref:fx\.[A-Z]{3}\.[^.]+$/.test(s));
    if (!ref) continue;
    const [, cur, key] = ref.split('.');
    const name = Object.keys(tables).find((t) => t.split('_per_').length === 2 && t.split('_per_').includes(cur));
    if (!name) continue;
    const rate = tables[name][key];
    const others = Object.keys(tables[name]).filter((k) => k.slice(0, 4) !== key.slice(0, 4) && isNum(tables[name][k]));
    if (!isNum(rate) || !others.length) continue;
    out.push({
      lines: [l.key], marks: [l.key],
      apply: (c2, rec) => {
        const other = others[Math.floor(r() * others.length)];
        const nr = tables[name][other] as number;
        // <A>_per_<B>: an amount in A is divided by the rate; an amount in B is multiplied by it.
        const ratio = name.startsWith(`${cur}_per_`) ? rate / nr : nr / rate;
        moveLineMarked(c2, rec, l.key, (line, path) => {
          rec.set(path, line as Obj, 'sources', line.sources.map((s) => (s === ref ? `ref:fx.${cur}.${other}` : s)));
          rec.set(path, line as Obj, 'value', Math.round((line.value as number) * ratio));
        });
      },
    });
  }
  return out;
}

// moveLine with the moved keys kept for the plant's claim set (set by the driver around each apply).
let movedSink: Set<string> | null = null;
function moveLineMarked(c: Ctx, rec: Recorder, key: string, edit: (l: ReturnLine, path: string) => void) {
  for (const k of moveLine(c, rec, key, edit)) movedSink?.add(k);
}

/** The seeded copy and its planted list. Same seed, same bytes. */
export function perturbedPacket(seed: number = PERTURBED_SEED): Perturbed {
  const real = loadPacket();
  const rix = indexPacket(real);
  const p = structuredClone(real);
  const claimed = new Set(runChecks(rix).flatMap((f) => f.claims).filter((x) => x.startsWith('line:')).map((x) => x.slice(5)));
  const citedBy = new Map<string, Set<string>>();
  for (const rv of real.return_versions) for (const l of rv.lines) for (const s of l.sources) citedBy.set(s, (citedBy.get(s) ?? new Set()).add(l.key));
  const maxEv = Math.max(...real.extracted_values.map((v) => Number(v.id.replace(/^ev-/, '')) || 0));
  const c: Ctx = {
    real, rix, p, claimed, superseded: new Set(supersession(rix).keys()), latest: rix.latest.version,
    citedBy, used: new Set(), nextEv: maxEv + 1, ambiguous: false,
  };
  const realProblems = versionChangeProblems(real).join('\n');
  const r = rng(seed);
  const makers: Record<PlantKind, () => Candidate[]> = {
    source_changed: () => sourceChanged(c, r), copied_twice: () => copiedTwice(c), prior_shift: () => priorShift(c, r),
    fx_wrong_year: () => fxWrongYear(c, r), page_duplicated: () => pageDuplicated(c),
  };
  const planted: Plant[] = []; const skipped: Skipped[] = [];
  for (const kind of PLANT_KINDS) {
    const want = PLANT_COUNTS[kind];
    let got = 0;
    for (const cand of shuffle(makers[kind](), r)) {
      if (got >= want) break;
      if (cand.marks.some((m) => c.used.has(m))) continue;
      const snapshot = JSON.stringify(c.p);
      const ev = c.nextEv;
      const rec = new Recorder();
      movedSink = new Set();
      c.ambiguous = false;
      cand.apply(c, rec);
      relist(c, rec);
      const moved = movedSink; movedSink = null;
      // Undo a plant that would list a change wrongly, or that lands an earlier plant's line back on its real value.
      const cancels = [...rec.refs.values()].some((x) => same(x.after, atPath(real, x.path)));
      if (versionChangeProblems(c.p).join('\n') !== realProblems || cancels || c.ambiguous) {
        const back = JSON.parse(snapshot) as Packet;
        for (const k of Object.keys(c.p)) delete (c.p as Obj)[k];
        Object.assign(c.p, back);
        c.nextEv = ev;
        continue;
      }
      for (const m of cand.marks) c.used.add(m);
      const claims = [...cand.lines, ...[...moved].filter((k) => !cand.lines.includes(k)).sort()];
      planted.push({ kind, lines: cand.lines, claims, refs: [...rec.refs.values()] });
      got++;
    }
    if (got < want) skipped.push({ kind, reason: `${got} of ${want}: no further eligible target (lines a real finding claims are avoided)` });
  }
  return { packet: p, planted, skipped };
}
