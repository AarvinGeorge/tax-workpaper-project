// One rule for whether a check is still open, used by Checks, the Forms tab, the side panel and Home: a clear or an
// adjustment on any line it claims closes it; a sign-off alone does not. Undone events do not count.
import { describe, expect, it } from 'vitest';
import type { Finding, WorkspaceState } from '@/domain/contracts';
import { findingStatus } from '@/components/work/lib';

const f: Finding = { id: 'c1', checkId: 'c1', family: 'f', title: 't', severity: 'blocker', claims: ['line:A', 'line:B'], evidence: [], explanation: '', ledgerIds: [] };
const st = (events: unknown[], claims: Record<string, unknown> = {}) => ({ events, claims } as unknown as WorkspaceState);
const ev = (seq: number, type: string, claimId: string, payload: Record<string, unknown> = {}) => ({ seq, type, claimId, payload });

describe('findingStatus', () => {
  it('open: keeps its severity', () => {
    expect(findingStatus(f, st([]))).toMatchObject({ word: 'Blocker', cleared: false, signed: false });
  });
  it('a clear closes it', () => {
    expect(findingStatus(f, st([ev(1, 'finding_cleared', 'finding:c1', { reason: 'r' })]))).toMatchObject({ word: 'Cleared', cleared: true });
  });
  it('an undone clear does not', () => {
    expect(findingStatus(f, st([ev(1, 'finding_cleared', 'finding:c1'), { ...ev(2, 'undo', 'finding:c1'), retracts: 1 }])).cleared).toBe(false);
  });
  it('an adjustment on any line it claims closes it (one of two lines is enough)', () => {
    expect(findingStatus(f, st([], { 'line:B': { adjusted: true } }))).toMatchObject({ word: 'Adjusted', cleared: true });
  });
  it('a sign-off alone reads Signed off but stays open; a stale one does not count', () => {
    expect(findingStatus(f, st([], { 'finding:c1': { signoffs: [{ stale: false }] } }))).toMatchObject({ word: 'Signed off', cleared: false, signed: true });
    expect(findingStatus(f, st([], { 'finding:c1': { signoffs: [{ stale: true }] } }))).toMatchObject({ word: 'Blocker', signed: false });
  });
});
