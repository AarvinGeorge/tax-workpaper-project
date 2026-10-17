// Shared helpers for the work screens (lane D2). Pure functions over the packet index and the workspace state.
// No packet ids, counts or names in logic: everything is read from the data.
import type { Finding, RoleInfo, RoleKey, Severity, WorkEvent, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { maskText, roleInfo } from '@/domain/policy';
import { retractedSeqs } from '@/domain/events';

export interface WorkProps {
  ws: string;
  role: RoleInfo;
  ix: PacketIndex;
  findings: Finding[];
  state: WorkspaceState;
  sp: Record<string, string | string[] | undefined>;
}

export const MOCKUP_URL = 'https://claude.ai/artifact/RW8BgnvPMRwFzFjZyVVHoy';

/** Returns a masker bound to the role: every packet text the work screens render goes through it. These screens never
 *  show a revealed value (reveals happen in the drawer, one identifier at a time), so revealed is always false here. */
export function masker(state: WorkspaceState, role: RoleInfo): (t: unknown) => string {
  void state;
  return (t: unknown) => {
    if (t === null || t === undefined) return '';
    const s = typeof t === 'string' ? t : typeof t === 'number' ? fmt(t) : JSON.stringify(t);
    return maskText(s, role, false);
  };
}

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
/** Amounts: thousands separators, up to cents, never divided. Strings pass through. */
export function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'blank';
  if (typeof v === 'number') return Object.is(v, -0) ? '0' : nf.format(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}
export function signed(v: number | undefined | null): string {
  if (v === undefined || v === null) return '';
  return (v > 0 ? '+' : '') + nf.format(Math.round(v));
}

const df = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dtf = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
export function day(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  return isNaN(d.getTime()) ? iso : df.format(d);
}
export function when(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : dtf.format(d) + ' UTC';
}
export { humanize } from '@/domain/labels';

export const SEVERITY_ORDER: Severity[] = ['blocker', 'check', 'judgment', 'info'];
export const SEVERITY_WORD: Record<Severity, string> = { blocker: 'Blocker', check: 'Check', judgment: 'Judgment', info: 'Info' };
export const SEVERITY_TONE: Record<Severity, Tone> = { blocker: 'blk', check: 'wrn', judgment: 'acc', info: 'neu' };
export type Tone = 'blk' | 'wrn' | 'pas' | 'acc' | 'neu';

/** A finding is visible in the inbox once story time reaches the fact it depends on. */
export function visibleFinding(f: Finding, storyAt: string): boolean {
  return !f.firstVisibleAt || f.firstVisibleAt <= storyAt;
}

/** Events still in force: not undone (by seq or by group), and not undo events themselves. */
export function liveEvents(events: WorkEvent[]): WorkEvent[] {
  const r = retractedSeqs(events);
  return events.filter((e) => e.type !== 'undo' && !r.has(e.seq));
}
export function isRetracted(events: WorkEvent[], seq: number): boolean {
  return retractedSeqs(events).has(seq);
}

/** Cleared: a finding_cleared event, or any claim it sits on adjusted (finalized projection). */
export function findingStatus(f: Finding, state: WorkspaceState): { word: string; tone: Tone; cleared: boolean; signed: boolean } {
  const live = liveEvents(state.events);
  const cid = 'finding:' + f.id;
  const cleared = live.some((e) => e.type === 'finding_cleared' && e.claimId === cid);
  const adjusted = f.claims.some((c) => state.claims[c]?.adjusted);
  const signed = (state.claims[cid]?.signoffs ?? []).some((s) => !s.stale);
  if (cleared) return { word: 'Cleared', tone: 'pas', cleared: true, signed };
  if (adjusted) return { word: 'Adjusted', tone: 'pas', cleared: true, signed };
  if (signed) return { word: 'Signed off', tone: 'pas', cleared: false, signed };
  return { word: SEVERITY_WORD[f.severity], tone: SEVERITY_TONE[f.severity], cleared: false, signed };
}

/** The firm's partner threshold, read from the rule text in firm.starter_standards.rules. */
export function partnerThreshold(ix: PacketIndex): { amount: number | null; rule: string | null } {
  const rules = ruleList(ix);
  const rule = rules.find((r) => /partner sign-off/i.test(r) && /over\s+[\d,]+/i.test(r)) ?? null;
  const m = rule ? rule.match(/over\s+([\d,]+)/i) : null;
  return { amount: m ? Number(m[1].replace(/,/g, '')) : null, rule };
}
export function ruleList(ix: PacketIndex): string[] {
  const r = ix.packet.firm.starter_standards.rules;
  return Array.isArray(r) ? r.map(String) : [];
}
export function findRule(ix: PacketIndex, re: RegExp): string | null {
  return ruleList(ix).find((r) => re.test(r)) ?? null;
}

/** Staff review level for a role, from firm.staff[].role. */
export function levelOf(ix: PacketIndex, role: RoleInfo): 'preparer' | 'reviewer' | 'partner' | null {
  if (role.kind !== 'staff' || !role.staffId) return null;
  const s = ix.packet.firm.staff.find((x) => x.id === role.staffId);
  const levels = (ix.packet.firm.starter_standards.review_levels as string[] | undefined) ?? [];
  if (!s) return null;
  if (levels.includes(s.role)) return s.role as 'preparer' | 'reviewer' | 'partner';
  return null;
}

/** Can this role write at all? Read-only seats get a reason. The server policy is the authority; this only shapes the UI. */
export function writeBlock(role: RoleInfo, state: WorkspaceState): string | null {
  if (role.kind === 'examiner') return 'The examiner view is read only.';
  if (role.activeFrom && new Date(role.activeFrom).getTime() > new Date(state.storyAt).getTime()) return `${role.name} joins at ${when(role.activeFrom)}; story time is ${when(state.storyAt)}, earlier.`;
  return null;
}

/** Turn a packet reference into a drawer claim id when there is one. */
export function refClaim(ix: PacketIndex, ref: string): string | null {
  if (ref.startsWith('line:') || ref.startsWith('doc:') || ref.startsWith('finding:')) return ref.split('#')[0];
  const v = ix.valueById.get(ref);
  if (v) return 'doc:' + v.document_id;
  if (ix.docById.has(ref)) return 'doc:' + ref;
  if (ix.line(ix.latest.version, ref)) return 'line:' + ref;
  return null;
}

/** Keep the current query (filters) and set or replace the claim. */
export function claimHref(sp: WorkProps['sp'], id: string): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (k !== 'claim' && typeof v === 'string') q.set(k, v);
  q.set('claim', id);
  return '?' + q.toString();
}
export function queryHref(sp: WorkProps['sp'], key: string, value: string | null): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (k !== key && k !== 'claim' && typeof v === 'string') q.set(k, v);
  if (value !== null) q.set(key, value);
  const s = q.toString();
  return s ? '?' + s : '?';
}
export function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Label for a line key in the latest version. */
export function lineLabel(ix: PacketIndex, key: string): string {
  const l = ix.line(ix.latest.version, key);
  return l ? `${l.label}` : key;
}

export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
export function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** The person behind a role key, by name (never the key itself on screen). */
export function personName(ix: PacketIndex, key: RoleKey | string): string {
  return roleInfo(ix, key as RoleKey)?.name ?? String(key);
}
/** Story time of an event by seq (sign-offs carry only the wall-clock time they were saved). */
export function storyAtOf(state: WorkspaceState, seq: number): string | null {
  return state.events.find((e) => e.seq === seq)?.storyAt ?? null;
}
/** "Name, story time" for an action, with the wall-clock save time kept for a tooltip only. */
export function byline(ix: PacketIndex, e: { role: RoleKey | string; storyAt?: string | null; at: string }): { text: string; title: string } {
  return { text: `${personName(ix, e.role)}, ${e.storyAt ? when(e.storyAt) : when(e.at)}`, title: `Story time. Saved ${when(e.at)} by the wall clock.` };
}
