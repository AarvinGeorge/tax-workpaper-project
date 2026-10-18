// Review memo: a frozen, printable snapshot of the review once the return is approved (Review screen, staff only).
// Read only from the projected state: no new domain rules. Text from events is as recorded (already masked by the
// projection); packet text is masked by the screen that renders it. The Form 8879 record's detail is never read.
import type { Finding, RoleKey, Severity, WorkEvent, WorkspaceState } from './contracts';
import type { PacketIndex } from './packet/load';
import { isApplied, retractedSeqs } from './events';
import { needsPartnerSignoff } from './project';
import { partnerThreshold, returnApproved, roleInfo } from './policy';
import { basisText } from './versions';
import { visibleAt } from './clock';
import { isAi, suggestionStatus } from './ai/merge';
import { keyAmounts, signatures, type KeyAmounts } from '@/components/client/signing';

const SEVERITIES: Severity[] = ['blocker', 'check', 'judgment', 'info'];

/** Who did something, and when in the story (the wall-clock save time is not the review's time). */
export interface MemoBy { role: RoleKey; name: string; at: string }
export interface MemoChange {
  key: string; label: string; from: unknown; to: unknown; reason: string; authority: string | null;
  effect: { federal: number; california: number; basis: string } | null;
  by: MemoBy; proposedBy: MemoBy | null;
  signoffs: (MemoBy & { level: string; note: string | null })[];
  /** Lines the change moved through the flow-through; to is null where the figure needs the engine. */
  moved: { key: string; label: string; from: unknown; to: unknown; needsEngine: boolean }[];
}
export interface MemoResolution {
  how: 'cleared' | 'adjusted' | 'partner' | 'note';
  title: string; text: string | null; by: MemoBy | null;
}
export interface MemoData {
  household: string; taxYear: string; version: string; fingerprint: string; storyAt: string; basis: string;
  approval: { kind: 'partner'; name: string; at: string } | { kind: 'record'; signedAt: string };
  figures: KeyAmounts[];
  signatures: { name: string; at: string; record: boolean; stale: boolean }[];
  changes: MemoChange[];
  resolutions: MemoResolution[];
  open: { total: number; counts: Record<Severity, number>; titles: { title: string; severity: Severity }[]; aiNeedsReview: number };
}

const nameOf = (ix: PacketIndex, role: RoleKey) => roleInfo(ix, role)?.name ?? String(role);
const byOf = (ix: PacketIndex, e: Pick<WorkEvent, 'role' | 'storyAt'>): MemoBy => ({ role: e.role, name: nameOf(ix, e.role), at: e.storyAt });
const lineLabel = (ix: PacketIndex, key: string) => ix.line(ix.latest.version, key)?.label ?? key;
const text = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null);

/** Why the memo is not available yet, in the words the button shows; null once the return is approved and current. */
export function memoBlock(ix: PacketIndex, state: WorkspaceState): string | null {
  if (signatures(ix, state).byRecord) return null;
  if (!returnApproved(ix, state.events)) return 'Available once the partner approves the return';
  const approvals = (state.claims.return?.signoffs ?? []).filter((s) => s.level === 'partner');
  if (!approvals.some((s) => !s.stale)) return 'The return changed after approval; approve again';
  return null;
}

/** The memo's content from a staff projection, or null while memoBlock gives a reason. findings: the workspace's
 *  findings, AI suggestions included (they are counted, never treated as blockers). */
export function memoData(ix: PacketIndex, state: WorkspaceState, findings: Finding[]): MemoData | null {
  if (memoBlock(ix, state)) return null;
  const sig = signatures(ix, state);
  const r = retractedSeqs(state.events);
  const live = state.events.filter((e) => e.type !== 'undo' && !r.has(e.seq));
  const storyOf = (seq: number) => state.events.find((e) => e.seq === seq)?.storyAt ?? '';

  const approvalSo = [...(state.claims.return?.signoffs ?? [])].reverse().find((s) => s.level === 'partner' && !s.stale);
  const approval: MemoData['approval'] = approvalSo && !sig.byRecord
    ? { kind: 'partner', name: nameOf(ix, approvalSo.role), at: storyOf(approvalSo.seq) }
    : { kind: 'record', signedAt: sig.spouses.find((s) => s.signed?.record)?.signed?.at ?? '' };

  // Applied line adjustments, each with the derived lines it moved (a line moved by two changes shows under both).
  const claims = Object.values(state.claims);
  const changes: MemoChange[] = claims.filter((c) => c.adjusted && c.claimId.startsWith('line:')).map((c) => {
    const key = c.claimId.slice(5);
    const adjs = c.history.filter((e) => e.type === 'adjustment' && !r.has(e.seq));
    const applied = adjs.filter(isApplied).pop()!;
    const proposal = adjs.filter((e) => !isApplied(e) && e.seq < applied.seq && String(e.payload.value) === String(applied.payload.value)).pop();
    const appliedBy = typeof applied.payload.appliedBy === 'string' ? (applied.payload.appliedBy as RoleKey) : applied.role;
    return {
      key, label: lineLabel(ix, key), from: c.original, to: c.current,
      reason: text(applied.payload.reason) ?? text(proposal?.payload.reason) ?? '',
      authority: text(applied.payload.authority) ?? text(proposal?.payload.authority),
      effect: c.effect ? { federal: c.effect.federal, california: c.effect.california, basis: c.effect.basis } : null,
      by: { ...byOf(ix, applied), role: appliedBy, name: nameOf(ix, appliedBy) },
      proposedBy: proposal && proposal.role !== appliedBy ? byOf(ix, proposal) : null,
      signoffs: c.signoffs.filter((s) => !s.stale).map((s) => ({ role: s.role, name: nameOf(ix, s.role), at: storyOf(s.seq), level: s.level, note: s.note ?? null })),
      moved: claims.filter((d) => (d.derived || d.needsEngine) && d.from?.includes(key)).map((d) => {
        const k = d.claimId.slice(5);
        return { key: k, label: lineLabel(ix, k), from: d.original, to: d.needsEngine ? null : d.current, needsEngine: !!d.needsEngine };
      }),
    };
  });

  // How each blocker was resolved, in the projection's own order: a finding cleared (that wins, as on Checks), a finding
  // whose claim was adjusted, a change over the partner threshold signed by the partner, a blocking note resolved.
  const resolutions: MemoResolution[] = [];
  const checks = findings.filter((f) => !isAi(f) && visibleAt(f.firstVisibleAt, state.storyAt));
  for (const f of checks.filter((x) => x.severity === 'blocker')) {
    const cl = [...live].reverse().find((e) => e.type === 'finding_cleared' && e.claimId === 'finding:' + f.id);
    if (cl) { resolutions.push({ how: 'cleared', title: f.title, text: text(cl.payload.reason), by: byOf(ix, cl) }); continue; }
    const adj = f.claims.find((id) => state.claims[id]?.adjusted);
    if (adj) resolutions.push({ how: 'adjusted', title: f.title, text: adj.startsWith('line:') ? lineLabel(ix, adj.slice(5)) : adj, by: null });
  }
  const threshold = partnerThreshold(ix);
  for (const c of claims) {
    if (!c.adjusted || !c.effect || !threshold || needsPartnerSignoff(ix, c)) continue;
    if (Math.abs(c.effect.federal) <= threshold && Math.abs(c.effect.california) <= threshold) continue;
    const so = [...c.signoffs].reverse().find((s) => s.level === 'partner' && !s.stale)!;
    const label = c.claimId.startsWith('line:') ? lineLabel(ix, c.claimId.slice(5)) : c.claimId;
    resolutions.push({ how: 'partner', title: label, text: so.note ?? null, by: { role: so.role, name: nameOf(ix, so.role), at: storyOf(so.seq) } });
  }
  for (const n of live.filter((e) => e.type === 'note_resolved')) {
    const note = live.find((e) => e.seq === Number(n.payload.noteSeq) && e.type === 'review_note');
    if (note?.payload.blocking === true) resolutions.push({ how: 'note', title: String(note.payload.text ?? ''), text: null, by: byOf(ix, n) });
  }

  // Still open at story time: our checks not cleared (a cleared rule matching Checks), and AI suggestions not acted on.
  const openF = checks.filter((f) => !live.some((e) => e.type === 'finding_cleared' && e.claimId === 'finding:' + f.id) && !f.claims.some((id) => state.claims[id]?.adjusted))
    .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
  const counts = Object.fromEntries(SEVERITIES.map((k) => [k, openF.filter((f) => f.severity === k).length])) as Record<Severity, number>;
  const aiNeedsReview = findings.filter((f) => isAi(f) && visibleAt(f.firstVisibleAt, state.storyAt) && suggestionStatus(state.events, f.id).status === 'needs_review').length;

  const people = (ix.packet.household.people ?? []).filter((p) => p.role === 'taxpayer' || p.role === 'spouse');
  return {
    household: people.map((p) => String(p.name)).join(' and '),
    taxYear: String(ix.packet.household.tax_year ?? ''),
    version: ix.latest.version, fingerprint: sig.fingerprint, storyAt: state.storyAt,
    basis: basisText(ix.latest.version, state),
    approval,
    figures: keyAmounts(ix, state),
    signatures: sig.spouses.filter((s) => s.signed).map((s) => ({ name: s.name, at: s.signed!.storyAt, record: !!s.signed!.record, stale: s.signed!.stale })),
    changes, resolutions,
    open: { total: openF.length, counts, titles: openF.slice(0, 10).map((f) => ({ title: f.title, severity: f.severity })), aiNeedsReview },
  };
}
