import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { resolveRef } from '@/domain/refs';
import { alteredPacket, REMOVED_FORM } from '../fixtures/altered';

const p = loadPacket();
const ix = indexPacket(p);

function allSources(): string[] {
  const s = new Set<string>();
  for (const rv of p.return_versions) {
    for (const l of rv.lines) for (const x of l.sources || []) s.add(x);
    for (const d of rv.diagnostics) for (const x of d.refs || []) s.add(x);
  }
  return [...s];
}

describe('resolveRef over the real packet', () => {
  it('resolves every line source and diagnostic ref to a typed kind; only free text stays text', () => {
    const srcs = allSources();
    expect(srcs.length).toBeGreaterThan(100);
    const kinds = srcs.map((s) => resolveRef(ix, s).kind);
    const textCount = kinds.filter((k) => k === 'text').length;
    expect(textCount).toBe(srcs.filter((s) => s.includes(' ')).length);
  });

  it('every timeline ref resolves to a typed kind', () => {
    for (const t of p.timeline) for (const r of t.refs) expect(resolveRef(ix, r).kind, r).not.toBe('text');
  });

  it('free text stays text (the zero above can be non-zero)', () => {
    expect(resolveRef(ix, 'see the client email').kind).toBe('text');
    expect(resolveRef(ix, 'ev-99999').kind).toBe('text');
  });

  it('ev- value: document, page, position, confidence, value type, raw text', () => {
    const v = p.extracted_values.find((x) => x.position)!;
    const r = resolveRef(ix, v.id);
    expect(r).toMatchObject({ kind: 'value', docId: v.document_id, page: v.page, position: v.position, confidence: v.confidence, valueType: v.value_type, value: v.value, text: v.text_as_read });
    expect(r.sourceKind).toBeDefined();
  });

  it('identifiers come back raw (masking is the API job)', () => {
    const v = p.extracted_values.find((x) => x.value_type === 'ssn')!;
    expect(resolveRef(ix, v.id).value).toBe(v.value);
  });

  it('source kind: firm upload, IRS record, client own record, third-party form, prior year', () => {
    const kindOfDoc = (pred: (d: (typeof p.documents)[number]) => boolean) => resolveRef(ix, p.documents.find(pred)!.id).sourceKind;
    expect(kindOfDoc((d) => d.uploaded_by === 'firm' && !/Internal Revenue/.test(d.issuer || ''))).toBe('Firm record');
    expect(kindOfDoc((d) => d.document_type === 'irs_transcript')).toBe('IRS record');
    expect(kindOfDoc((d) => d.document_type === 'books_profit_loss')).toBe("Client's own record");
    expect(kindOfDoc((d) => d.document_type === 'W-2')).toBe('Third-party form');
    expect(kindOfDoc((d) => d.document_type === 'prior_year_return')).toBe('Prior year');
    expect(kindOfDoc((d) => d.document_type === 'payment_confirmation' && /Franchise/.test(d.issuer || ''))).toBe('FTB record');
  });

  it('D ids and doc:<id> resolve to the document', () => {
    const d = p.documents[0];
    expect(resolveRef(ix, d.id)).toMatchObject({ kind: 'document', docId: d.id, label: d.title });
    expect(resolveRef(ix, `doc:${d.id}`)).toMatchObject({ kind: 'document', docId: d.id });
  });

  it('doc:<id>#page<n> resolves to that page with its printed content', () => {
    const d = p.documents.find((x) => x.extraction.status !== 'extracted' && x.pages.length > 0)!;
    const pg = d.pages[d.pages.length - 1];
    const r = resolveRef(ix, `doc:${d.id}#page${pg.page}`);
    expect(r).toMatchObject({ kind: 'page', docId: d.id, page: pg.page, text: pg.printed_content });
    expect(resolveRef(ix, `doc:${d.id}#page9999`).kind).toBe('text');
  });

  it('qa-, msg-, call- resolve to the client record text', () => {
    const qa = p.client.questionnaire[0];
    expect(resolveRef(ix, qa.id)).toMatchObject({ kind: 'qa', sourceKind: 'Typed by the client' });
    expect(resolveRef(ix, qa.id).text).toContain(qa.answer);
    const m = p.client.messages[0];
    expect(resolveRef(ix, m.id)).toMatchObject({ kind: 'msg', text: m.text });
    const c = p.client.call_notes[0] as { id: string; notes: string[] };
    const rc = resolveRef(ix, c.id);
    expect(rc.kind).toBe('call');
    expect(rc.text).toContain(c.notes[0]);
  });

  it('py:/pointer resolves inside prior_years (RFC 6901), including keys with dots', () => {
    const r = resolveRef(ix, 'py:/carryovers_into_2025/capital_loss_short');
    expect(r.kind).toBe('py');
    expect(r.value).toEqual((p.prior_years.carryovers_into_2025 as Record<string, unknown>).capital_loss_short);
    expect(r.sourceKind).toBe('Prior year');
    const lines = p.prior_years.return_2024.lines as Record<string, number>;
    const key = Object.keys(lines)[0];
    expect(resolveRef(ix, `py:/return_2024/lines/${key}`).value).toBe(lines[key]);
    expect(resolveRef(ix, 'py:/no_such_thing').kind).toBe('text');
  });

  it('agency:/pointer resolves inside tax_agency_records, labelled IRS or FTB', () => {
    const r = resolveRef(ix, 'agency:/efile');
    expect(r.kind).toBe('agency');
    expect(r.value).toEqual(p.tax_agency_records.efile);
    expect(resolveRef(ix, 'agency:/ftb_account').sourceKind).toBe('FTB record');
    expect(resolveRef(ix, 'agency:/irs_account_transcript_2025').sourceKind).toBe('IRS record');
  });

  it('asset:<id> resolves to the version asset, then prior-year asset records', () => {
    const a = ix.latest.assets[0] as { asset_id: string; description: string };
    expect(resolveRef(ix, `asset:${a.asset_id}`)).toMatchObject({ kind: 'asset', label: a.description, value: a });
    const pa = (p.prior_years.asset_records as { asset_id: string }[]).find((x) => !ix.latest.assets.some((y) => y.asset_id === x.asset_id));
    if (pa) expect(resolveRef(ix, `asset:${pa.asset_id}`)).toMatchObject({ kind: 'asset', sourceKind: 'Prior year' });
  });

  it('household:<id> resolves to the person as the client entered them', () => {
    const person = p.household.people[0];
    expect(resolveRef(ix, `household:${person.id}`)).toMatchObject({ kind: 'household', label: person.name, sourceKind: 'Typed by the client' });
  });

  it('ref:param.<name> and ref:fx.SEK.<rate> resolve to engine_reference.parameters', () => {
    const name = Object.keys(ix.packet.engine_reference.parameters).find((k) => typeof ix.packet.engine_reference.parameters[k] === 'number')!;
    expect(resolveRef(ix, `ref:param.${name}`)).toMatchObject({ kind: 'param', value: ix.packet.engine_reference.parameters[name], sourceKind: 'Engine' });
    const fx = ix.packet.engine_reference.parameters.fx as Record<string, Record<string, number>>;
    const rate = Object.keys(fx.SEK)[0];
    expect(resolveRef(ix, `ref:fx.SEK.${rate}`)).toMatchObject({ kind: 'fx', value: fx.SEK[rate] });
    expect(resolveRef(ix, 'ref:param.no_such_param').kind).toBe('text');
  });

  it('timeline:<id> resolves, including the extension event id', () => {
    for (const t of p.timeline) expect(resolveRef(ix, `timeline:${t.id}`)).toMatchObject({ kind: 'timeline', text: t.detail });
  });

  it('bare v1|v2|v3 resolve to the version', () => {
    for (const rv of p.return_versions) expect(resolveRef(ix, rv.version)).toMatchObject({ kind: 'version', label: expect.stringContaining(rv.version) });
  });

  it('line keys resolve in the given version (inputs), default latest', () => {
    const l = ix.latest.lines.find((x) => typeof x.value === 'number')!;
    expect(resolveRef(ix, l.key)).toMatchObject({ kind: 'line', label: l.label, value: l.value });
    const v1 = p.return_versions[0];
    const l1 = v1.lines[0];
    expect(resolveRef(ix, l1.key, v1.version).value).toBe(l1.value);
  });

  it('rule ids resolve to engine_reference.rules text', () => {
    const [id, text] = Object.entries(p.engine_reference.rules)[0];
    expect(resolveRef(ix, id)).toMatchObject({ kind: 'rule', text });
  });
});

describe('resolveRef over the altered packet', () => {
  it('a removed form line no longer resolves as a line', () => {
    const key = ix.latest.lines.find((l) => l.form === REMOVED_FORM)!.key;
    expect(resolveRef(ix, key).kind).toBe('line');
    const ax = indexPacket(alteredPacket());
    expect(resolveRef(ax, key).kind).toBe('text');
  });

  it('a renamed person resolves with the new name', () => {
    const ax = indexPacket(alteredPacket());
    const person = ax.packet.household.people[0];
    expect(person.name).not.toBe(p.household.people[0].name);
    expect(resolveRef(ax, `household:${person.id}`).label).toBe(person.name);
  });
});
