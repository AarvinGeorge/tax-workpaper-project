// The "?" help dictionary: short, plain, house-style definitions, every key used and every use defined.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORM_TERMS, TERMS, formTermKey } from '@/components/term/terms';

const BANNED = ['delve', 'foster', 'leverage', 'utilize', 'facilitate', 'empower', 'streamline', 'robust', 'cutting-edge', 'paradigm',
  'game changer', 'tapestry', 'realm', 'beacon', 'multifaceted', 'meticulous', 'intricate', 'paramount', 'transformative', 'elevate',
  'embark', 'supercharge', 'harness', 'ever-evolving'];

const SRC = path.resolve(__dirname, '../../src');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}
const used = new Set<string>();
for (const f of files(SRC)) for (const m of readFileSync(f, 'utf8').matchAll(/<Term\b[^>]*?\bk="([^"]+)"/g)) used.add(m[1]);
for (const k of Object.values(FORM_TERMS)) used.add(k);

describe('TERMS', () => {
  const entries = Object.entries(TERMS);
  it('has entries with kebab-case keys and a label', () => {
    expect(entries.length).toBeGreaterThan(40);
    for (const [k, t] of entries) {
      expect(k).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(t.label.trim().length).toBeGreaterThan(0);
    }
  });
  it.each(entries)('%s is at most 30 words, one or two sentences', (_k, t) => {
    expect(t.text.trim().split(/\s+/).length).toBeLessThanOrEqual(30);
    expect((t.text.match(/[.!?](\s|$)/g) ?? []).length).toBeLessThanOrEqual(2);
  });
  it.each(entries)('%s has no em dash, banned word or contrast formula', (_k, t) => {
    const s = `${t.label} ${t.text}`;
    expect(s).not.toMatch(/—|--/);
    for (const w of BANNED) expect(s).not.toMatch(new RegExp(`\\b${w}\\b`, 'i'));
    expect(s).not.toMatch(/\bnot just\b/i);
    expect(s).not.toMatch(/\bisn['’]t\b[^.]*,\s*it['’]s\b/i);
  });
  it('every <Term k> in src is defined', () => {
    expect(used.size).toBeGreaterThan(20);
    for (const k of used) expect(TERMS[k], `missing TERMS["${k}"]`).toBeDefined();
  });
  it('has no unused keys', () => {
    expect(Object.keys(TERMS).filter((k) => !used.has(k))).toEqual([]);
  });
  it('maps form codes to terms', () => {
    expect(formTermKey('F1040')).toBe('form-1040');
    expect(formTermKey('F4562-C')).toBe('form-4562');
    expect(formTermKey('SchE')).toBe('sch-e');
    expect(formTermKey('F9999')).toBeNull();
  });
});

// Tax accuracy guards from the Fable review (docs/reviews/2026-10-17-tooltips-review.md), each sourced there.
describe('tax accuracy of definitions', () => {
  it('540NR: part-year residents are taxed on income while resident plus California-source income after', () => {
    expect(TERMS['form-540nr'].text).toMatch(/while (a )?resident/i);
  });
  it('8960: NIIT is 3.8% of the smaller of net investment income or MAGI over the threshold', () => {
    expect(TERMS['form-8960'].text).toMatch(/smaller of/i);
  });
  it('safe harbor names the prior-year AGI test for 110%', () => {
    expect(TERMS['safe-harbor'].text).toMatch(/150,000/);
  });
  it('depreciation uses recovery period and names the 2025 return to 100% bonus', () => {
    expect(TERMS['depreciation'].text).toMatch(/recovery period/i);
    expect(TERMS['depreciation'].text).toMatch(/100%/);
  });
  it('4797 does not claim the 25% rate is recaptured on the form itself', () => {
    expect(TERMS['form-4797'].text).toMatch(/Schedule D/);
  });
});
