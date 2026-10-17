import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { documentLanding, simulatedPage } from '@/domain/docs';
import { alteredPacket } from '../fixtures/altered';
import type { Packet } from '@/domain/packet/types';

const p = loadPacket();
const ix = indexPacket(p);
const FAR_FUTURE = '2100-01-01T00:00:00Z';
const byId = (rows: ReturnType<typeof documentLanding>) => new Map(rows.map((r) => [r.docId, r]));
const clone = (): Packet => JSON.parse(JSON.stringify(p));

describe('documentLanding on the real packet', () => {
  const rows = documentLanding(ix, FAR_FUTURE);
  const m = byId(rows);

  it('returns every document, each with exactly one of landed / reason', () => {
    expect(rows.length).toBe(p.documents.length);
    for (const r of rows) {
      expect((r.status === 'landed') !== (r.reason !== null), r.docId).toBe(true);
      if (r.reason) expect(r.reason.text.length, r.docId).toBeGreaterThan(0);
    }
  });

  it('a document cited by any latest-version line source is landed, with those lines', () => {
    for (const d of p.documents) {
      const cited = ix.linesCitingDoc(ix.latest.version, d.id);
      if (cited.length) {
        expect(m.get(d.id)!.status, d.id).toBe('landed');
        expect(m.get(d.id)!.landedLines.sort()).toEqual(cited.map((l) => l.key).sort());
        expect(m.get(d.id)!.usedValues).toBeGreaterThan(0);
      } else {
        expect(m.get(d.id)!.status, d.id).toBe('not_landed');
      }
      expect(m.get(d.id)!.totalValues).toBe((ix.valuesByDoc.get(d.id) || []).length);
    }
    // both outcomes occur, so neither assertion above is vacuous
    expect(rows.some((r) => r.status === 'landed')).toBe(true);
    expect(rows.some((r) => r.status === 'not_landed')).toBe(true);
  });

  it('documents_superseded of the latest version gives superseded', () => {
    expect(ix.latest.documents_superseded.length).toBeGreaterThan(0);
    for (const id of ix.latest.documents_superseded) expect(m.get(id)!.reason?.code).toBe('superseded');
  });

  it('extraction.status not_extracted gives not_extracted when nothing earlier applies', () => {
    const d = p.documents.find((x) => x.extraction.status === 'not_extracted' && x.received_at <= ix.latest.computed_at)!;
    expect(m.get(d.id)!.reason).toEqual({ code: 'not_extracted', text: expect.stringContaining(d.extraction.reason!) });
  });

  it('received after the latest computed_at gives after_last_computation or post_filing', () => {
    const late = p.documents.filter((d) => d.received_at > ix.latest.computed_at);
    expect(late.length).toBeGreaterThan(0);
    for (const d of late) expect(['after_last_computation', 'post_filing']).toContain(m.get(d.id)!.reason?.code);
    const codes = new Set(late.map((d) => m.get(d.id)!.reason?.code));
    expect(codes.has('after_last_computation')).toBe(true);
    expect(codes.has('post_filing')).toBe(true);
  });

  it('a second image of a landed document with matching values is a duplicate', () => {
    const dups = rows.filter((r) => r.reason?.code === 'duplicate');
    expect(dups.length).toBeGreaterThan(0);
    for (const r of dups) expect(r.reason!.text).toMatch(/D\d+/);
  });

  it('owner, issuer, type, received copied from the document', () => {
    const d = p.documents[0];
    expect(m.get(d.id)).toMatchObject({ title: d.title, type: d.document_type, issuer: d.issuer, owner: d.belongs_to, receivedAt: d.received_at });
  });

  it('visible=false when received after asOf', () => {
    const asOf = ix.latest.computed_at;
    const r = byId(documentLanding(ix, asOf));
    for (const d of p.documents) expect(r.get(d.id)!.visible, d.id).toBe(d.received_at <= asOf);
    expect([...r.values()].some((x) => !x.visible)).toBe(true);
  });
});

describe('documentLanding on altered copies', () => {
  it('partial drives partial when an uncited partial document exists', () => {
    const q = clone();
    const d = q.documents.find((x) => x.extraction.status === 'partial' && !q.return_versions.at(-1)!.documents_superseded.includes(x.id))!;
    // stop every latest line citing it
    const vals = new Set(q.extracted_values.filter((v) => v.document_id === d.id).map((v) => v.id));
    for (const l of q.return_versions.at(-1)!.lines) l.sources = l.sources.filter((s) => !vals.has(s));
    const r = byId(documentLanding(indexPacket(q), FAR_FUTURE)).get(d.id)!;
    expect(r.reason?.code).toBe('partial');
  });

  it('removing the superseded list makes that document lose superseded', () => {
    const q = clone();
    const id = q.return_versions.at(-1)!.documents_superseded[0];
    q.return_versions.at(-1)!.documents_superseded = [];
    expect(byId(documentLanding(indexPacket(q), FAR_FUTURE)).get(id)!.reason?.code).not.toBe('superseded');
  });

  it('works on the renamed, form-removed packet', () => {
    const ax = indexPacket(alteredPacket());
    const rows = documentLanding(ax, FAR_FUTURE);
    expect(rows.length).toBe(ax.packet.documents.length);
    for (const r of rows) expect((r.status === 'landed') !== (r.reason !== null)).toBe(true);
  });
});

describe('simulatedPage', () => {
  it('returns printed content plus the page values with positions', () => {
    const v = p.extracted_values.find((x) => x.position)!;
    const sp = simulatedPage(ix, v.document_id, v.page);
    const d = ix.docById.get(v.document_id)!;
    expect(sp).toMatchObject({ docId: d.id, page: v.page, pageCount: d.page_count, title: d.title, issuer: d.issuer });
    expect(sp.printed).toBe(d.pages.find((x) => x.page === v.page)!.printed_content);
    const expected = p.extracted_values.filter((x) => x.document_id === d.id && x.page === v.page);
    expect(sp.fields.map((f) => f.valueId).sort()).toEqual(expected.map((x) => x.id).sort());
    const f = sp.fields.find((x) => x.valueId === v.id)!;
    expect(f).toMatchObject({ position: v.position, confidence: v.confidence, valueType: v.value_type, field: v.field, label: v.label, text: v.text_as_read });
  });

  it('a page the pipeline did not read has printed content and no fields', () => {
    const d = p.documents.find((x) => x.extraction.status === 'not_extracted')!;
    const sp = simulatedPage(ix, d.id, d.pages[0].page);
    expect(sp.printed).toBe(d.pages[0].printed_content);
    expect(sp.fields).toEqual([]);
  });

  it('throws on an unknown document or page', () => {
    expect(() => simulatedPage(ix, 'D-none', 1)).toThrow();
    expect(() => simulatedPage(ix, p.documents[0].id, 9999)).toThrow();
  });
});
