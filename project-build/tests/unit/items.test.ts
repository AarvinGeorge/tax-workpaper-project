// Checks lists items: one row per claim (a return line or a document). A check finding belongs to its first claim; an
// AI suggestion joins the item of the first check finding that names any claim it names, else it is an AI-only item.
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import type { Finding } from '@/domain/contracts';
import { checkItems } from '@/domain/items';
import { realIx } from './checks/helpers';
import { runChecks } from '@/domain/checks';
import { aiReview } from '@/domain/ai/merge';

const chk = (id: string, severity: Finding['severity'], claims: string[]): Finding =>
  ({ id, checkId: id, family: 'f', title: id, severity, claims, evidence: [], explanation: '', ledgerIds: [] });
const ai = (id: string, claims: string[]) => ({ f: { ...chk(id, 'judgment', claims), source: 'ai' as const } });

describe('checkItems', () => {
  it('groups by first claim, worst severity first, AI-only items last', () => {
    const items = checkItems(
      [chk('c1', 'check', ['line:A']), chk('c2', 'blocker', ['line:B', 'line:C']), chk('c3', 'judgment', ['line:A'])],
      [ai('a1', ['line:C']), ai('a2', ['line:Z']), ai('a3', []), ai('a4', ['line:Z'])],
    );
    expect(items.map((i) => [i.key, i.checks.map((c) => c.id), i.ai.map((x) => x.f.id), i.severity])).toEqual([
      ['line:B', ['c2'], ['a1'], 'blocker'],
      ['line:A', ['c1', 'c3'], [], 'check'],
      ['line:Z', [], ['a2', 'a4'], null],
      ['finding:a3', [], ['a3'], null],
    ]);
  });

  it('on the real packet and the scored AI run: every finding and suggestion in exactly one item', () => {
    const ix = realIx();
    const checks = runChecks(ix).filter((f) => f.firstVisibleAt! <= ix.latest.computed_at);
    const suggestions = aiReview(ix, path.join(process.cwd(), 'ai/eval/ai-suggestions.json')).findings.map((f) => ({ f }));
    const items = checkItems(checks, suggestions);
    const ids = items.flatMap((i) => [...i.checks.map((c) => c.id), ...i.ai.map((x) => x.f.id)]);
    expect(ids.length).toBe(checks.length + suggestions.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
    const pay = items.find((i) => i.key === 'line:F540NR.72')!;
    expect(pay.checks.map((c) => c.checkId).sort()).toEqual(['CHK-PAYMENT-TAX-YEAR', 'CHK-PAYMENTS-VS-AGENCY']);
    // A suggestion that names a check's second claim joins that check's item, not an item of its own.
    const biz = items.find((i) => i.checks.some((c) => c.checkId === 'CHK-BUSINESS-SHARE-FROM-NOTES'))!;
    expect(biz.ai.length).toBeGreaterThan(0);
    expect(items.some((i) => i.severity === null && i.ai.length > 0)).toBe(true);
    const firstAiOnly = items.findIndex((i) => i.severity === null);
    expect(items.slice(firstAiOnly).every((i) => i.severity === null)).toBe(true);
  });
});
