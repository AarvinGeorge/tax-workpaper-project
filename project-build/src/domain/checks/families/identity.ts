// Family: identity against documents and the prior year. Every SSN the household entered, against every document
// that prints one for the same person (prior-year return, Social Security card, W-2s). Wording shows last 4 only.
import type { PacketIndex } from '../../packet/load';
import { type Check, type Draft, digits, docClaim, lineClaim } from '../util';

const FAMILY = 'Identity vs documents and prior year';

type Person = { id: string; role: string; name: string; ssn?: string };

function personFor(ix: PacketIndex, belongs: string | null, text: string, at: number): Person | undefined {
  const people = ix.packet.household.people as Person[];
  if (belongs?.startsWith('dependent:')) return people.find((p) => p.id === belongs.slice(10));
  // A document for one person can still print another's number, so the nearest name before the number decides.
  let best: Person | undefined; let bestAt = -1;
  for (const p of people) {
    const i = text.lastIndexOf(p.name, at);
    if (i > bestAt) { best = p; bestAt = i; }
  }
  if (best) return best;
  if (belongs === 'taxpayer' || belongs === 'spouse') return people.find((p) => p.role === belongs);
  return undefined;
}

export const identityVsDocuments: Check = {
  id: 'CHK-IDENTITY-VS-DOCUMENTS',
  family: FAMILY,
  run(ix) {
    const people = ix.packet.household.people as Person[];
    const hits = new Map<string, { evidence: Set<string>; earliest: string; docs: Set<string>; shown: Set<string> }>();
    const note = (p: Person, ref: string, docId: string, printed: string) => {
      const h = hits.get(p.id) ?? { evidence: new Set<string>(), earliest: ref, docs: new Set<string>(), shown: new Set<string>() };
      h.evidence.add(ref); h.docs.add(docId); h.shown.add(digits(printed).slice(-4));
      const d = ix.docById.get(docId); const e = ix.docById.get(h.earliest.startsWith('doc:') ? h.earliest.slice(4) : ix.valueById.get(h.earliest)?.document_id ?? '');
      if (d && e && d.received_at < e.received_at) h.earliest = ref;
      hits.set(p.id, h);
    };
    for (const d of ix.packet.documents) {
      for (const pg of d.pages) {
        const text = pg.printed_content;
        for (const m of text.matchAll(/\b(?:\d{3}|X{3})-(?:\d{2}|X{2})-(\d{4})\b/g)) {
          const p = personFor(ix, d.belongs_to, text, m.index!);
          if (!p?.ssn) continue;
          const full = /^\d/.test(m[0]);
          const mismatch = full ? digits(m[0]) !== digits(p.ssn) : m[1] !== digits(p.ssn).slice(-4);
          if (!mismatch) continue;
          const v = (ix.valuesByDoc.get(d.id) || []).find((x) => x.value_type === 'ssn' && x.page === pg.page && digits(x.value).slice(-4) === m[1]);
          note(p, v ? v.id : `doc:${d.id}#page${pg.page}`, d.id, m[0]);
        }
      }
    }
    const out: Draft[] = [];
    for (const [pid, h] of hits) {
      const p = people.find((x) => x.id === pid)!;
      const lines = ix.latest.lines.filter((l) => (l.sources || []).includes(`household:${pid}`)).map((l) => lineClaim(l.key));
      const docs = [...h.docs].map((id) => ix.docById.get(id)!).sort((a, b) => a.received_at.localeCompare(b.received_at));
      out.push({
        title: `${p.name}: SSN in the organizer does not match the documents`,
        claims: lines.length ? lines : [docClaim(docs[0].id)],
        evidence: [`household:${pid}`, ...h.evidence],
        trigger: [h.earliest],
        stopsEfile: true,
        explanation: `The organizer number for ${p.name} ends ${digits(p.ssn).slice(-4)}; ${docs.map((d) => d.title).join(' and ')} print${docs.length === 1 ? 's' : ''} `
          + `a number ending ${[...h.shown].join(', ')}. A dependent or taxpayer number that does not match the IRS record rejects the e-file. `
          + `Confirm against the Social Security card before filing.`,
        plain: `The Social Security number we have for ${p.name} does not match the one on your documents. Please send a photo of the card.`,
      });
    }
    return out;
  },
};

export const identityChecks: Check[] = [identityVsDocuments];
