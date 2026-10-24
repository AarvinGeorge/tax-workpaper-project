// When a referenced fact entered the story: shared by the checks (a finding's first visible time) and the proofs (no
// receipt rests on a record the story has not reached yet).
import type { PacketIndex } from '../packet/load';

export const asIso = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00Z` : s);

function pointer(root: unknown, ptr: string): unknown[] {
  const chain: unknown[] = [root];
  let cur: unknown = root;
  for (const raw of ptr.split('/').slice(1)) {
    const k = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (cur === null || typeof cur !== 'object') return chain;
    cur = (cur as Record<string, unknown>)[k];
    chain.push(cur);
  }
  return chain;
}

/** When a referenced fact entered the story (document received, answer given, message sent, record pulled). */
export function refTime(ix: PacketIndex, ref: string): string | null {
  const p = ix.packet;
  if (ref.startsWith('ev-')) {
    const v = ix.valueById.get(ref);
    return v ? ix.docById.get(v.document_id)?.received_at ?? null : null;
  }
  if (ref.startsWith('doc:')) return ix.docById.get(ref.slice(4).split('#')[0])?.received_at ?? null;
  if (ref.startsWith('qa-')) return p.client.questionnaire.find((q) => q.id === ref)?.answered_at ?? null;
  if (ref.startsWith('msg-')) return p.client.messages.find((m) => m.id === ref)?.sent_at ?? null;
  if (ref.startsWith('call-')) return (p.client.call_notes.find((c) => c.id === ref)?.date as string | undefined) ?? null;
  if (ref.startsWith('timeline:')) return p.timeline.find((t) => t.id === ref.slice(9))?.at ?? null;
  if (ref.startsWith('agency:')) {
    const chain = pointer(p.tax_agency_records, ref.slice(7)).reverse();
    for (const node of chain) {
      const asOf = node && typeof node === 'object' ? (node as Record<string, unknown>).as_of : undefined;
      if (typeof asOf === 'string') return asIso(asOf);
    }
  }
  return null;
}

