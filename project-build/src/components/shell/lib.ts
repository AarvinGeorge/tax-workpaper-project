// Pure helpers for the shell: ids, claim links, formatting, screen names, header search.
import type { PacketIndex } from '@/domain/packet/load';
import type { RoleInfo, ScreenKey, WorkspaceState } from '@/domain/contracts';

const WS_RE = /^[a-z0-9-]{4,40}$/;
export const isWorkspaceId = (s: string) => WS_RE.test(s);
export function newWorkspaceId(): string {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const buf = new Uint32Array(10);
  globalThis.crypto.getRandomValues(buf);
  for (const n of buf) s += a[n % a.length];
  return s;
}

export type ParsedClaim = { kind: 'line' | 'doc' | 'finding'; key: string; page?: number };
export function parseClaim(id: string | undefined | null): ParsedClaim | null {
  if (!id) return null;
  const m = /^(line|doc|finding):(.+)$/.exec(id);
  if (!m) return null;
  const kind = m[1] as ParsedClaim['kind'];
  if (kind === 'doc') {
    const [key, frag] = m[2].split('#');
    const pm = frag ? /^page(\d+)$/.exec(frag) : null;
    return pm ? { kind, key, page: Number(pm[1]) } : { kind, key };
  }
  return { kind, key: m[2] };
}

/** A relative link that opens a claim in the drawer, keeping other query values. */
export function claimHref(id: string, keep: Record<string, string | undefined> = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(keep)) if (v && k !== 'claim') sp.set(k, v);
  sp.set('claim', id);
  return '?' + sp.toString();
}

export function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'Blank';
  if (typeof v === 'number') {
    const cents = !Number.isInteger(v);
    return v.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDay(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}
export function fmtStory(iso: string): string {
  if (!iso || iso.length < 16) return iso || '';
  return `${fmtDay(iso)}, ${iso.slice(11, 16)} UTC`;
}

const NAME: Record<ScreenKey, string> = {
  home: 'Home', return: 'Return', areas: 'Areas', documents: 'Documents', checks: 'Checks', review: 'Review',
  changes: 'Changes', filing: 'Filing and after', firm: 'Firm', findings: 'Findings',
};
const HINT: Record<ScreenKey, string> = {
  home: 'Start here, your queue', return: 'Forms and lines, every number traced', areas: 'Records a CPA expects, area by area',
  documents: 'Every document and where it landed', checks: 'Our checks beside the engine’s diagnostics',
  review: 'Changes against the engine, notes, sign-offs', changes: 'Every action: why, authority, effect, who',
  filing: 'Approval, e-file, the filed record, notices', firm: 'Standards, view log, time against budget',
  findings: 'The packet’s confident mistakes, each with its check',
};
const CNAME: Partial<Record<ScreenKey, string>> = { home: 'Home', documents: 'Your documents', filing: 'Approve and sign', return: 'Your return' };
const CHINT: Partial<Record<ScreenKey, string>> = { home: 'What we need from you', documents: 'What you sent and what is still needed', filing: 'Sign Form 8879 (e-file signature authorization)', return: 'Your return, line by line' };
const INAME: Partial<Record<ScreenKey, string>> = { filing: 'Filed return and the letter', documents: 'Documents cited' };
const IHINT: Partial<Record<ScreenKey, string>> = { filing: 'The items under examination, as filed', documents: 'Only the documents those items cite' };

export function screenLabel(k: ScreenKey, kind: RoleInfo['kind']): string {
  if (kind === 'client') return CNAME[k] ?? NAME[k];
  if (kind === 'examiner') return INAME[k] ?? NAME[k];
  return NAME[k];
}
export function screenHint(k: ScreenKey, kind: RoleInfo['kind']): string {
  if (kind === 'client') return CHINT[k] ?? HINT[k];
  if (kind === 'examiner') return IHINT[k] ?? HINT[k];
  return HINT[k];
}
export function screenPath(ws: string, role: string, k: ScreenKey): string {
  return `/w/${ws}/${role}${k === 'home' ? '' : '/' + k}`;
}

// ---------- Header search ----------
/** Value types never searched or shown in results: identifiers (last 4 only rule). EINs are not identifiers here. */
export const IDENTIFIER_TYPES = new Set(['ssn', 'account_number', 'routing_number', 'ip_pin', 'pin', 'itin']);
const IDENT_QUERY = /^\s*(\d{3}-?\d{2}-?\d{4}|\d{8,})\s*$/;

export interface SearchResult {
  q: string;
  identifierRefused: boolean;
  lines: { key: string; label: string; form: string; value: unknown }[];
  documents: { id: string; title: string; issuer: string | null }[];
  eins: { valueId: string; docId: string; label: string; ein: string }[];
}

export function searchPacket(ix: PacketIndex, raw: string, limit = 12): SearchResult {
  const q = (raw || '').trim();
  const out: SearchResult = { q, identifierRefused: false, lines: [], documents: [], eins: [] };
  if (q.length < 2) return out;
  // A full SSN or account-shaped query is refused before any matching: identifier digits are never searchable.
  const einShaped = /^\d{2}-\d{7}$/.test(q);
  if (!einShaped && IDENT_QUERY.test(q)) { out.identifierRefused = true; return out; }
  const lq = q.toLowerCase();
  const digits = q.replace(/[,$\s]/g, '');
  const num = /^-?\d+(\.\d+)?$/.test(digits) ? Number(digits) : null;
  for (const l of ix.latest.lines) {
    if (out.lines.length >= limit) break;
    const hit = l.key.toLowerCase().includes(lq) || l.label.toLowerCase().includes(lq)
      || (num !== null && typeof l.value === 'number' && (l.value === num || Math.abs(l.value) === Math.abs(num)));
    if (hit) out.lines.push({ key: l.key, label: l.label, form: l.form, value: l.value });
  }
  for (const d of ix.packet.documents) {
    if (out.documents.length >= limit) break;
    const hit = d.id.toLowerCase() === lq || d.title.toLowerCase().includes(lq) || (d.issuer ?? '').toLowerCase().includes(lq);
    if (hit) out.documents.push({ id: d.id, title: d.title, issuer: d.issuer });
  }
  const seen = new Set<string>();
  for (const v of ix.packet.extracted_values) {
    if (v.value_type !== 'ein' || out.eins.length >= limit) continue;
    const ein = String(v.value ?? '');
    const hit = ein.includes(q) || ein.replace(/-/g, '').includes(digits) && digits.length >= 4 || v.label.toLowerCase().includes(lq);
    if (hit && !seen.has(ein + v.document_id)) { seen.add(ein + v.document_id); out.eins.push({ valueId: v.id, docId: v.document_id, label: v.label, ein }); }
  }
  return out;
}

// ---------- Items under examination (examiner view) ----------
/** Lines of the latest version named by the agency notices' items_under_examination, read from the notice text. */
export function examinedLines(ix: PacketIndex): string[] {
  const notices = ((ix.packet.tax_agency_records as { notices?: { items_under_examination?: string[] }[] }).notices) ?? [];
  const items = notices.flatMap((n) => n.items_under_examination ?? []);
  const lines = ix.latest.lines;
  const out = new Set<string>();
  for (const item of items) {
    const head = item.split(':')[0];
    for (const m of head.matchAll(/Schedule ([A-Z0-9]+)(?: line (\w+))?( [a-z][a-z ]+)?/g)) {
      const form = 'Sch' + m[1];
      const phrase = (m[3] ?? '').trim().replace(/ claimed.*$/, '');
      for (const l of lines) {
        if (l.form !== form) continue;
        if (m[2] ? l.line === m[2] : phrase ? l.label.toLowerCase().includes(phrase.toLowerCase()) : false) out.add(l.key);
      }
    }
    for (const m of head.matchAll(/Form (\d{3,4}[A-Z]?)/g)) {
      for (const l of lines) if (l.form === 'F' + m[1]) out.add(l.key);
    }
  }
  return [...out];
}

// ---------- Reveals ----------
/** True when this role has a reveal event for every identifier ref given (reveal payload `what` is the value ref). */
export function isRevealed(state: Pick<WorkspaceState, 'reveals'>, role: string, refs: string[]): boolean {
  if (refs.length === 0) return false;
  const mine = new Set(state.reveals.filter((r) => r.role === role).map((r) => r.what));
  return refs.every((r) => mine.has(r));
}

// ---------- Roles that join later ----------
const instant = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso).getTime();
/** Null once the role is in the story; otherwise one sentence with both times, compared as instants. */
export function notYetText(name: string, activeFrom: string | null | undefined, storyAt: string): string | null {
  if (!activeFrom || instant(activeFrom) <= instant(storyAt)) return null;
  return `${name} joins this engagement at ${fmtStory(activeFrom)}. The story clock is at ${fmtStory(storyAt)}, earlier.`;
}
