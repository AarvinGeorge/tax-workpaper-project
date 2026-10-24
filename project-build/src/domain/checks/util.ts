// Shared helpers for the check library. Everything is read from the packet's schema fields; no packet ids or names.
import type { PacketIndex } from '../packet/load';
import type { ExtractedValue, PacketDocument, ReturnLine } from '../packet/types';
import type { Finding } from '../contracts';

/** What a check returns before the library adds id, severity, ledger ids and firstVisibleAt. */
export interface Draft {
  title: string;
  claims: string[];
  evidence: string[];
  explanation: string;
  plain?: string;
  effect?: Finding['effect'];
  /** Refs whose arrival makes the finding knowable (sets firstVisibleAt). Defaults to the evidence. */
  trigger?: string[];
  judgment?: boolean;
  /** The finding stops e-file or approval (an identity mismatch, a figure never computed), so it blocks regardless of amount. */
  stopsEfile?: boolean;
}

export interface Check {
  id: string;
  family: string;
  /** A general safety net: its finding is dropped when a more specific check already flags the same claim. */
  yields?: boolean;
  run(ix: PacketIndex): Draft[];
}

export type RateCategory = string; // a key of return_versions[].tax_effect_rates, as the README names them

export const lineClaim = (key: string) => `line:${key}`;
export const docClaim = (id: string) => `doc:${id}`;

/** Parses "1,234.56", "1234", 1234 into a number; null when not numeric. */
export function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/,/g, '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** Money-looking amounts in free text: "3,050", "2,150.00", "12,400.00". Plain 4-digit years are not amounts. */
export function amountsIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(?<![\d.])(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})(?![\d])/g)) out.push(Number(m[1].replace(/,/g, '')));
  return out;
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const round = (n: number) => Math.round(n);

export function taxYear(ix: PacketIndex): number {
  const y = num(ix.packet.household.tax_year);
  if (y !== null) return y;
  return Number(ix.latest.computed_at.slice(0, 4)) - 1;
}

/** The tax effect of changing an amount by `delta`, from the latest version's rates (README: rate x change). */
export function rateEffect(ix: PacketIndex, category: RateCategory, delta: number, caCategory?: RateCategory): Finding['effect'] {
  const rates = ix.latest.tax_effect_rates;
  const r = rates[category];
  const c = rates[caCategory ?? category];
  if (!r || !c) return undefined;
  return { federal: round(delta * r.federal_per_dollar), california: round(delta * c.california_per_dollar), basis: 'tax_effect_rates' };
}

/** The README's rate category for a line, from its form and label. Null for payments and credits (1:1). */
export function categoryOf(line: ReturnLine): RateCategory | null {
  const f = line.form; const lab = line.label.toLowerCase();
  if (f === 'SchB') return 'interest';
  if (f === 'SchC') return 'schc_profit';
  if (f === 'SchE' || f.startsWith('F4562-E')) return 'ordinary_income';
  if (f === 'SchA' || f === 'F8283') return /tax/.test(lab) && /state|real estate|property/.test(lab) ? 'salt' : 'itemized';
  if (f === 'Sch1' && /deduction|contribution/.test(lab)) return 'adjustment';
  return null;
}

/** Payments and credits move tax or balance due 1:1 (README); there is no rate category for them. */
export function oneToOne(jurisdiction: string, delta: number): Finding['effect'] {
  return jurisdiction === 'california'
    ? { california: round(delta), basis: 'computed' }
    : { federal: round(delta), basis: 'computed' };
}

/** The household's period of residence in the state the California return covers, from household.residency. */
export function stateResidency(ix: PacketIndex): { from: string; to: string } | null {
  const res = (ix.packet.household.residency as unknown as { state: string; from: string; to: string; status: string }[]) || [];
  // The state return in the packet is the one whose lines have jurisdiction 'california'; its residency row is the
  // one whose state code is the first letters of that jurisdiction's name in the README (CA).
  const r = res.find((x) => x.status === 'resident' && /^ca$/i.test(x.state));
  return r ? { from: r.from, to: r.to } : null;
}

export const isoDay = (s: string) => s.slice(0, 10);

/** True when a sale date falls in the state residency period, so the gain is wholly state-source (README). */
export function inStateResidency(ix: PacketIndex, date: string | null): boolean {
  const r = stateResidency(ix);
  if (!r || !date) return false;
  const d = isoDay(date);
  return d >= r.from && d <= r.to;
}

/** California's rate on a sale's gain (R-CA-CAPGAIN-SOURCE: sales dated during California residency): fully
 *  California-source during residency, nothing after it; the README's prorated gain rate when the date is unknown. */
export function caGainRate(ix: PacketIndex, sold: string | null, cat: RateCategory): number {
  const rates = ix.latest.tax_effect_rates;
  if (sold && /^\d{4}-\d{2}-\d{2}/.test(sold) && stateResidency(ix)) return inStateResidency(ix, sold) ? (rates.ca_source_income?.california_per_dollar ?? 0) : 0;
  return rates[cat]?.california_per_dollar ?? 0;
}

export function valuesOf(ix: PacketIndex, line: ReturnLine): ExtractedValue[] {
  return (line.sources || []).map((s) => ix.valueById.get(s)).filter((v): v is ExtractedValue => !!v);
}

export function docsOf(ix: PacketIndex, line: ReturnLine): PacketDocument[] {
  const ids = new Set(valuesOf(ix, line).map((v) => v.document_id));
  return [...ids].map((id) => ix.docById.get(id)).filter((d): d is PacketDocument => !!d);
}

export function pageText(d: PacketDocument | undefined, page?: number): string {
  if (!d) return '';
  return d.pages.filter((p) => page === undefined || p.page === page).map((p) => p.printed_content).join('\n');
}

/** Lot id from a Form 8949 line key "<form>.<box>.<lot>". */
export function lotOf(line: ReturnLine): string | null {
  const parts = line.key.split('.');
  return parts.length >= 3 ? parts.slice(2).join('.') : null;
}

/** The value of a lot's field among a line's sources: fields are "<lot>_<name>". */
export function lotField(ix: PacketIndex, line: ReturnLine, name: string): ExtractedValue | undefined {
  const lot = lotOf(line);
  const want = `${lot}_${name}`;
  const cited = valuesOf(ix, line);
  const hit = cited.find((v) => v.field === want);
  if (hit) return hit;
  // Not cited: the same lot's field on a document the line does cite (e.g. the term or covered flag).
  for (const docId of new Set(cited.map((v) => v.document_id))) {
    const v = (ix.valuesByDoc.get(docId) || []).find((x) => x.field === want);
    if (v) return v;
  }
  return undefined;
}

export function latestLines(ix: PacketIndex): ReturnLine[] {
  return ix.latest.lines;
}

export function lineByKey(ix: PacketIndex, key: string): ReturnLine | undefined {
  return ix.line(ix.latest.version, key);
}

/** Lines of the latest version that cite this value id. */
export function linesCiting(ix: PacketIndex, ref: string): ReturnLine[] {
  return ix.latest.lines.filter((l) => (l.sources || []).includes(ref));
}

/** Firm partner threshold, read from the firm's own rule text ("tax effect over 1,000 ... partner"). */
export function partnerThreshold(ix: PacketIndex): number {
  const rules = (ix.packet.firm.starter_standards.rules as string[]) || [];
  for (const r of rules) {
    if (/partner/i.test(r) && /tax effect/i.test(r)) {
      const a = amountsIn(r)[0] ?? num((r.match(/over\s+(\d+)/i) || [])[1]);
      if (a !== null && a !== undefined) return a;
    }
  }
  return Infinity;
}

/** Days between two ISO dates. */
export function days(a: string, b: string): number {
  return Math.round((Date.parse(isoDay(b)) - Date.parse(isoDay(a))) / 86400000);
}

/** Words of length >= 3, lower case, for matching free text. */
export function words(s: string): string[] {
  return (s.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) || []);
}

export function bigrams(s: string): string[] {
  const w = s.toLowerCase().match(/[a-z]+/g) || [];
  const out: string[] = [];
  for (let i = 0; i + 1 < w.length; i++) if (w[i].length >= 3 && w[i + 1].length >= 3) out.push(`${w[i]} ${w[i + 1]}`);
  return out;
}

/** Digits only, for comparing identifiers across formats. */
export const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');

/** Last four only (BUILD-CONTEXT hard rule), for any identifier quoted in wording. */
export const last4 = (s: unknown) => `ending ${digits(s).slice(-4)}`;

/** True when some +/- combination of the values equals the target (within half a dollar). Over 12 values is not judged. */
export function reachable(target: number, vals: number[]): boolean {
  if (vals.length > 12) return true;
  const n = vals.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += mask & (1 << i) ? -vals[i] : vals[i];
    if (Math.abs(s - target) <= 0.5) return true;
  }
  return false;
}

/** A line whose engine rule is a plain arithmetic combination of its listed input lines (the engine's own wording). */
export function isSumRule(ix: PacketIndex, line: ReturnLine): boolean {
  return /^arithmetic combination of the listed input lines/i.test(ix.packet.engine_reference.rules[line.rule ?? ''] ?? '');
}
