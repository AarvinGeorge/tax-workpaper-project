// Projection: events over the read-only packet -> the workspace state one role sees.
import type { PacketIndex } from './packet/load';
import type { ClaimState, Finding, RoleKey, SignOff, WorkEvent, WorkspaceState } from './contracts';
import { DEFAULT_STORY_AT, frozenAt, indexAt, stageAt, visibleAt } from './clock';
import { isApplied, retractedSeqs, sinceLastReset } from './events';
import { maskText, partnerThreshold, roleInfo, signoffLevel } from './policy';
import { flowThrough, type FlowLine } from './flow';

type Effect = NonNullable<ClaimState['effect']>;
/** Values compare as text with null as '' and numbers without thousands separators ('10,500' equals 10500). */
export function normValue(x: unknown): string {
  const s = String(x ?? '').trim();
  const n = s.replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(n) ? String(Number(n)) : s;
}
const sameValue = (a: unknown, b: unknown) => normValue(a) === normValue(b);
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** Tax effect estimate of changing a line by delta: the version's tax_effect_rates for the category, or 1:1 for
 *  payments and credits (README). A payload.effect computed elsewhere (a check, a what-if) wins. */
export function effectOf(ix: PacketIndex, key: string, delta: number, payload: Record<string, unknown>): Effect | undefined {
  const version = ix.latest.version;
  const given = payload.effect as { federal?: unknown; california?: unknown; basis?: unknown } | undefined;
  if (given && (num(given.federal) !== null || num(given.california) !== null)) {
    return { federal: num(given.federal) ?? 0, california: num(given.california) ?? 0, basis: String(given.basis ?? 'given'), version };
  }
  const cat = typeof payload.category === 'string' ? payload.category : undefined;
  const rate = cat ? ix.latest.tax_effect_rates[cat] : undefined;
  if (rate) {
    return { federal: Math.round(delta * rate.federal_per_dollar), california: Math.round(delta * rate.california_per_dollar), basis: 'tax_effect_rates', version };
  }
  const line = ix.line(version, key);
  if (line && /payment|withh|credit/i.test(line.label)) {
    // More payments or credits lower tax or balance due, dollar for dollar, in the line's own jurisdiction.
    const fed = line.jurisdiction === 'federal';
    return { federal: fed ? -delta : 0, california: fed ? 0 : -delta, basis: 'payments and credits 1:1', version };
  }
  return undefined;
}

function storyTime(ix: PacketIndex, events: WorkEvent[], retracted: Set<number>): string {
  let at = DEFAULT_STORY_AT(ix);
  for (const e of events) if (e.type === 'clock_moved' && !retracted.has(e.seq) && typeof e.payload.to === 'string') at = e.payload.to;
  return at;
}

/** The workspace's story time (from the static index), before any projection: what loaders pass to indexAt. */
export function storyAtOf(ix: PacketIndex, events: WorkEvent[]): string {
  const sorted = sinceLastReset([...events].sort((a, b) => a.seq - b.seq));
  return storyTime(ix, sorted, retractedSeqs(sorted));
}

/** The latest story time reached since the last reset: every clock move counts, undone or not, so undoing a forward
 *  move restores the view but never reopens the past for writing (Reset does). */
function frontierTime(ix: PacketIndex, events: WorkEvent[]): string {
  let at = DEFAULT_STORY_AT(ix);
  for (const e of events) {
    const to = e.type === 'clock_moved' ? e.payload.to : undefined;
    if (typeof to === 'string' && !Number.isNaN(Date.parse(to)) && Date.parse(to) > Date.parse(at)) at = to;
  }
  return at;
}

function originalOf(ix: PacketIndex, claimId: string): number | string | null {
  if (!claimId.startsWith('line:')) return null;
  const v = ix.line(ix.latest.version, claimId.slice(5))?.value;
  return v === undefined ? null : (v as number | string | null);
}

function buildClaims(ix: PacketIndex, events: WorkEvent[], retracted: Set<number>): Record<string, ClaimState> {
  const claims: Record<string, ClaimState> = {};
  const byClaim = new Map<string, WorkEvent[]>();
  const claimOfSeq = new Map(events.map((e) => [e.seq, e.claimId]));
  for (const e of events) {
    // Undo events belong to the claims of what they retract.
    const ids = e.type === 'undo'
      ? [...new Set(events.filter((x) => x.seq === e.retracts || (e.groupId && x.groupId === e.groupId && x.type !== 'undo')).map((x) => claimOfSeq.get(x.seq)))]
      : [e.claimId];
    for (const id of ids) if (id) byClaim.set(id, [...(byClaim.get(id) ?? []), e]);
  }
  // Flow-through: the applied line adjustments (before a sequence number, or all) move the lines that depend on them.
  const liveApplied = events.filter((e) => isApplied(e) && !retracted.has(e.seq) && e.claimId?.startsWith('line:'));
  const flowBefore = new Map<number, Map<string, FlowLine>>();
  const flowAt = (seq: number) => {
    let f = flowBefore.get(seq);
    if (!f) {
      const adjusted: Record<string, unknown> = {};
      for (const e of liveApplied) if (e.seq < seq) adjusted[e.claimId!.slice(5)] = e.payload.value;
      f = flowThrough(ix, adjusted);
      flowBefore.set(seq, f);
    }
    return f;
  };
  const flow = flowAt(Infinity);
  for (const k of flow.keys()) if (!byClaim.has(`line:${k}`)) byClaim.set(`line:${k}`, []);
  const derivedAt = (f: Map<string, FlowLine>, claimId: string) => {
    const d = claimId.startsWith('line:') ? f.get(claimId.slice(5)) : undefined;
    return d && 'value' in d ? d.value : undefined;
  };
  for (const [claimId, history] of byClaim) {
    const original = originalOf(ix, claimId);
    const live = history.filter((e) => e.type !== 'undo' && !retracted.has(e.seq));
    const valueAt = (seq: number) => {
      const before = live.filter((e) => isApplied(e) && e.seq < seq);
      return before.length ? (before[before.length - 1].payload.value as number | string) : derivedAt(flowAt(seq), claimId) ?? original;
    };
    const applied = live.filter(isApplied);
    const fl = applied.length || !claimId.startsWith('line:') ? undefined : flow.get(claimId.slice(5));
    const current = applied.length ? (applied[applied.length - 1].payload.value as number | string) : fl && 'value' in fl ? fl.value : original;
    const appliedSeqs = new Set(history.filter(isApplied).map((e) => e.seq));
    const version = appliedSeqs.size + history.filter((e) => e.type === 'undo' && (
      (e.retracts && appliedSeqs.has(e.retracts)) || (e.groupId && history.some((x) => x.groupId === e.groupId && appliedSeqs.has(x.seq))))).length;
    const signoffs: SignOff[] = live.filter((e) => e.type === 'signoff').map((e) => {
      const value = String(e.payload.value ?? valueAt(e.seq));
      const level = (e.payload.level ?? signoffLevel(ix, e.role) ?? 'preparer') as SignOff['level'];
      // The whole return has no single value: its approval goes stale when any applied change (not undone) follows it.
      const stale = claimId === 'return'
        ? events.some((x) => isApplied(x) && !retracted.has(x.seq) && x.seq > e.seq)
        : sameValue(value, current) === false;
      return { seq: e.seq, role: e.role, level, value, stale, at: e.at, ...(typeof e.payload.note === 'string' && e.payload.note.trim() ? { note: e.payload.note } : {}) };
    });
    const resolved = new Set(live.filter((e) => e.type === 'note_resolved').map((e) => Number(e.payload.noteSeq)));
    const openNotes = live.filter((e) => e.type === 'review_note' && !resolved.has(e.seq));
    const c: ClaimState = { claimId, original, current, adjusted: applied.length > 0, history, signoffs, openNotes, version };
    if (fl) Object.assign(c, 'value' in fl ? { derived: true } : { needsEngine: true }, { from: fl.from });
    const o = num(original), cur = num(current);
    if (c.adjusted && o !== null && cur !== null) {
      const eff = effectOf(ix, claimId.slice(5), cur - o, applied[applied.length - 1].payload);
      if (eff) c.effect = eff;
    }
    claims[claimId] = c;
  }
  return claims;
}

function maskEvent(e: WorkEvent, role: ReturnType<typeof roleInfo>): WorkEvent {
  const walk = (x: unknown): unknown =>
    typeof x === 'string' ? maskText(x, role, false)
      : Array.isArray(x) ? x.map(walk)
        : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v)])) : x;
  return { ...e, payload: walk(e.payload) as Record<string, unknown> };
}

/** An applied change whose tax effect is over the firm's partner threshold needs a live partner sign-off. */
export function needsPartnerSignoff(ix: PacketIndex, c: ClaimState): boolean {
  const threshold = partnerThreshold(ix);
  if (!c.effect || !threshold) return false;
  if (Math.abs(c.effect.federal) <= threshold && Math.abs(c.effect.california) <= threshold) return false;
  return !c.signoffs.some((s) => s.level === 'partner' && !s.stale);
}

export function projectWorkspace(ix: PacketIndex, events: WorkEvent[], role: RoleKey, findings: Finding[]): WorkspaceState {
  const info = roleInfo(ix, role);
  const sorted = sinceLastReset([...events].sort((a, b) => a.seq - b.seq));
  // The clock is set by clock_moved events whatever their own story time; undoing one moves it back.
  const storyAt = storyTime(ix, sorted, retractedSeqs(sorted));
  const visible = sorted.filter((e) => e.type === 'clock_moved' || visibleAt(e.storyAt, storyAt)).map((e) => maskEvent(e, info));
  const retracted = retractedSeqs(visible);
  const fz = frozenAt(ix);
  const base = { storyAt, frontierAt: frontierTime(ix, sorted), frozen: !!fz && visibleAt(fz, storyAt), stage: stageAt(ix, storyAt) };
  // The clock above reads the static index; the return itself (originals, effects, labels) is the version of the day.
  const pix = indexAt(ix, storyAt);

  if (!info || info.kind !== 'staff') {
    // Outside views: a client sees questions addressed to them, what they themselves wrote, and the signing record of
    // the return (the partner's approval and each spouse's e-file signature); the examiner, none of the file.
    const mine = (to: unknown) => !!info && (to === info.key || to === info.clientUserId);
    const signing = (e: WorkEvent) => e.claimId === 'return' && (e.type === 'client_signature' || (e.type === 'signoff' && signoffLevel(ix, e.role) === 'partner'));
    const own = info?.kind === 'client'
      ? visible.filter((e) => !retracted.has(e.seq) && ((e.type === 'question_to_client' && mine(e.payload.to)) ||
        ((e.type === 'answer_recorded' || e.type === 'attach_note') && e.role === role) || signing(e)))
      : [];
    return { ...base, claims: buildClaims(pix, own, new Set()), blockers: [], reveals: [], reasons: {}, events: own };
  }

  const claims = buildClaims(pix, visible, retracted);
  const live = visible.filter((e) => e.type !== 'undo' && !retracted.has(e.seq));
  const blockers: WorkspaceState['blockers'] = [];
  for (const c of Object.values(claims)) {
    for (const n of c.openNotes) if (n.payload.blocking) blockers.push({ claimId: c.claimId, title: `Open review note: ${String(n.payload.text ?? '')}` });
  }
  const cleared = new Set(live.filter((e) => e.type === 'finding_cleared').map((e) => e.claimId));
  for (const f of findings) {
    if (f.severity !== 'blocker' || !visibleAt(f.firstVisibleAt, storyAt)) continue;
    if (cleared.has(`finding:${f.id}`) || f.claims.some((id) => claims[id]?.adjusted)) continue;
    blockers.push({ claimId: `finding:${f.id}`, title: f.title });
  }
  const threshold = partnerThreshold(ix);
  for (const c of Object.values(claims)) {
    if (!needsPartnerSignoff(ix, c)) continue;
    const label = c.claimId.startsWith('line:') ? ix.line(pix.latest.version, c.claimId.slice(5))?.label ?? c.claimId : c.claimId;
    blockers.push({ claimId: c.claimId, title: `Partner sign-off needed: ${label} (tax effect over ${threshold.toLocaleString('en-US')})` });
  }
  // The return is not approved on stale figures: each line where the flow stops at a computation only the engine can
  // redo (the frontier; the lines below it follow from it) blocks until the engine re-runs. Never on the adjusted line.
  const graph = pix.flowGraph(pix.latest.version);
  const labelOf = (key: string) => pix.line(pix.latest.version, key)?.label ?? key;
  for (const c of Object.values(claims)) {
    if (!c.needsEngine) continue;
    const key = c.claimId.slice(5);
    if ((graph.inputs.get(key) ?? []).some((i) => claims[`line:${i}`]?.needsEngine)) continue;
    blockers.push({ claimId: c.claimId, title: `Needs engine re-run: ${labelOf(key)} depends on ${(c.from ?? []).map((k) => `${k} ${labelOf(k)}`).join(' and ')}` });
  }
  const reveals = live.filter((e) => e.type === 'reveal').map((e) => ({ seq: e.seq, role: e.role, what: String(e.payload.what ?? ''), at: e.at }));
  const reasons: WorkspaceState['reasons'] = {};
  for (const e of live) if (e.type === 'reason_set' && e.claimId) reasons[e.claimId] = { code: String(e.payload.code ?? ''), text: String(e.payload.text ?? ''), role: e.role };
  return { ...base, claims, blockers, reveals, reasons, events: visible };
}
