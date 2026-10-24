// Roles, permissions and masking. Enforced on the server; the UI only mirrors it.
// Everything about people comes from firm.staff, firm.client_users, household, timeline and notices.
import type { PacketIndex } from './packet/load';
import type { NewEvent, RoleInfo, RoleKey, ScreenKey, WorkEvent, WorkspaceState } from './contracts';
import { visibleAt, frozenAt, notComputedText } from './clock';
import { isApplied, retractedSeqs } from './events';
import { suggestionStatus } from './ai/merge';

type Level = 'preparer' | 'reviewer' | 'partner';
interface RoleMeta { info: RoleInfo; level: Level | null; writes: boolean; householdRole?: string; householdId?: string }

// Staff: the Return overview (home and its tabs), Checks and Review. Firm, Changes, staff Filing and Findings are retired:
// their routes redirect to the "?" dialog, Review's Changes tab, the overview and Checks.
const ALL_SCREENS: ScreenKey[] = ['home', 'return', 'areas', 'documents', 'whatifs', 'checks', 'review'];
const OUTSIDE_SCREENS: ScreenKey[] = ['home', 'documents', 'filing'];
const TITLES: Record<string, string> = {
  preparer: 'Preparer', reviewer: 'Reviewer', partner: 'Partner', firm_administrator: 'Firm administrator', quality_reviewer: 'Quality reviewer',
};
const dateIso = (d: string | null | undefined) => (!d ? null : /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00Z` : d);
const title = (role: string, credential: string | null) => (TITLES[role] ?? role.replace(/_/g, ' ')) + (credential ? `, ${credential}` : '');

const metaCache = new WeakMap<PacketIndex, Map<RoleKey, RoleMeta>>();

/** Seats are matched by what the packet says a person does, never by name, so a renamed packet still maps. */
function buildRoles(ix: PacketIndex): Map<RoleKey, RoleMeta> {
  const hit = metaCache.get(ix);
  if (hit) return hit;
  const { firm, household, timeline } = ix.packet;
  const staff = firm.staff;
  const assign = (firm.assignment_at_start ?? {}) as Record<string, string>;
  const m = new Map<RoleKey, RoleMeta>();
  const addStaff = (key: RoleKey, s: (typeof staff)[number] | undefined, over: Partial<RoleInfo> = {}, writes = true) => {
    if (!s) return;
    const level = (['preparer', 'reviewer', 'partner'] as string[]).includes(s.role) ? (s.role as Level) : null;
    m.set(key, {
      info: {
        key, name: s.name, title: title(s.role, s.credential), kind: 'staff', staffId: s.id,
        clearance: !!s.sensitive_data_clearance, activeFrom: dateIso(s.active_from), screens: ALL_SCREENS, ...over,
      },
      level: over.title ? null : level, writes,
    });
  };
  const byId = (id?: string) => staff.find((s) => s.id === id);
  addStaff('priya', byId(assign.preparer));
  addStaff('daniel', byId(assign.reviewer));
  addStaff('helen', byId(assign.partner));
  addStaff('marcus', staff.find((s) => s.role === 'preparer' && s.id !== assign.preparer));
  addStaff('jo', staff.find((s) => s.role === 'firm_administrator'));
  addStaff('sam', staff.find((s) => s.role === 'quality_reviewer'), {}, false);
  // Next year's preparer: a persona of the person who opens next year's engagement, at that timeline moment.
  const nextEv = timeline.find((t) => /next_year/i.test(t.event));
  const nextStaff = byId(nextEv?.actor ?? undefined) ?? byId(assign.preparer);
  if (nextStaff) addStaff('next', nextStaff, { title: "Preparer, next year's return", activeFrom: nextEv?.at ?? null }, false);
  // Clients: firm.client_users, linked to household people by name for their household role.
  const people = household.people;
  const clientKey: Record<string, RoleKey> = { taxpayer: 'ngozi', spouse: 'erik' };
  for (const cu of firm.client_users) {
    const person = people.find((pp) => pp.name === cu.name);
    const key = person ? clientKey[person.role] : undefined;
    if (!key || m.has(key)) continue;
    m.set(key, {
      info: {
        key, name: cu.name, title: person!.role === 'taxpayer' ? 'Client, taxpayer' : 'Client, spouse', kind: 'client',
        clientUserId: cu.id, clearance: false, activeFrom: null, screens: OUTSIDE_SCREENS,
      },
      level: null, writes: true, householdRole: person!.role, householdId: person!.id,
    });
  }
  // IRS examiner: the examination notice (Letter 566), from its date.
  const notices = ((ix.packet.tax_agency_records as { notices?: { type: string; dated: string; agency: string }[] }).notices) ?? [];
  const exam = notices.find((n) => /examination|566/i.test(n.type));
  if (exam) {
    m.set('irs', {
      info: {
        key: 'irs', name: `${exam.agency} examiner`, title: exam.type, kind: 'examiner', clearance: false,
        activeFrom: dateIso(exam.dated), screens: OUTSIDE_SCREENS,
      },
      level: null, writes: false,
    });
  }
  metaCache.set(ix, m);
  return m;
}

const ORDER: RoleKey[] = ['priya', 'marcus', 'daniel', 'helen', 'sam', 'jo', 'ngozi', 'erik', 'next', 'irs'];
export function roles(ix: PacketIndex): RoleInfo[] {
  const m = buildRoles(ix);
  return ORDER.filter((k) => m.has(k)).map((k) => m.get(k)!.info);
}
export function roleInfo(ix: PacketIndex, key: RoleKey): RoleInfo | undefined {
  return buildRoles(ix).get(key)?.info;
}
export function isRoleKey(x: unknown): x is RoleKey {
  return typeof x === 'string' && (ORDER as string[]).includes(x);
}
export function signoffLevel(ix: PacketIndex, key: RoleKey): Level | null {
  return buildRoles(ix).get(key)?.level ?? null;
}

// ---------- Firm rules, read from firm.starter_standards ----------
const rules = (ix: PacketIndex): string[] => (ix.packet.firm.starter_standards.rules as string[]) ?? [];
export const ruleText = (ix: PacketIndex, re: RegExp): string => rules(ix).find((r) => re.test(r)) ?? '';
export function partnerThreshold(ix: PacketIndex): number {
  const r = ruleText(ix, /partner sign-off/i);
  const n = r.match(/(\d[\d,]*)/);
  return n ? Number(n[1].replace(/,/g, '')) : 0;
}
const verificationTypes = (ix: PacketIndex): string[] => (ix.packet.firm.starter_standards.verification_types as string[]) ?? [];
export const DECISION_KINDS = ['election', 'due_diligence', 'penalty', 'judgment'] as const;

// ---------- can ----------
export type Action = NewEvent['type'] | 'approve';
export type Target = Partial<Pick<NewEvent, 'claimId' | 'payload' | 'baseVersion' | 'retracts' | 'groupId'>>;
export interface Verdict { ok: boolean; reason?: string; conflict?: boolean; newer?: WorkEvent[] }

const no = (reason: string, extra: Partial<Verdict> = {}): Verdict => ({ ok: false, reason, ...extra });
const yes: Verdict = { ok: true };
const str = (x: unknown) => (typeof x === 'string' ? x.trim() : '');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Events on a claim that changed its value (applied adjustments and undos of them). */
export function valueEvents(state: WorkspaceState, claimId: string): WorkEvent[] {
  const ev = state.events;
  const applied = new Set(ev.filter((e) => e.claimId === claimId && isApplied(e)).map((e) => e.seq));
  return ev.filter((e) => applied.has(e.seq) || (e.type === 'undo' && (
    (e.retracts && applied.has(e.retracts)) || (e.groupId && ev.some((x) => x.groupId === e.groupId && applied.has(x.seq))))));
}

/** role may be a key or a RoleInfo; target may be a claim id or { claimId, payload, baseVersion, retracts, groupId }. */
export function can(ix: PacketIndex, roleArg: RoleKey | RoleInfo, action: Action, targetArg: Target | string | undefined, state: WorkspaceState): Verdict {
  const roleKey: RoleKey = typeof roleArg === 'string' ? roleArg : roleArg.key;
  const target: Target = typeof targetArg === 'string' ? { claimId: targetArg } : targetArg ?? {};
  const meta = buildRoles(ix).get(roleKey);
  if (!meta) return no('Unknown role.');
  const { info } = meta;
  const payload = target.payload ?? {};
  const claim = target.claimId ? state.claims[target.claimId] : undefined;

  // A demo control, not a firm action: anyone at the link may take the workspace back to the pipeline output.
  if (action === 'workspace_reset') return yes;

  // Also a demo instrument: every role may move the story clock (one clock per workspace, recorded as an event).
  // The clock stays inside the packet's own timeline (first to last event, inclusive): a time past the story would
  // move the frontier there and leave the whole workspace in "the past".
  if (action === 'clock_moved') {
    const to = Date.parse(str(payload.to));
    if (Number.isNaN(to)) return no('payload.to must be a date and time.');
    const span = ix.packet.timeline.map((t) => Date.parse(t.at)).filter((t) => !Number.isNaN(t));
    if (span.length && (to < Math.min(...span) || to > Math.max(...span))) {
      return no(`The story runs from ${fmtDate(new Date(Math.min(...span)).toISOString())} to ${fmtDate(new Date(Math.max(...span)).toISOString())}. Pick a time inside it.`);
    }
    return yes;
  }
  // Before the engine's first run there is no return to adjust (ix is then the index as of story time).
  const notComputed = notComputedText(ix);
  if (action === 'adjustment' && notComputed) return no(notComputed);
  if (info.activeFrom && !visibleAt(info.activeFrom, state.storyAt)) {
    return no(`${info.name} joins on ${fmtDate(info.activeFrom)}. Move the story clock to that date or later.`);
  }
  if (info.kind === 'examiner') return no('The examiner has read-only access to the items under examination.');
  if (!meta.writes) return no(`${info.title} has read-only access to this return.`);
  // The past is view-only: acting is only at the latest story time reached, so nothing is written into a past that a
  // later point (the filed return, the view log) has already recorded. The clock and Reset stay free (above).
  if (state.frontierAt && !visibleAt(state.frontierAt, state.storyAt)) {
    return no(`You are viewing an earlier point in the story. Move the clock to ${fmtDate(state.frontierAt)} to act.`);
  }

  if (info.kind === 'client') return clientCan(ix, meta, action, target, state);

  const valueChange = action === 'adjustment' || (action === 'undo' && isValueUndo(state, target));
  if (valueChange && state.frozen) {
    return no(`The as-filed return is locked since federal acceptance (${fmtDate(frozenAt(ix)!)}). Amend on top: record a note or a decision for an amended return.`);
  }
  if (target.baseVersion !== undefined && target.claimId) {
    const current = claim?.version ?? 0;
    if (target.baseVersion !== current) {
      return no('Someone changed this item since you opened it.', { conflict: true, newer: valueEvents(state, target.claimId) });
    }
  }

  switch (action) {
    case 'reveal':
      if (!info.clearance) return no(ruleText(ix, /clearance/i) || 'No sensitive-data clearance.');
      return str(payload.what) ? yes : no('Say what is revealed (payload.what).');
    case 'adjustment': {
      if (!meta.level) return no(`${info.title} does not adjust the return.`);
      if (!target.claimId?.startsWith('line:') || !ix.line(ix.latest.version, target.claimId.slice(5))) return no('Adjustments are made to a return line.');
      if (payload.value === undefined || payload.value === null || !['number', 'string'].includes(typeof payload.value)) return no('payload.value is required.');
      const status = payload.status ?? 'proposed';
      if (status !== 'proposed' && status !== 'applied') return no('status is proposed or applied.');
      if (status === 'applied' && meta.level === 'preparer') return no('A preparer proposes; the reviewer or partner applies.');
      return yes;
    }
    case 'signoff': {
      if (!meta.level) return no(`${info.title} does not sign off.`);
      if (!target.claimId) return no('Sign-off needs an item.');
      if (target.claimId === 'return') return approval(meta, state); // the partner's approval of the whole return
      const level = payload.level ?? meta.level;
      if (level !== meta.level) return no(`${info.name} signs off as ${meta.level}, not ${String(level)}.`);
      if (level !== 'preparer') {
        const adjs = (claim?.history ?? []).filter((e) => e.type === 'adjustment' && !retractedSeqs(state.events).has(e.seq));
        const last = adjs[adjs.length - 1];
        if (last && last.role === roleKey) return no(ruleText(ix, /may not review/i) || 'You may not sign off your own work.');
      }
      // Every sign-off on an item says what was checked. Gates new writes only: stored sign-offs still project.
      if (!str(payload.note)) return no('A sign-off needs a note on what you checked.');
      return yes;
    }
    case 'client_signature':
      return no('Only the clients sign the e-file authorization, each for themself.');
    case 'verification': {
      if (!target.claimId) return no('Verification needs an item.');
      const types = verificationTypes(ix);
      return types.includes(str(payload.method)) ? yes : no(`Method must be one of: ${types.join(', ')}.`);
    }
    case 'decision':
      if (!(DECISION_KINDS as readonly string[]).includes(str(payload.kind))) return no(`Decision kind is one of: ${DECISION_KINDS.join(', ')}.`);
      if (!str(payload.authority)) return no(ruleText(ix, /authority/i) || 'Record the authority relied on.');
      return meta.level ? yes : no(`${info.title} does not make return decisions.`);
    case 'review_note':
    case 'attach_note':
      return str(payload.text) ? yes : no('A note needs text.');
    case 'note_resolved': {
      const seq = Number(payload.noteSeq);
      const open = Object.values(state.claims).some((c) => c.openNotes.some((n) => n.seq === seq));
      return open ? yes : no('That note is not open.');
    }
    case 'question_to_client': {
      const to = buildRoles(ix).get(str(payload.to) as RoleKey);
      if (!to || to.info.kind !== 'client') return no('Address the question to a named client.');
      return str(payload.text) ? yes : no('A question needs text.');
    }
    case 'question_to_colleague': {
      const to = buildRoles(ix).get(str(payload.to) as RoleKey);
      if (!to || to.info.kind !== 'staff' || to.info.key === roleKey) return no('Address the question to a colleague.');
      return str(payload.text) ? yes : no('A question needs text.');
    }
    case 'finding_cleared':
      if (!target.claimId?.startsWith('finding:')) return no('Clear a finding by its id.');
      if (!meta.level) return no(`${info.title} does not clear findings.`);
      return str(payload.reason) ? yes : no('Clearing a finding needs a reason.');
    case 'suggestion_accepted':
    case 'suggestion_dismissed':
    {
      // Reached only by staff with write access (clients, the examiner and read-only seats are refused above); like
      // clearing a finding, reviewing one needs a sign-off level.
      if (!target.claimId?.startsWith('finding:')) return no('Review an AI suggestion by its id.');
      if (!meta.level) return no(`${info.title} does not review AI suggestions.`);
      if (action === 'suggestion_dismissed' && !str(payload.reason)) return no('Dismissing a suggestion needs a reason.');
      const now = suggestionStatus(state.events, target.claimId.slice(8)).status;
      if (action === 'suggestion_accepted' && now === 'accepted') return no('This suggestion is already accepted.');
      if (action === 'suggestion_dismissed' && now === 'dismissed') return no('This suggestion is already dismissed.');
      return yes;
    }
    case 'undo': {
      const ev = state.events.find((e) => e.seq === target.retracts) ?? state.events.find((e) => target.groupId && e.groupId === target.groupId);
      if (!ev) return no('Nothing to undo.');
      if (ev.role !== roleKey && meta.level !== 'reviewer' && meta.level !== 'partner') return no('You can undo only your own actions.');
      return yes;
    }
    case 'approve':
      return approval(meta, state);
    case 'answer_recorded':
    case 'reason_set':
    case 'assignment':
    case 'time_logged':
      return yes;
    default:
      return no('Unknown action.');
  }
}

function approval(meta: RoleMeta, state: WorkspaceState): Verdict {
  if (meta.level !== 'partner') return no('Only the partner approves the return.');
  if (state.blockers.length) return no(`Approval is blocked: ${state.blockers.map((b) => b.title).join('; ')}.`);
  return yes;
}

function isValueUndo(state: WorkspaceState, t: Target): boolean {
  const ev = state.events;
  return ev.some((e) => isApplied(e) && (e.seq === t.retracts || (t.groupId !== undefined && e.groupId === t.groupId)));
}

function clientCan(ix: PacketIndex, meta: RoleMeta, action: Action, target: Target, state: WorkspaceState): Verdict {
  const payload = target.payload ?? {};
  const mine = (to: unknown) => to === meta.info.key || to === meta.info.clientUserId || to === meta.householdId;
  if (action === 'answer_recorded') {
    const q = state.events.find((e) => e.seq === Number(payload.questionSeq) && e.type === 'question_to_client');
    if (!q || !mine(q.payload.to)) return no('You can answer only questions addressed to you.');
    if (target.claimId && target.claimId !== q.claimId) return no('An answer is filed on the item the question was asked about.');
    return str(payload.text) ? yes : no('An answer needs text.');
  }
  if (action === 'client_signature') return clientSignature(ix, meta, target, state);
  if (action === 'attach_note') {
    if (!str(payload.text)) return no('A note needs text.');
    const c = target.claimId ?? '';
    if (c.startsWith('question:')) {
      const q = state.events.find((e) => e.seq === Number(c.slice(9)));
      return q && mine(q.payload.to) ? yes : no('You can add notes only to your own questions.');
    }
    if (c.startsWith('doc:')) {
      const d = ix.docById.get(c.slice(4).split('#')[0]);
      return d && (d.belongs_to === 'joint' || d.belongs_to === meta.householdRole) ? yes : no('You can add notes only to your own documents.');
    }
    return no('You can add notes only to your own documents and questions.');
  }
  return no('Clients can answer questions, sign the e-file authorization and add notes to their own documents.');
}

/** The e-file authorization forms each spouse signs (federal and California). */
export const SIGN_FORMS = ['8879', 'FTB 8879'] as const;

/** The partner's approval of the whole return: a live partner sign-off on claim 'return'. */
export function returnApproved(ix: PacketIndex, events: WorkEvent[]): boolean {
  const r = retractedSeqs(events);
  return events.some((e) => e.type === 'signoff' && e.claimId === 'return' && !r.has(e.seq) && signoffLevel(ix, e.role) === 'partner');
}

/** Why the clients may not sign an approved return, read from a staff projection (a client's own projection does not
 *  carry the firm's adjustments): the return changed after the partner approved it, or a figure on it still needs an
 *  engine re-run (src/domain/flow.ts). Plain words, shown to the client. null when signing may go ahead. */
export function signingBlock(ix: PacketIndex, staffState: WorkspaceState): string | null {
  if (!returnApproved(ix, staffState.events)) return null;
  const approvals = (staffState.claims.return?.signoffs ?? []).filter((s) => s.level === 'partner');
  if (approvals.length && approvals.every((s) => s.stale)) return 'Your tax team changed the return after approving it; they will ask you to sign once it is approved again.';
  if (Object.values(staffState.claims).some((c) => c.needsEngine)) return 'Your tax team is re-running the return after a change; they will ask you to sign once the new figures are approved.';
  return null;
}

/** One spouse signs Form 8879 and FTB 8879: after the partner's approval, before federal acceptance, once per version
 *  of the return (payload.value is the fingerprint of the finalized return signed). No PIN is asked for or kept. */
function clientSignature(ix: PacketIndex, meta: RoleMeta, target: Target, state: WorkspaceState): Verdict {
  const payload = target.payload ?? {};
  if (target.claimId !== 'return') return no('The e-file authorization is signed on the whole return.');
  if (Object.keys(payload).some((k) => /pin/i.test(k))) return no('No PIN is asked for or kept here.');
  const forms = Array.isArray(payload.forms) ? payload.forms.map(String) : [];
  if (!SIGN_FORMS.every((f) => forms.includes(f))) return no('Sign both forms: Form 8879 (federal) and FTB 8879 (California).');
  const value = str(payload.value);
  if (!value) return no('A signature must name the return it covers.');
  if (state.frozen) return no(`The return was filed and accepted on ${fmtDate(frozenAt(ix)!)}. Signing is closed.`);
  if (!returnApproved(ix, state.events)) return no('The partner has not approved the return yet. You can sign once it is approved.');
  const stale = signingBlock(ix, state);
  if (stale) return no(stale);
  const r = retractedSeqs(state.events);
  const mine = state.events.filter((e) => e.type === 'client_signature' && e.role === meta.info.key && !r.has(e.seq));
  const last = mine[mine.length - 1];
  if (last && str(last.payload.value) === value) return no('You have already signed this return.');
  return yes;
}

// ---------- Masking ----------
const SENSITIVE_TYPE = /^(ssn|itin|tin|account_number|account|routing|routing_number|bank_account|ip_pin|pin|ero_pin|signature_pin)$/i;
const PIN_TYPE = /pin$/i;
const BULLET = '•';

/** The type to mask by: value_type, refined by the field name when the type is generic (an IP PIN is a 'code'). */
export function sensitiveTypeOf(v: { field?: string; value_type: string }): string {
  const f = (v.field ?? '').toLowerCase();
  if (/ip_pin|_pin$|^pin$/.test(f)) return 'ip_pin';
  if (/routing/.test(f)) return 'routing';
  if (/account_number|bank_account/.test(f)) return 'account_number';
  if (/(^|_)ssn$|(^|_)tin$/.test(f) && !/ein/.test(f)) return 'ssn';
  return v.value_type;
}

const canUnmask = (role: RoleInfo | null | undefined, revealed: boolean) => !!(revealed && role && role.kind === 'staff' && role.clearance);

function last4(raw: string, kind: string): string {
  if (PIN_TYPE.test(kind)) return BULLET.repeat(5);
  const chars = raw.replace(/[^A-Za-z0-9]/g, '');
  const tail = chars.slice(-4);
  if (/^\d{3}-\d{2}-\d{4}$/.test(raw) || /ssn|itin|tin/i.test(kind)) return `${BULLET.repeat(3)}-${BULLET.repeat(2)}-${tail}`;
  return `${BULLET.repeat(4)} ${tail}`;
}

/** Last 4 only for identifier types; PINs fully hidden; EINs and everything else untouched. */
export function maskValue(text: string, valueType: string, role: RoleInfo | null | undefined, revealed: boolean): string {
  if (!SENSITIVE_TYPE.test(valueType) || !text) return text;
  if (canUnmask(role, revealed) && !/signature|ero/i.test(valueType)) return text;
  return last4(String(text), valueType);
}

const RE_PIN = /\b((?:IP |ERO |[Ss]ignature |Identity Protection )?PIN)(\s*(?:is|:|#|no\.?)?\s*)(\d{4,8})\b/g;
const RE_SSN = /\b\d{3}-\d{2}-(\d{4})\b/g;
const RE_IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,3})?\b/g;
const RE_LABELLED = /\b(routing|account|acct|IBAN)((?:\s+(?:number|no\.?|#))?[\s:#]*)(\d[\d -]{4,}\d)/gi;
const RE_LONG = /(?<![\d,.\-/])\d{9,17}(?![\d,.\-/])/g;

/** Signature, ERO and IP PINs: never shown, in any text. */
export function redactPins(text: string): string {
  return text.replace(RE_PIN, (_m, label, sep) => `${label}${sep}${BULLET.repeat(5)}`);
}

/** Free text for display (timeline details etc.): PINs removed, full identifiers cut to last 4. */
export function redactText(text: string): string {
  if (!text) return text;
  return redactPins(text)
    .replace(RE_SSN, (_m, tail) => `${BULLET.repeat(3)}-${BULLET.repeat(2)}-${tail}`)
    .replace(RE_IBAN, (m) => `${BULLET.repeat(4)} ${m.replace(/\s/g, '').slice(-4)}`)
    .replace(RE_LABELLED, (m, label, sep, num: string) => {
      const digits = num.replace(/\D/g, '');
      return digits.length >= 6 ? `${label}${sep}${BULLET.repeat(4)} ${digits.slice(-4)}` : m;
    })
    .replace(RE_LONG, (m) => `${BULLET.repeat(4)} ${m.slice(-4)}`);
}

/** Regex pass over ANY text a role receives. A cleared staff member who revealed sees identifiers; PINs stay hidden. */
export function maskText(text: string, role: RoleInfo | null | undefined, revealed: boolean): string {
  if (!text) return text;
  return canUnmask(role, revealed) ? redactPins(text) : redactText(text);
}

const SENSITIVE_KEY = /^(ssn|.*_ssn|itin|tin|routing|routing_number|account|account_number|bank_account|ip_pin|ero_pin|pin|.*_pin)$/i;

/** Deep copy of a packet record with identifier fields masked by key name and every string passed through maskText. */
export function maskRecord<T>(obj: T, role: RoleInfo | null | undefined, revealed: boolean): T {
  const walk = (x: unknown, key?: string): unknown => {
    if (typeof x === 'string' || typeof x === 'number') {
      if (key && SENSITIVE_KEY.test(key)) {
        const kind = /pin$/i.test(key) ? key : /routing/i.test(key) ? 'routing' : /account/i.test(key) ? 'account_number' : 'ssn';
        return maskValue(String(x), kind, role, revealed);
      }
      return typeof x === 'string' ? maskText(x, role, revealed) : x;
    }
    if (Array.isArray(x)) return x.map((v) => walk(v));
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v, k)]));
    return x;
  };
  return walk(obj) as T;
}

// ---------- Document scope ----------
/** Documents a role may open: null = no restriction (staff). A client: their own, joint and dependents' documents.
 *  The examiner: the examination letter plus the documents behind the items under examination (forms and schedule
 *  lines named in the notice, traced through the latest version's line inputs and sources). */
export function visibleDocIds(ix: PacketIndex, key: RoleKey): Set<string> | null {
  const meta = buildRoles(ix).get(key);
  if (!meta || meta.info.kind === 'staff') return null;
  const out = new Set<string>();
  if (meta.info.kind === 'client') {
    for (const d of ix.packet.documents) {
      const b = d.belongs_to ?? '';
      if (b === 'joint' || b === meta.householdRole || b.startsWith('dependent:')) out.add(d.id);
    }
    return out;
  }
  const notices = ((ix.packet.tax_agency_records as { notices?: { type: string; document?: string; items_under_examination?: string[] }[] }).notices) ?? [];
  const exam = notices.find((n) => /examination|566/i.test(n.type));
  if (!exam) return out;
  if (exam.document) out.add(exam.document);
  const v = ix.latest.version;
  const lines = ix.latest.lines;
  const seen = new Set<string>();
  const trace = (k: string, depth = 0) => {
    if (seen.has(k) || depth > 6) return;
    seen.add(k);
    const l = ix.line(v, k);
    if (!l) return;
    for (const s of l.sources ?? []) {
      const val = ix.valueById.get(s);
      if (val) out.add(val.document_id);
      else if (s.startsWith('doc:')) out.add(s.slice(4).split('#')[0]);
    }
    for (const i of l.inputs ?? []) trace(i, depth + 1);
  };
  for (const item of exam.items_under_examination ?? []) {
    for (const m of item.matchAll(/Schedule ([A-Z0-9]+) line (\w+)/g)) trace(`Sch${m[1]}.${m[2]}`);
    for (const m of item.matchAll(/\b(\d{4}(?:-[A-Z]+)?)\b/g)) {
      const form = m[1];
      for (const d of ix.packet.documents) if (d.document_type === form) out.add(d.id);
      for (const l of lines) if (l.form === `F${form}`) trace(l.key);
    }
  }
  return out;
}
