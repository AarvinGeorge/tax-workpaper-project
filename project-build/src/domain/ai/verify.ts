// Grounding: an AI suggestion is shown only when every quote appears verbatim on the page it cites (whitespace
// normalised, case-sensitive), its authority is on the vetted list, its rationale is short, and it carries nothing
// SSN-shaped. The reader's confidence never skips any of this.
import type { PacketIndex } from '../packet/load';
import type { PacketDocument } from '../packet/types';
import { isSupersededDoc } from '../docs';
import { AI_AUTHORITIES, type AiEvidence, type AiPayload, type VerifiedSuggestion } from './contract';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
/** 123-45-6789, 123 45 6789 or nine digits in a row. */
const SSN_SHAPED = /(?<![\d-])\d{3}[- ]?\d{2}[- ]?\d{4}(?![\d-])/;
const MAX_WORDS = 30;
/** A quote proves something when it carries content: at least 8 characters, and either 3 words or more or a digit (a
 *  line item with its amount is evidence; a bare label such as "Tax ID" is on every form). */
const MIN_QUOTE_CHARS = 8;
const MIN_WORDS_WITHOUT_DIGIT = 3;
export const longEnough = (quote: string) => {
  const q = norm(quote);
  return q.length >= MIN_QUOTE_CHARS && (/\d/.test(q) || q.split(' ').length >= MIN_WORDS_WITHOUT_DIGIT);
};

const supCache = new WeakMap<PacketIndex, Map<string, string | null>>();
const corrected = (d: PacketDocument) => d.marked_corrected === true;
const sameSeries = (a: PacketDocument, b: PacketDocument) => !!a.issuer && a.issuer === b.issuer && a.document_type === b.document_type;

/** Each superseded document id -> the id of the document that replaced it (null when none is identifiable).
 *  Superseded: listed in the latest version's documents_superseded (the same rule the Documents screen uses), or an
 *  earlier document of the same issuer and type as one marked corrected. Successor: the next document of the same issuer
 *  and type received after it, a corrected one first. */
export function supersession(ix: PacketIndex): Map<string, string | null> {
  const hit = supCache.get(ix);
  if (hit) return hit;
  const docs = ix.packet.documents;
  const ids = new Set(docs.filter((d) => isSupersededDoc(ix, d.id)).map((d) => d.id));
  for (const c of docs.filter(corrected)) for (const d of docs) if (d.id !== c.id && sameSeries(d, c) && d.received_at < c.received_at) ids.add(d.id);
  const m = new Map<string, string | null>();
  for (const id of ids) {
    const d = ix.docById.get(id);
    const later = d ? docs.filter((x) => x.id !== id && sameSeries(x, d) && x.received_at > d.received_at && !ids.has(x.id)) : [];
    later.sort((a, b) => Number(corrected(b)) - Number(corrected(a)) || a.received_at.localeCompare(b.received_at));
    m.set(id, later[0]?.id ?? null);
  }
  supCache.set(ix, m);
  return m;
}

/** The first page of doc whose printed text holds the quote (whitespace normalised), or null. */
function pageWith(ix: PacketIndex, docId: string, quote: string): number | null {
  const q = norm(quote);
  return ix.docById.get(docId)?.pages.find((p) => norm(p.printed_content).includes(q))?.page ?? null;
}

/** Evidence from superseded documents: quotes also printed on the successor are re-pointed to the successor's page.
 *  When every cited document is superseded and some quote is not on the successor, the suggestion is held back. */
function checkSupersession(ix: PacketIndex, evidence: AiEvidence[]): { evidence: AiEvidence[]; problem: string | null } {
  const sup = supersession(ix);
  const moved = evidence.map((e) => {
    if (!sup.has(e.doc)) return e;
    const next = sup.get(e.doc);
    const page = next ? pageWith(ix, next, e.quote) : null;
    return next && page ? { doc: next, page, quote: e.quote } : e;
  });
  const stuck = moved.filter((e) => sup.has(e.doc));
  if (!evidence.every((e) => sup.has(e.doc)) || stuck.length === 0) return { evidence: moved, problem: null };
  const pairs = [...new Set(stuck.map((e) => e.doc))].map((d) => `${d.slice(0, 40)}, ${sup.get(d) ? `replaced by ${sup.get(d)}` : 'no replacement found'}`);
  return { evidence, problem: `Evidence only from a superseded document (${pairs.join('; ')})` };
}

export function verifySuggestions(ix: PacketIndex, payload: AiPayload): VerifiedSuggestion[] {
  return payload.suggestions.map((s) => {
    const problems: string[] = [];
    let grounded = true;
    s.evidence.forEach((e, i) => {
      const n = i + 1;
      const doc = e.doc.slice(0, 40);
      const d = ix.docById.get(e.doc);
      if (!d) { grounded = false; problems.push(`Quote ${n}: no document ${doc} in the packet.`); return; }
      const pg = d.pages.find((p) => p.page === e.page);
      if (!pg) { grounded = false; problems.push(`Quote ${n}: no page ${e.page} in ${doc}.`); return; }
      if (!norm(pg.printed_content).includes(norm(e.quote))) { grounded = false; problems.push(`Quote ${n}: quote not found on ${doc} page ${e.page}.`); }
    });
    if (!s.evidence.some((e) => longEnough(e.quote))) problems.push('Quote too short to prove anything');
    const sup = grounded ? checkSupersession(ix, s.evidence) : { evidence: s.evidence, problem: null };
    if (sup.problem) problems.push(sup.problem);
    if (s.authority !== null && !(AI_AUTHORITIES as readonly string[]).includes(s.authority)) problems.push('Authority not in the vetted list.');
    if (norm(s.rationale).split(' ').length > MAX_WORDS) problems.push(`Rationale is over ${MAX_WORDS} words.`);
    const text = [s.id, s.otherKind ?? '', s.rationale, s.authority ?? '', ...s.claims, ...s.evidence.flatMap((e) => [e.doc, e.quote])];
    if (text.some((t) => SSN_SHAPED.test(t))) problems.push('Contains SSN-shaped text.');
    return { ...s, evidence: sup.evidence, grounded, problems };
  });
}

/** Shown on screen: grounded with no problems. */
export const isShown = (v: VerifiedSuggestion) => v.grounded && v.problems.length === 0;
