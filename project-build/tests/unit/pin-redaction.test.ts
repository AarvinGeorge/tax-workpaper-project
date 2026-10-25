// PINs (Identity Protection, signature, ERO) are never shown, in any text, to any role, revealed or not.
// The real PIN values are read from the packet at runtime and are never written here; phrasing tests use synthetic digits.
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { roles, maskText, redactText, redactPins } from '@/domain/policy';
import { runTool } from '../../ai/lib/agent-tools';

const p = loadPacket();
const ix = indexPacket(p);

/** Every 4-6 digit value under a key matching /pin/i, anywhere in the packet. */
function packetPins(): string[] {
  const out = new Set<string>();
  const walk = (x: unknown, key?: string) => {
    if (x && typeof x === 'object') { for (const [k, v] of Object.entries(x as Record<string, unknown>)) walk(v, k); return; }
    if (key && /pin/i.test(key) && /^\d{4,6}$/.test(String(x))) out.add(String(x));
  };
  walk(p);
  for (const v of p.extracted_values) if (/pin/i.test(v.field ?? '') && /^\d{4,6}$/.test(String(v.value))) out.add(String(v.value));
  return [...out];
}
const PINS = packetPins();
const pinRes = PINS.map((pin) => new RegExp(`(?<!\\d)${pin}(?!\\d)`));
/** Which PINs (by index only, never the value) appear in the text. */
const leaked = (text: string) => pinRes.flatMap((re, i) => (re.test(text) ? [i] : []));

describe('PIN redaction on the real packet', () => {
  it('the packet has PINs to hide and at least one page prints one (the measurement can find a leak)', () => {
    expect(PINS.length).toBeGreaterThan(0);
    const pagesWithPin = p.documents.flatMap((d) => d.pages).filter((pg) => leaked(pg.printed_content).length);
    expect(pagesWithPin.length).toBeGreaterThan(0);
  });

  it('maskText of every page, for every role, revealed or not, shows no PIN', () => {
    const bad: string[] = [];
    for (const role of roles(ix)) for (const revealed of [false, true]) for (const d of p.documents) for (const pg of d.pages) {
      const hits = leaked(maskText(pg.printed_content, role, revealed));
      if (hits.length) bad.push(`${role.key}/${revealed}/${d.id}/p${pg.page}: pin#${hits.join(',')}`);
    }
    expect(bad).toEqual([]);
  });

  it('the agent tools get_page and search_values on D03 return no PIN', () => {
    const d03 = p.documents.find((d) => d.id === 'D03')!;
    const out: string[] = [];
    for (const pg of d03.pages) out.push(runTool(ix, 'get_page', { doc: 'D03', page: pg.page }));
    for (const text of ['D03', 'PIN', 'Identity Protection', 'ip_pin', 'pin']) out.push(runTool(ix, 'search_values', { text, limit: 50, cursor: 0 }));
    expect(out.map((o, i) => (leaked(o).length ? i : -1)).filter((i) => i >= 0)).toEqual([]);
  });
});

describe('PIN phrasings (synthetic digits)', () => {
  const masked: [string, string][] = [
    ['Identity Protection PIN for tax year 2025 is 12345', '12345'],
    ['IP PIN: 123456', '123456'],
    ['your PIN is 54321', '54321'],
    ['PIN 12345', '12345'],
    ['PIN — 12345', '12345'],
    ['Self-Select PIN 54321', '54321'],
    ['spouse PIN: 12345', '12345'],
  ];
  for (const [text, digits] of masked) {
    it(`masks "${text}"`, () => {
      for (const out of [redactPins(text), redactText(text)]) {
        expect(out).not.toMatch(new RegExp(`(?<!\\d)${digits}(?!\\d)`));
        expect(out).toMatch(/•{5}/);
      }
    });
  }
  it('keeps the tax year in a "for tax year … is" phrasing', () => {
    expect(redactPins('Identity Protection PIN for tax year 2025 is 12345')).toContain('2025');
  });

  const untouched = ['Form 8879', 'PIN-protected', 'tax year 2025', 'ZIP 97401', '12,345.00', '2025-04-15', 'PIN for tax year 2025', 'PIN-protected form 8879'];
  for (const text of untouched) {
    it(`does not over-mask "${text}"`, () => {
      expect(redactPins(text)).toBe(text);
      expect(redactText(text)).toBe(text);
    });
  }
  it('leaves an EIN-like value as it was', () => {
    expect(redactText('EIN 93-1876620')).toBe('EIN 93-1876620');
    expect(redactPins('EIN 93-1876620')).toBe('EIN 93-1876620');
  });
});
