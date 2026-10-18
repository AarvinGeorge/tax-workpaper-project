// Review memo (docs/superpowers/plans/2026-10-18-review-memo.md): the printable snapshot of the review, built only from
// the projected state. Counts are read from the fixture, never hard-coded.
import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { projectWorkspace } from '@/domain/project';
import { runChecks } from '@/domain/checks/index';
import { DEFAULT_STORY_AT } from '@/domain/clock';
import { SIGN_FORMS } from '@/domain/policy';
import { returnFingerprint } from '@/components/client/signing';
import { memoBlock, memoData } from '@/domain/memo';
import type { NewEvent, RoleKey, WorkEvent } from '@/domain/contracts';

const ix = indexPacket(loadPacket());
const AT = DEFAULT_STORY_AT(ix);
const findings = runChecks(ix);
let seq = 0;
const ev = (role: RoleKey, type: NewEvent['type'], extra: Partial<WorkEvent> = {}): WorkEvent =>
  ({ seq: ++seq, ws: 'ws-memo', at: '2026-10-18T00:00:00Z', storyAt: AT, role, type, payload: {}, ...extra });
const project = (events: WorkEvent[]) => projectWorkspace(ix, events, 'helen', findings);

// The dry-run path: the California payments cut to 10,500, the partner signs it off, a blocking note resolved, every
// finding blocker cleared, the partner approves, both spouses sign.
function dryRun() {
  const events: WorkEvent[] = [
    ev('daniel', 'adjustment', { claimId: 'line:F540NR.72', payload: { value: 10500, status: 'applied', reason: 'The 15 Sep 2025 payment is designated tax year 2024 (D68).', authority: 'FTB account' } }),
    ev('helen', 'signoff', { claimId: 'line:F540NR.72', payload: { level: 'partner', note: 'Agreed to the FTB account' } }),
  ];
  const note = ev('daniel', 'review_note', { claimId: 'return', payload: { text: 'Tie the CA payments to D68', blocking: true } });
  events.push(note, ev('priya', 'note_resolved', { claimId: 'return', payload: { noteSeq: note.seq } }));
  const open = project(events).blockers.filter((b) => b.claimId.startsWith('finding:'));
  for (const b of open) events.push(ev('daniel', 'finding_cleared', { claimId: b.claimId, payload: { reason: 'Reviewed for this test.' } }));
  expect(project(events).blockers).toEqual([]);
  events.push(ev('helen', 'signoff', { claimId: 'return', payload: { scope: 'return', level: 'partner', value: ix.latest.version } }));
  const fp = returnFingerprint(ix, project(events));
  for (const who of ['ngozi', 'erik'] as RoleKey[]) events.push(ev(who, 'client_signature', { claimId: 'return', payload: { forms: [...SIGN_FORMS], value: fp } }));
  return { events, cleared: open.length };
}

describe('memoData', () => {
  it('before approval: no memo, and the reason says so', () => {
    const s = project([]);
    expect(memoData(ix, s, findings)).toBeNull();
    expect(memoBlock(ix, s)).toBe('Available once the partner approves the return');
  });

  it('after the dry run: the change with the lines it moved, each blocker resolved, the approval and both signatures', () => {
    const { events, cleared } = dryRun();
    const s = project(events);
    expect(memoBlock(ix, s)).toBeNull();
    const m = memoData(ix, s, findings)!;
    expect(m).not.toBeNull();
    expect(m.approval).toMatchObject({ kind: 'partner', name: expect.stringMatching(/Helen/) });
    expect(m.basis).toBe('v3 plus 1 adjustment');

    expect(m.changes).toHaveLength(1);
    const c = m.changes[0];
    expect(c).toMatchObject({ key: 'F540NR.72', from: 14000, to: 10500, reason: expect.stringContaining('D68'), authority: 'FTB account' });
    expect(Math.abs(c.effect!.california)).toBe(3500);
    expect(c.signoffs).toEqual([expect.objectContaining({ level: 'partner', name: expect.stringMatching(/Helen/) })]);
    expect(c.moved).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'F540NR.78', from: 27130, to: 23630 }),
      expect.objectContaining({ key: 'F540NR.97', from: 8256, to: 4756 }),
    ]));

    const how = m.resolutions.map((r) => r.how);
    expect(how.filter((h) => h === 'cleared')).toHaveLength(cleared);
    expect(m.resolutions.filter((r) => r.how === 'cleared').every((r) => r.text === 'Reviewed for this test.')).toBe(true);
    expect(how.filter((h) => h === 'partner')).toHaveLength(1);
    expect(m.resolutions.find((r) => r.how === 'note')).toMatchObject({ title: expect.stringContaining('Tie the CA payments') });

    expect(m.signatures).toHaveLength(2);
    expect(m.signatures.every((x) => x.at && !x.stale && !x.record)).toBe(true);
    const ca = m.figures.find((f) => f.jurisdiction === 'california')!;
    expect(ca.payments?.value).toBe(23630);
    expect(ca.result).toMatchObject({ kind: 'refund', value: 4756 });
  });

  it('a change after approval makes it stale: no memo until the partner approves again', () => {
    const { events } = dryRun();
    events.push(ev('daniel', 'adjustment', { claimId: 'line:F1040.26', payload: { value: 1, status: 'applied', reason: 'x' } }));
    const s = project(events);
    expect(memoBlock(ix, s)).toBe('The return changed after approval; approve again');
    expect(memoData(ix, s, findings)).toBeNull();
  });

  it('at 16 Jul, from the firm’s record: no approver named, the 8879 date only', () => {
    const s = project([ev('jo', 'clock_moved', { payload: { to: '2026-07-16T00:00:00Z' } })]);
    expect(memoBlock(ix, s)).toBeNull();
    const m = memoData(ix, s, findings)!;
    expect(m.approval).toEqual({ kind: 'record', signedAt: '2026-07-10T20:05:00Z' });
    expect(m.signatures.every((x) => x.record)).toBe(true);
    expect(m.changes).toEqual([]);
  });
});
