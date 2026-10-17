import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { examinedLines, isRevealed, newWorkspaceId, isWorkspaceId, parseClaim, claimHref, fmtValue, fmtStory, searchPacket, screenLabel } from '@/components/shell/lib';
import { highlightSegments } from '@/components/drawer/lib';

const ix = indexPacket(loadPacket());

describe('workspace ids', () => {
  it('makes ids the API accepts', () => {
    for (let i = 0; i < 50; i++) expect(isWorkspaceId(newWorkspaceId())).toBe(true);
    expect(isWorkspaceId('AB')).toBe(false);
    expect(isWorkspaceId('../etc')).toBe(false);
  });
});

describe('claim ids', () => {
  it('parses line, doc with page, and finding claims', () => {
    expect(parseClaim('line:F540NR.72')).toEqual({ kind: 'line', key: 'F540NR.72' });
    expect(parseClaim('doc:D68#page1')).toEqual({ kind: 'doc', key: 'D68', page: 1 });
    expect(parseClaim('doc:D68')).toEqual({ kind: 'doc', key: 'D68' });
    expect(parseClaim('finding:f-1')).toEqual({ kind: 'finding', key: 'f-1' });
    expect(parseClaim('nonsense')).toBeNull();
    expect(parseClaim(undefined)).toBeNull();
  });
  it('builds a link that keeps other query values', () => {
    expect(claimHref('line:F1040.1a')).toBe('?claim=line%3AF1040.1a');
    expect(claimHref('doc:D01', { status: 'landed' })).toBe('?status=landed&claim=doc%3AD01');
  });
});

describe('formatting', () => {
  it('formats money with separators and keeps cents only when present', () => {
    expect(fmtValue(14000)).toBe('14,000');
    expect(fmtValue(-8256)).toBe('-8,256');
    expect(fmtValue(1234.5)).toBe('1,234.50');
    expect(fmtValue(null)).toBe('Blank');
    expect(fmtValue('MFJ')).toBe('MFJ');
  });
  it('formats story time in UTC', () => {
    expect(fmtStory('2026-06-23T06:05:00Z')).toBe('23 Jun 2026, 06:05 UTC');
  });
});

describe('screen labels', () => {
  it('uses plain names for clients and the examiner', () => {
    expect(screenLabel('documents', 'staff')).toBe('Documents');
    expect(screenLabel('documents', 'client')).toBe('Your documents');
    expect(screenLabel('return', 'staff')).toBe('Return');
  });
});

describe('search', () => {
  it('finds lines by key, label and amount, and documents by id', () => {
    const line = ix.latest.lines.find((l) => typeof l.value === 'number' && l.value > 1000)!;
    expect(searchPacket(ix, line.key).lines.map((r) => r.key)).toContain(line.key);
    expect(searchPacket(ix, String(line.value)).lines.map((r) => r.key)).toContain(line.key);
    const word = line.label.split(' ')[0];
    expect(searchPacket(ix, word).lines.length).toBeGreaterThan(0);
    const doc = ix.packet.documents[0];
    expect(searchPacket(ix, doc.id).documents.map((d) => d.id)).toContain(doc.id);
  });
  it('finds EINs but never matches identifier digits', () => {
    const ein = ix.packet.extracted_values.find((v) => v.value_type === 'ein')!;
    expect(searchPacket(ix, String(ein.value)).eins.length).toBeGreaterThan(0);
    const ssn = ix.packet.extracted_values.find((v) => v.value_type === 'ssn')!;
    const r = searchPacket(ix, String(ssn.value).slice(-4));
    const all = JSON.stringify(r);
    expect(all).not.toContain(String(ssn.value));
    expect(r.identifierRefused).toBe(false);
    const full = searchPacket(ix, String(ssn.value));
    expect(full.identifierRefused).toBe(true);
    expect(full.lines.length + full.documents.length + full.eins.length).toBe(0);
  });
  it('ignores queries shorter than two characters', () => {
    expect(searchPacket(ix, 'a').lines.length).toBe(0);
  });
});

describe('highlight on a simulated page', () => {
  it('marks the nth occurrence when several fields read the same text', () => {
    const printed = 'Paid 2025-04-15 3,500.00; 2025-06-16 3,500.00; 2025-09-15 3,500.00.';
    const fields = [
      { valueId: 'a', text: '3,500.00', value: 3500, valueType: 'money' },
      { valueId: 'b', text: '3,500.00', value: 3500, valueType: 'money' },
      { valueId: 'c', text: '3,500.00', value: 3500, valueType: 'money' },
    ];
    const segs = highlightSegments(printed, fields, 'c');
    const sel = segs.filter((s) => s.mark === 'sel');
    expect(sel).toHaveLength(1);
    const before = segs.slice(0, segs.indexOf(sel[0])).map((s) => s.text).join('');
    expect(before).toBe('Paid 2025-04-15 3,500.00; 2025-06-16 3,500.00; 2025-09-15 ');
    expect(segs.map((s) => s.text).join('')).toBe(printed);
  });
  it('marks every selected field when a line cites several values on one page', () => {
    const printed = 'A 1,000.00 B 2,000.00 C 3,000.00';
    const f = (id: string, t: string, v: number) => ({ valueId: id, text: t, value: v, valueType: 'money' });
    const segs = highlightSegments(printed, [f('a', '1,000.00', 1000), f('b', '2,000.00', 2000), f('c', '3,000.00', 3000)], ['a', 'c']);
    expect(segs.filter((s) => s.mark === 'sel').map((s) => s.text)).toEqual(['1,000.00', '3,000.00']);
    expect(segs.filter((s) => s.mark === 'other').map((s) => s.text)).toEqual(['2,000.00']);
  });
  it('falls back to the value when the text as read is formatted differently', () => {
    const printed = 'FTB Web Pay: 2025-01-15 3,000.00 tax year 2024.';
    const segs = highlightSegments(printed, [{ valueId: 'd', text: '01/15/2025', value: '2025-01-15', valueType: 'date' }], 'd');
    expect(segs.find((s) => s.mark === 'sel')?.text).toBe('2025-01-15');
  });
  it('never marks a number inside a longer number', () => {
    const segs = highlightSegments('Box 12 D 7,400.00; Box 9 0.00.', [{ valueId: 'z', text: '0.00', value: 0, valueType: 'money' }], 'z');
    const sel = segs.find((s) => s.mark === 'sel')!;
    const before = segs.slice(0, segs.indexOf(sel)).map((s) => s.text).join('');
    expect(before).toBe('Box 12 D 7,400.00; Box 9 ');
  });
  it('returns the page unmarked when the field is not printed', () => {
    const segs = highlightSegments('Nothing here.', [{ valueId: 'x', text: '999', value: 999, valueType: 'money' }], 'x');
    expect(segs).toEqual([{ text: 'Nothing here.', mark: null }]);
  });
});

describe('items under examination', () => {
  it('maps each notice item to lines on the return, from the notice text', () => {
    const keys = examinedLines(ix);
    const notices = (ix.packet.tax_agency_records as { notices?: { items_under_examination?: string[] }[] }).notices ?? [];
    const items = notices.flatMap((n) => n.items_under_examination ?? []);
    expect(items.length).toBeGreaterThan(0);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) expect(ix.line(ix.latest.version, k)).toBeTruthy();
  });
});

describe('reveals', () => {
  const st = (reveals: { role: string; what: string }[]) => ({ reveals: reveals.map((r, i) => ({ seq: i + 1, at: '', ...r })) }) as never;
  it('counts as revealed only when this role revealed every identifier asked about', () => {
    const s = st([{ role: 'priya', what: 'ev-1' }, { role: 'daniel', what: 'ev-2' }]);
    expect(isRevealed(s, 'priya', ['ev-1'])).toBe(true);
    expect(isRevealed(s, 'priya', ['ev-1', 'ev-2'])).toBe(false);
    expect(isRevealed(s, 'marcus', ['ev-1'])).toBe(false);
    expect(isRevealed(s, 'priya', [])).toBe(false);
  });
});
