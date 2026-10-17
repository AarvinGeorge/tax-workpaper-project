// Documents: where each one landed on the latest return, or the typed reason it did not; and the simulated page model.
// Everything is computed from the packet's fields; no document id is named here.
import type { DocLanding, SimPage } from './contracts';
import type { PacketIndex } from './packet/load';
import type { PacketDocument } from './packet/types';

type Reason = NonNullable<DocLanding['reason']>;

/** First federal e-file acceptance (the as-filed moment). Same rule as clock.frozenAt; computed here to keep lanes independent. */
function firstFederalAcceptance(ix: PacketIndex): string | null {
  const efile = (ix.packet.tax_agency_records.efile as { date: string; jurisdiction: string; status: string }[] | undefined) || [];
  const accepted = efile.filter((e) => e.jurisdiction === 'federal' && e.status === 'accepted').map((e) => e.date).sort();
  return accepted[0] ?? null;
}

const fmtDate = (iso: string) => iso.slice(0, 10);

/** Share of this document's values (field + value) that another document repeats, for duplicate detection. */
function sameValuesShare(ix: PacketIndex, a: PacketDocument, b: PacketDocument): number {
  const av = ix.valuesByDoc.get(a.id) || [];
  const bv = ix.valuesByDoc.get(b.id) || [];
  if (!av.length || !bv.length) return 0;
  const bset = new Set(bv.map((v) => `${v.page}|${v.field}|${JSON.stringify(v.value)}`));
  return av.filter((v) => bset.has(`${v.page}|${v.field}|${JSON.stringify(v.value)}`)).length / av.length;
}

function returnTaxYear(ix: PacketIndex): number | null {
  const y = ix.packet.household.tax_year;
  return typeof y === 'number' ? y : null;
}

function reasonFor(ix: PacketIndex, d: PacketDocument, landed: Set<string>, referenced: Set<string>, frozen: string | null): Reason {
  const latest = ix.latest;
  if (latest.documents_superseded.includes(d.id)) {
    const first = ix.versions.find((rv) => rv.documents_superseded.includes(d.id)) ?? latest;
    return { code: 'superseded', text: `Superseded from ${first.version} on: ${first.trigger}` };
  }
  if (d.received_at > latest.computed_at) {
    if (frozen && d.received_at >= frozen) {
      return { code: 'post_filing', text: `Received ${fmtDate(d.received_at)}, after the return was accepted on ${fmtDate(frozen)}.` };
    }
    return { code: 'after_last_computation', text: `Received ${fmtDate(d.received_at)}, after the last engine run (${latest.version}, ${fmtDate(latest.computed_at)}). The engine has not read it.` };
  }
  const twin = ix.packet.documents.find((o) => o.id !== d.id && landed.has(o.id) && o.document_type === d.document_type
    && o.issuer === d.issuer && o.belongs_to === d.belongs_to && sameValuesShare(ix, d, o) >= 0.8);
  if (twin) return { code: 'duplicate', text: `Duplicate of ${twin.id} (${twin.title}): same issuer and the same values; counted once.` };
  if (d.extraction.status === 'not_extracted') {
    return { code: 'not_extracted', text: `Not extracted by the pipeline. ${d.extraction.reason ?? ''}`.trim() };
  }
  const year = returnTaxYear(ix);
  if (year !== null && d.tax_year !== null && d.tax_year < year) {
    return { code: 'prior_year', text: `Tax year ${d.tax_year} document; no ${year} line cites its values.` };
  }
  if (d.extraction.status === 'partial') {
    return { code: 'partial', text: `Partly extracted and no line cites it. ${d.extraction.reason ?? ''}`.trim() };
  }
  if (referenced.has(d.id) || latest.documents_used.includes(d.id)) {
    return { code: 'corroborates', text: `Read by the engine (${latest.version}) but no line takes a value from it; it supports other documents.` };
  }
  return { code: 'unused', text: 'No line, diagnostic or record uses this document.' };
}

/** Every document with where it landed on the latest version, or why not. `asOf` controls visibility only. */
export function documentLanding(ix: PacketIndex, asOf: string): DocLanding[] {
  const latest = ix.latest;
  const frozen = firstFederalAcceptance(ix);
  const landed = new Set(ix.packet.documents.filter((d) => ix.linesCitingDoc(latest.version, d.id).length > 0).map((d) => d.id));
  // documents referenced by the latest diagnostics or by the timeline, directly or through one of their values
  const referenced = new Set<string>();
  const note = (s: string) => {
    const v = ix.valueById.get(s);
    if (v) referenced.add(v.document_id);
    else if (ix.docById.has(s)) referenced.add(s);
    else if (s.startsWith('doc:')) referenced.add(s.slice(4).split('#')[0]);
  };
  for (const dg of latest.diagnostics) for (const s of dg.refs || []) note(s);
  for (const t of ix.packet.timeline) for (const s of t.refs || []) note(s);

  return ix.packet.documents.map((d) => {
    const lines = ix.linesCitingDoc(latest.version, d.id);
    const values = ix.valuesByDoc.get(d.id) || [];
    const valueIds = new Set(values.map((v) => v.id));
    const used = new Set<string>();
    for (const l of lines) for (const s of l.sources) if (valueIds.has(s)) used.add(s);
    const isLanded = landed.has(d.id);
    return {
      docId: d.id, title: d.title, type: d.document_type, issuer: d.issuer ?? null, owner: d.belongs_to ?? null, receivedAt: d.received_at,
      status: isLanded ? 'landed' : 'not_landed',
      landedLines: lines.map((l) => l.key), usedValues: used.size, totalValues: values.length,
      reason: isLanded ? null : reasonFor(ix, d, landed, referenced, frozen),
      visible: d.received_at <= asOf,
    } satisfies DocLanding;
  });
}

/** A rendered representation of one page: the printed content and the values read from it, with synthetic positions. */
export function simulatedPage(ix: PacketIndex, docId: string, page: number): SimPage {
  const d = ix.docById.get(docId);
  if (!d) throw new Error(`Unknown document ${docId}`);
  const pg = d.pages.find((x) => x.page === page);
  if (!pg) throw new Error(`Document ${docId} has no page ${page}`);
  const fields = (ix.valuesByDoc.get(docId) || []).filter((v) => v.page === page).map((v) => ({
    valueId: v.id, label: v.label, field: v.field, text: v.text_as_read, valueType: v.value_type,
    position: v.position ?? null, confidence: v.confidence,
  }));
  return { docId: d.id, page: pg.page, pageCount: d.page_count, title: d.title, issuer: d.issuer ?? null, printed: pg.printed_content, fields };
}
