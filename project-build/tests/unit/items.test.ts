// Checks lists items: one row per claim (a return line or a document). A check finding belongs to its first claim; an
// AI suggestion joins the item of the first check finding that names any claim it names, else it is an AI-only item.
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import type { Finding } from '@/domain/contracts';
import { checkItems, engineOn } from '@/domain/items';
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

describe('engineOn', () => {
  const ix = realIx();
  const suggestions = aiReview(ix, path.join(process.cwd(), 'ai/eval/ai-suggestions.json')).findings.map((f) => ({ f }));
  const codes = (m: Map<string, { code: string }[]>, k: string) => (m.get(k) ?? []).map((d) => d.code);

  it('joins a diagnostic to the item it names: by evidence, by a bare line key, by a sourced value', () => {
    const checks = runChecks(ix).filter((f) => f.firstVisibleAt! <= ix.latest.computed_at);
    const on = engineOn(ix, checkItems(checks, suggestions));
    expect(codes(on, 'doc:D31')).toEqual(['BROKER_SUMMARY_DETAIL_MISMATCH']);
    expect(codes(on, 'line:SchC.30')).toEqual(['HOME_OFFICE_AREA_CHANGE']);
    expect(codes(on, 'line:SchA.11')).toEqual(['LOW_CONFIDENCE_READ']);
    expect(codes(on, 'line:F540NR.72')).toEqual([]);
    expect([...on.values()].flat().length).toBe(3);
  });

  it('the crypto lot joins once its finding is in the story', () => {
    const on = engineOn(ix, checkItems(runChecks(ix), []));
    expect(codes(on, 'line:F8949.H.C6')).toEqual(['DIGITAL_ASSET_BASIS_MISSING']);
  });

  it('a value the engine cites joins only an item whose line it sources', () => {
    // LOW_CONFIDENCE_READ cites a value that is a source of SchA.11; an item on SchA.12 is not named by it.
    const other = { id: 'y', checkId: 'y', family: 'f', title: 'y', severity: 'check' as const, claims: ['line:SchA.12'], evidence: [], explanation: '', ledgerIds: [] };
    const on = engineOn(ix, checkItems([other], []));
    expect(codes(on, 'line:SchA.12')).not.toContain('LOW_CONFIDENCE_READ');
  });

  it('never joins an item it does not name', () => {
    const lone = { id: 'x', checkId: 'x', family: 'f', title: 'x', severity: 'check' as const, claims: ['line:F1040.1a'], evidence: [], explanation: '', ledgerIds: [] };
    const on = engineOn(ix, checkItems([lone], []));
    expect(on.size).toBe(0);
  });
});
