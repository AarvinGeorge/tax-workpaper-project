import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadPacket, indexPacket, validatePacket } from '@/domain/packet/load';

const PACKET_SHA256 = 'ee01f8508bd2fd9854754b82fd9c4a055bdc55e2778a132002a25381c412ad19';

describe('packet loading', () => {
  it('reads the packet byte-identical to the one delivered', () => {
    const bytes = readFileSync(path.join(process.cwd(), 'data', 'packet.json'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(PACKET_SHA256);
  });

  it('indexes every section with counts computed from the data', () => {
    const p = loadPacket();
    const ix = indexPacket(p);
    expect(ix.counts.documents).toBe(p.documents.length);
    expect(ix.counts.values).toBe(p.extracted_values.length);
    expect(ix.counts.versions).toBe(p.return_versions.length);
    expect(ix.latest.version).toBe(p.return_versions[p.return_versions.length - 1].version);
    const someValue = p.extracted_values[0];
    expect(ix.valueById.get(someValue.id)).toBe(someValue);
    const someLine = ix.latest.lines[0];
    expect(ix.line(ix.latest.version, someLine.key)).toBe(someLine);
    expect(ix.docById.get(p.documents[0].id)).toBe(p.documents[0]);
  });

  it('validates shape and reports problems instead of throwing on unknown fields', () => {
    const p = loadPacket();
    expect(validatePacket(p).errors).toEqual([]);
    const altered = JSON.parse(JSON.stringify(p));
    altered.documents[0].brand_new_field = 'kept';
    delete altered.extracted_values[0].confidence;
    const r = validatePacket(altered);
    expect(r.errors.some((e: string) => e.includes('confidence'))).toBe(true);
    expect(indexPacket(altered).docById.get(altered.documents[0].id)?.brand_new_field).toBe('kept');
  });
});
