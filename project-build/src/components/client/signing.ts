// Client approval and e-file signature, and the client's copy: pure functions over the packet and a workspace state.
// Amounts are the finalized return (latest version plus applied adjustments), read through finalized(); never v3 alone.
// Line keys are found by label in the latest version; nothing here names a key or an amount.
import type { RoleKey, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { finalized } from '@/domain/versions';
import { normValue } from '@/domain/project';
import { retractedSeqs } from '@/domain/events';
import { returnApproved, roles, SIGN_FORMS } from '@/domain/policy';
import { visibleAt } from '@/domain/clock';
import { humanize } from '@/domain/labels';

export { SIGN_FORMS };

/** A short fingerprint (FNV-1a, 8 hex) of every finalized line: any applied change to the return changes it. */
export function returnFingerprint(ix: PacketIndex, staffState: WorkspaceState): string {
  const text = finalized(ix, staffState).map((f) => `${f.key}=${normValue(f.value)}`).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export interface Amount { key: string; label: string; value: number }
export interface KeyAmounts {
  jurisdiction: string; form: string;
  income?: Amount; totalTax?: Amount; payments?: Amount; result?: Amount & { kind: 'refund' | 'owe' };
}

const num = (x: unknown): number | null => {
  const n = typeof x === 'number' ? x : Number(String(x ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && String(x ?? '').trim() !== '' ? n : null;
};

/** Per jurisdiction (in the order the latest version lists them): income, total tax, total payments, and the refund or
 *  balance due, from the main form (the one carrying the "Total tax" line). Values are finalized. */
export function keyAmounts(ix: PacketIndex, staffState: WorkspaceState): KeyAmounts[] {
  const fin = new Map(finalized(ix, staffState).map((f) => [f.key, f.value]));
  const lines = ix.latest.lines;
  const mains = lines.filter((l) => /^total tax$/i.test(l.label.trim()));
  const out: KeyAmounts[] = [];
  for (const main of mains) {
    if (out.some((o) => o.jurisdiction === main.jurisdiction)) continue;
    const onForm = lines.filter((l) => l.form === main.form);
    const pick = (...res: RegExp[]): Amount | undefined => {
      for (const re of res) {
        const l = onForm.find((x) => re.test(x.label.trim()));
        const v = l ? num(fin.get(l.key)) : null;
        if (l && v !== null) return { key: l.key, label: l.label, value: v };
      }
      return undefined;
    };
    const place = humanize(main.jurisdiction);
    const row: KeyAmounts = {
      jurisdiction: main.jurisdiction, form: main.form,
      income: pick(/^adjusted gross income$/i, new RegExp(`^${place} AGI$`, 'i')),
      totalTax: pick(/^total tax$/i),
      payments: pick(/^total payments$/i),
    };
    const owe = pick(/^(amount you owe|balance due|amount due|tax due)\b/i);
    const refund = pick(/^(overpaid tax|overpayment|amount overpaid|refund)\b/i);
    if (owe && owe.value > 0) row.result = { ...owe, kind: 'owe' };
    else if (refund && refund.value > 0) row.result = { ...refund, kind: 'refund' };
    out.push(row);
  }
  return out;
}

export interface SpouseSignature {
  key: RoleKey; name: string;
  /** record: the signature is the packet timeline's Form 8879 event (the firm's record), not a workspace event. */
  signed?: { seq: number; at: string; storyAt: string; value: string; stale: boolean; record?: boolean };
}
/** byRecord: the approval is known from the firm's record (the clients signed Form 8879, which follows the partner's
 *  approval), not from a workspace event. */
export interface SigningState { approved: boolean; byRecord: boolean; fingerprint: string; spouses: SpouseSignature[] }

/** The packet timeline's Form 8879 event once story time has reached it: its time only. Its detail text holds both
 *  spouses' PINs and is never read here. */
export function recordSignedAt(ix: PacketIndex, storyAt: string): string | null {
  return ix.packet.timeline.filter((t) => /8879/.test(t.event) && visibleAt(t.at, storyAt)).map((t) => t.at).sort()[0] ?? null;
}

/** Who has signed, when, and whether the return changed since (stale): from the workspace's own client_signature
 *  events, or else from the firm's record (the timeline's 8879 event, both spouses) once story time reaches it. fp is
 *  the current fingerprint, computed from the staff projection: a client's own view does not carry the adjustments.
 *  Review's Approval box, staff signing and the client's Filing page all read this one answer. */
export function signatures(ix: PacketIndex, state: WorkspaceState, fp: string = returnFingerprint(ix, state)): SigningState {
  const r = retractedSeqs(state.events);
  const live = state.events.filter((e) => e.type === 'client_signature' && !r.has(e.seq));
  const recordAt = recordSignedAt(ix, state.storyAt);
  const spouses = roles(ix).filter((x) => x.kind === 'client').map((c) => {
    const mine = live.filter((e) => e.role === c.key);
    const last = mine[mine.length - 1];
    const s: SpouseSignature = { key: c.key, name: c.name };
    if (last) {
      const value = String(last.payload.value ?? '');
      s.signed = { seq: last.seq, at: last.at, storyAt: last.storyAt, value, stale: value !== fp };
    } else if (recordAt) {
      s.signed = { seq: 0, at: recordAt, storyAt: recordAt, value: '', stale: false, record: true };
    }
    return s;
  });
  const inWorkspace = returnApproved(ix, state.events);
  return { approved: inWorkspace || !!recordAt, byRecord: !inWorkspace && !!recordAt, fingerprint: fp, spouses };
}

/** The client's copy: null until federal acceptance at story time; then the as-filed key amounts per jurisdiction with
 *  the date each was accepted (tax_agency_records.efile). amountsState is the staff projection (finalized values). */
export function clientCopy(ix: PacketIndex, state: WorkspaceState, amountsState: WorkspaceState = state): (KeyAmounts & { acceptedAt: string | null })[] | null {
  if (!state.frozen) return null;
  const efile = ((ix.packet.tax_agency_records as { efile?: { date: string; jurisdiction: string; status: string }[] }).efile ?? [])
    .filter((e) => e.status === 'accepted' && visibleAt(e.date, state.storyAt))
    .sort((a, b) => a.date.localeCompare(b.date));
  return keyAmounts(ix, amountsState).map((k) => ({ ...k, acceptedAt: efile.find((e) => e.jurisdiction === k.jurisdiction)?.date ?? null }));
}
