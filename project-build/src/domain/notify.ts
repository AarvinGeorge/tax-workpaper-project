// Notifications: one projection, two sources, one set of recipient rules, worded per recipient at read time.
// Brief: "Several people at once. Assignments, deadlines, notifications."
// Source 1, firm events (the H3 mock-up rules): review note -> preparer and its addressee (payload.to); adjustment
// proposed -> reviewer, applied -> preparer and whoever proposed it; tax effect over the partner threshold (measured
// against the value just before this change) -> partner; a sign-off gone stale -> its signer; a reviewer's or
// partner's sign-off -> preparer; question to a client -> that spouse; answer -> whoever asked (payload.questionSeq),
// else the preparer; question to a colleague or an assignment -> that person. Moving the story clock is history
// only, never a notice. Events sharing a groupId (bulk actions) become one notice.
// Source 2, the packet's own story up to the story clock (derived, never stored; only when storyAt is given):
// e-file rejection -> preparer, reviewer and both clients; client messages and documents that arrived after the latest
// computation -> preparer; e-file acceptance -> preparer, reviewer, partner and both clients; firm deadlines due within
// 7 days or passed and not met -> the firm administrator and the preparer.
// Never the actor's own actions; never free text from events; packet text only through maskText, never a PIN.
import type { PacketIndex } from './packet/load';
import type { RoleInfo, RoleKey, WorkEvent } from './contracts';
import { isApplied, retractedSeqs } from './events';
import { effectOf } from './project';
import { deadlines, frozenAt, visibleAt } from './clock';
import { isRoleKey, maskText, partnerThreshold, roleInfo, roles, signoffLevel } from './policy';

/** id is stable across renders: `ev:<seq>`, `grp:<groupId>:<rule>`, `tl:<timeline id>`, `dl:<date>:<index>:<state>`.
 *  at is the story time it happened (ISO), the sort key. seq is set for firm events only. */
export interface Notice { id: string; at: string; seq?: number; from: RoleKey | null; text: string; claimId?: string }

export function claimLabel(ix: PacketIndex, id?: string): string {
  if (!id) return 'the return';
  if (id === 'return') return 'the return';
  if (id.startsWith('line:')) { const l = ix.line(ix.latest.version, id.slice(5)); return l ? l.label : id.slice(5); }
  if (id.startsWith('doc:')) { const d = ix.docById.get(id.slice(4).split('#')[0]); return d ? d.title : id.slice(4); }
  return 'a finding';
}

const first = (ix: PacketIndex, k: RoleKey) => (roleInfo(ix, k)?.name ?? k).split(' ')[0];
const toKey = (x: unknown): RoleKey | null => (isRoleKey(x) ? x : null);
const ms = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso).getTime();
const iso = (t: number) => new Date(t).toISOString().replace('.000Z', 'Z');
const day = (s: string) => new Date(ms(s)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const DAY = 86_400_000;
const DEADLINE_WINDOW_DAYS = 7;
const AGENCY: Record<string, string> = { federal: 'IRS', california: 'Franchise Tax Board' };
const juris = (j: string) => (j === 'federal' ? 'federal' : j.charAt(0).toUpperCase() + j.slice(1));
/** Packet text for a notice: masked for the role, then any masked identifier tail removed too (no digits for anyone). */
const safe = (t: string, me: RoleInfo) => maskText(t, me, false).replace(/•[•\s-]*\d*/g, 'an identifier');

interface Recipients { preparer: RoleKey; reviewers: RoleKey[]; partners: RoleKey[]; admins: RoleKey[]; clients: RoleKey[] }

function recipients(ix: PacketIndex): Recipients {
  const all = roles(ix);
  const byLevel = (lv: string) => all.filter((r) => signoffLevel(ix, r.key) === lv).map((r) => r.key);
  const preparer: RoleKey = byLevel('preparer').includes('priya') ? 'priya' : (byLevel('preparer')[0] ?? 'priya');
  const staffRole = (r: RoleInfo) => ix.packet.firm.staff.find((s) => s.id === r.staffId)?.role;
  return {
    preparer, reviewers: byLevel('reviewer'), partners: byLevel('partner'),
    admins: all.filter((r) => r.kind === 'staff' && signoffLevel(ix, r.key) === null && staffRole(r) === 'firm_administrator').map((r) => r.key),
    clients: all.filter((r) => r.kind === 'client').map((r) => r.key),
  };
}

// ---------- Source 1: firm events ----------
type Draft = Notice & { group?: string; rule: string; who: string };
const GROUPED: Record<string, (who: string, n: number) => string> = {
  signoff: (who, n) => `${who} signed off ${n} items`,
  review_note: (who, n) => `${who} left review notes on ${n} items`,
  changed: (who, n) => `${who} changed ${n} items`,
  proposed: (who, n) => `${who} proposed changes to ${n} items for your review`,
};

function fromEvents(ix: PacketIndex, events: WorkEvent[], role: RoleKey, me: RoleInfo, R: Recipients): Notice[] {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  const undone = retractedSeqs(sorted);
  const live = sorted.filter((e) => e.type !== 'undo' && !undone.has(e.seq));
  const threshold = partnerThreshold(ix);
  const signers = new Map<string, Set<RoleKey>>();
  const proposers = new Map<string, RoleKey>();          // claim -> who proposed the change not yet applied
  const current = new Map<string, number>();             // claim -> value after the applied changes so far
  const askers = new Map<number, RoleKey>();             // question_to_client seq -> who asked
  const out: Draft[] = [];

  for (const e of live) {
    const who = first(ix, e.role);
    const what = maskText(claimLabel(ix, e.claimId), me, false);
    const to: { k: RoleKey; text: string; rule: string }[] = [];
    const p = e.payload;
    switch (e.type) {
      case 'review_note': {
        const text = `${who} left a ${p.blocking ? 'blocking ' : ''}review note on ${what}`;
        to.push({ k: R.preparer, rule: 'review_note', text });
        const k = toKey(p.to);
        if (k) to.push({ k, rule: 'review_note', text });
        break;
      }
      case 'note_resolved':
        to.push({ k: R.preparer, rule: 'note_resolved', text: `${who} resolved a review note on ${what}` });
        break;
      case 'adjustment': {
        const claim = e.claimId ?? '';
        if (isApplied(e)) {
          to.push({ k: R.preparer, rule: 'changed', text: `${who} changed ${what}` });
          const proposer = proposers.get(claim);
          if (proposer) to.push({ k: proposer, rule: 'applied_yours', text: `${who} applied your proposed change to ${what}` });
          proposers.delete(claim);
          for (const s of signers.get(e.claimId ?? '') ?? []) to.push({ k: s, rule: 'stale', text: `Your sign-off on ${what} is stale: the value changed after you signed` });
          signers.delete(e.claimId ?? '');
        } else {
          proposers.set(claim, e.role);
          for (const r of R.reviewers) to.push({ k: r, rule: 'proposed', text: `${who} proposed a change to ${what} for your review` });
        }
        const orig = claim.startsWith('line:') ? ix.line(ix.latest.version, claim.slice(5))?.value : undefined;
        const before = current.get(claim) ?? (typeof orig === 'number' ? orig : undefined);
        const next = Number(String(p.value ?? '').replace(/,/g, ''));
        if (isApplied(e) && Number.isFinite(next) && p.value !== undefined) current.set(claim, next);
        if (typeof before === 'number' && Number.isFinite(next) && threshold > 0) {
          const eff = effectOf(ix, claim.slice(5), next - before, p);
          if (eff && Math.max(Math.abs(eff.federal), Math.abs(eff.california)) > threshold) {
            for (const r of R.partners) to.push({ k: r, rule: 'partner', text: `${who}'s change to ${what} needs your partner sign-off (tax effect over ${threshold.toLocaleString('en-US')})` });
          }
        }
        break;
      }
      case 'signoff': {
        if (e.claimId) { const s = signers.get(e.claimId) ?? new Set<RoleKey>(); s.add(e.role); signers.set(e.claimId, s); }
        const lv = signoffLevel(ix, e.role);
        if (e.claimId === 'return') {
          for (const r of [R.preparer, ...R.reviewers]) to.push({ k: r, rule: 'signoff_return', text: `${who} signed off the return` });
          // Client approval requested (H3): the partner's approval is what lets each spouse sign Form 8879.
          if (lv === 'partner') for (const r of R.clients) to.push({ k: r, rule: 'sign_requested', text: 'Your return is ready for you to sign: Form 8879 and FTB 8879, on Filing' });
        }
        else if (lv === 'reviewer' || lv === 'partner') to.push({ k: R.preparer, rule: 'signoff', text: `${who} signed off ${what}` });
        break;
      }
      case 'client_signature':
        for (const r of [R.preparer, ...R.partners]) to.push({ k: r, rule: 'client_signature', text: `${who} signed Form 8879 and FTB 8879` });
        break;
      case 'question_to_client': {
        const k = toKey(p.to);
        askers.set(e.seq, e.role);
        if (k) to.push({ k, rule: 'question_to_client', text: `Your accountant has a question about ${what}` });
        break;
      }
      case 'answer_recorded':
        to.push({ k: askers.get(Number(p.questionSeq)) ?? R.preparer, rule: 'answer', text: `${who} answered your question on ${what}` });
        break;
      case 'question_to_colleague': {
        const k = toKey(p.to);
        if (k) to.push({ k, rule: 'question_to_colleague', text: `${who} asked you about ${what}` });
        break;
      }
      case 'assignment': {
        const k = toKey(p.to ?? p.assignee);
        if (k) to.push({ k, rule: 'assignment', text: `${who} assigned ${what} to you` });
        break;
      }
      case 'clock_moved': // history only: what the clock reveals arrives through the story source below
      default:
        break;
    }
    const seen = new Set<string>();
    for (const t of to) {
      if (t.k !== role || e.role === role || seen.has(t.text)) continue;
      seen.add(t.text);
      out.push({ id: `ev:${e.seq}`, at: e.storyAt, seq: e.seq, from: e.role, text: t.text, claimId: e.claimId, group: e.groupId, rule: t.rule, who });
    }
  }

  // One event can notify the same person twice (e.g. changed and partner sign-off): suffix the later ids.
  const used = new Map<string, number>();
  for (const d of out) { const k = used.get(d.id) ?? 0; used.set(d.id, k + 1); if (k) d.id = `${d.id}:${k}`; }

  // Group by groupId and rule: two or more become one notice, at the time and seq of the latest.
  const groups = new Map<string, Draft[]>();
  for (const d of out) if (d.group) { const k = `${d.group}:${d.rule}`; groups.set(k, [...(groups.get(k) ?? []), d]); }
  const result: Notice[] = [];
  const done = new Set<string>();
  for (const d of out) {
    const k = d.group ? `${d.group}:${d.rule}` : '';
    const g = k ? groups.get(k)! : [];
    if (g.length < 2) { result.push(strip(d)); continue; }
    if (done.has(k)) continue;
    done.add(k);
    const last = g[g.length - 1];
    const text = GROUPED[d.rule]?.(d.who, g.length) ?? `${d.text} and ${g.length - 1} more`;
    result.push({ id: `grp:${k}`, at: last.at, seq: last.seq, from: d.from, text });
  }
  return result;
}
const strip = ({ id, at, seq, from, text, claimId }: Draft): Notice => ({ id, at, seq, from, text, claimId });

// ---------- Source 2: the packet's own story ----------
type Efile = { date: string; jurisdiction: string; status: string; errors?: { code?: string; message?: string }[] };

function fromStory(ix: PacketIndex, role: RoleKey, me: RoleInfo, R: Recipients, storyAt: string): Notice[] {
  const out: Notice[] = [];
  const staffFor = (ks: RoleKey[]) => ks.includes(role);
  const add = (n: Notice, actor?: string | null) => { if (!(actor && me.staffId && actor === me.staffId)) out.push(n); };
  const latestAt = ix.latest.computed_at;
  const efile = ((ix.packet.tax_agency_records as { efile?: Efile[] }).efile) ?? [];
  const messages = ix.packet.client.messages ?? [];
  const isClient = me.kind === 'client';
  const senderName = (name: string) => { const r = roles(ix).find((x) => x.name === name); return r ? r.name.split(' ')[0] : 'The client'; };

  for (const t of ix.packet.timeline) {
    if (!visibleAt(t.at, storyAt)) continue;
    const id = `tl:${t.id}`;
    const after = ms(t.at) > ms(latestAt);
    if (/^efile_rejected/.test(t.event)) {
      if (!staffFor([R.preparer, ...R.reviewers, ...R.clients])) continue;
      const rec = efile.find((x) => x.status === 'rejected' && ms(x.date) === ms(t.at));
      const j = rec?.jurisdiction ?? 'federal';
      const agency = AGENCY[j] ?? `The ${juris(j)} agency`;
      if (isClient) add({ id, at: t.at, from: null, text: `The ${agency} returned your return; we need a document from you` });
      else {
        const reason = t.detail || (rec?.errors ?? []).map((x) => x.message ?? '').filter(Boolean).join(' ');
        add({ id, at: t.at, from: null, text: `The ${agency} rejected the ${juris(j)} e-file${reason ? `: ${safe(reason, me)}` : ''}` }, t.actor);
      }
    } else if (/^efile_accepted/.test(t.event)) {
      if (!staffFor([R.preparer, ...R.reviewers, ...R.partners, ...R.clients])) continue;
      const j = t.event.replace(/^efile_accepted_?/, '') || 'federal';
      const agency = AGENCY[j] ?? `The ${juris(j)} agency`;
      add({ id, at: t.at, from: null, text: isClient ? `Your ${juris(j)} return was accepted by the ${agency}` : `The ${agency} accepted the ${juris(j)} return` }, t.actor);
    } else if (t.event === 'client_message' && after) {
      if (role !== R.preparer) continue;
      for (const m of messages.filter((x) => t.refs.includes(x.id))) {
        add({ id: `${id}:${m.id}`, at: t.at, from: null, text: `${senderName(m.from)} sent a message after the last computation (${ix.latest.version})` }, t.actor);
      }
    } else if (t.event === 'document_received' && after) {
      if (role !== R.preparer) continue;
      const titles = t.refs.map((r) => ix.docById.get(r)?.title).filter((x): x is string => !!x);
      if (titles.length) add({ id, at: t.at, from: null, text: `A document arrived after the last computation (${ix.latest.version}): ${safe(titles.join(', '), me)}` }, t.actor);
    }
  }

  // Deadlines (firm.deadlines), measured on the story clock. Shown from 7 days before the date until met.
  // Met, kept simple: a filing deadline is met once the first federal acceptance is visible on or before it, or an
  // extension was filed before it (the extended date then applies); an internal deadline (text starts "Internal")
  // is met once the client has signed the e-file authorization (Form 8879), since hand-off and review precede it.
  // Deadlines whose text says "outside engagement" are not ours.
  if (staffFor([...R.admins, R.preparer])) {
    const accepted = frozenAt(ix);
    const visibleTl = ix.packet.timeline.filter((t) => visibleAt(t.at, storyAt));
    const extension = visibleTl.find((t) => /extension/i.test(t.event));
    const signed = visibleTl.find((t) => /8879/.test(t.event));
    const extended = deadlines(ix, storyAt).find((d) => /extended/i.test(d.what));
    deadlines(ix, storyAt).forEach((d, i) => {
      if (/outside engagement/i.test(d.what) || d.daysLeft > DEADLINE_WINDOW_DAYS) return;
      const internal = /^internal/i.test(d.what);
      const met = internal
        ? !!signed
        : (!!accepted && visibleAt(accepted, storyAt) && ms(accepted) <= ms(d.date) + DAY) ||
          (!!extension && !/extended/i.test(d.what) && ms(extension.at) <= ms(d.date) + DAY);
      if (met) return;
      const passed = d.daysLeft < 0;
      const context = extension && extended && extended.date !== d.date ? ` The return is on extension to ${day(extended.date)}.` : '';
      const text = passed
        ? `${d.what} was due ${day(d.date)} and is not done.${context}`
        : `${d.what} is due ${day(d.date)}, ${d.daysLeft === 0 ? 'today' : `in ${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'}`}.`;
      const when = passed ? ms(d.date) : ms(d.date) - DEADLINE_WINDOW_DAYS * DAY;
      out.push({ id: `dl:${d.date}:${i}:${passed ? 'passed' : 'soon'}`, at: iso(Math.min(when, ms(storyAt))), from: null, text: safe(text, me) });
    });
  }
  return out;
}

/** Newest first by story time; ties keep firm events (which happen at the clock) above the story, then by seq. */
export function notificationsFor(ix: PacketIndex, events: WorkEvent[], role: RoleKey, storyAt?: string): Notice[] {
  const me = roleInfo(ix, role);
  if (!me || me.kind === 'examiner') return [];
  const R = recipients(ix);
  const firm = fromEvents(ix, events, role, me, R);
  const story = storyAt ? fromStory(ix, role, me, R, storyAt) : [];
  const rank = (n: Notice, i: number) => (n.seq !== undefined ? 1e9 + n.seq : i);
  const all = [...story, ...firm].map((n, i) => ({ n, r: rank(n, i) }));
  all.sort((a, b) => ms(b.n.at) - ms(a.n.at) || b.r - a.r);
  return all.map((x) => x.n);
}
