// B7: AI suggestions on Checks read as the line and amount they concern; a raw snake_case kind is humanised; the same
// suggestion on the same line with the same status is one row with a count (the first id stays the row's id).
import { describe, expect, it } from 'vitest';
import type { Finding } from '@/domain/contracts';
import { aiTitle, groupAiRows } from '@/domain/ai/merge';

const f = (id: string, title: string, claims: string[]): Finding => ({
  id, checkId: 'AI reader', family: 'AI suggestion', title, severity: 'judgment', claims, evidence: [], explanation: '', ledgerIds: [], source: 'ai',
});
const item = (x: Finding, status: 'needs_review' | 'accepted' = 'needs_review') => ({ f: x, st: { status } });

describe('AI rows', () => {
  it('humanises a snake_case other kind', () => {
    expect(aiTitle('other', 'Duplicate_scan_double_counted')).toBe('Duplicate scan double counted');
    expect(aiTitle('other', 'duplicate_scan')).toBe('Duplicate scan');
  });
  it('groups same title, claim and status; keeps the first id; names the line', () => {
    const items = [
      item(f('a1', 'Something in a document the return does not reflect', ['line:F1040.1a'])),
      item(f('a2', 'Something in a document the return does not reflect', ['line:F1040.1a'])),
      item(f('a3', 'Something in a document the return does not reflect', ['line:F1040.1a']), 'accepted'),
      item(f('a4', 'Something in a document the return does not reflect', ['line:SchE.14A'])),
    ];
    const rows = groupAiRows(items, (x) => `${x.claims[0]}: ${x.title}`);
    expect(rows.map((r) => [r.items[0].f.id, r.items.length])).toEqual([['a1', 2], ['a3', 1], ['a4', 1]]);
    expect(rows[0].title).toBe('line:F1040.1a: Something in a document the return does not reflect');
    const keys = rows.map((r) => `${r.title}|${r.claims}|${r.status}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('one entry per title within an item, even when one suggestion also names other lines (live: SchE.14A, SchCA540NR.1.E)', () => {
    const items = [
      item(f('r1', 'A repair that may be an improvement', ['line:SchE.14A', 'line:SchE.18A'])),
      item(f('r2', 'A repair that may be an improvement', ['line:SchE.14A', 'line:SchE.18A', 'line:SchE.20A', 'line:SchE.21A'])),
      item(f('r3', 'A repair that may be an improvement', ['line:SchE.14A']), 'accepted'),
    ];
    const rows = groupAiRows(items, (x) => `Repairs - property A: ${x.title}`);
    expect(rows.map((r) => [r.items.map((x) => x.f.id), r.status])).toEqual([[['r1', 'r2'], 'needs_review'], [['r3'], 'accepted']]);
    expect(new Set(rows.map((r) => `${r.title}|${r.status}`)).size).toBe(rows.length);
  });
});
