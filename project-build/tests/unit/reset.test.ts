import { describe, expect, it } from 'vitest';
import { loadWorkspace, postEvent } from '@/server/state';
import { validateNewEvent } from '@/domain/events';
import { getStore } from '@/domain/store';
import type { RoleKey } from '@/domain/contracts';

// Reset: back to the pipeline output (README: "no reviews, notes, sign-offs or decisions") at the start of review
// (v3 handed over, 23 Jun 2026 06:05). Append-only: the reset is an event; nothing is deleted from the log.
let n = 0;
const freshWs = () => `ws-reset-${Date.now().toString(36)}-${n++}`;
const CLAIM = 'line:F540NR.72';
const START = '2026-06-23T06:05:00Z';

describe('workspace reset', () => {
  it('is a valid event type', () => {
    expect(validateNewEvent({ type: 'workspace_reset', payload: {} }).ok).toBe(true);
  });

  it('brings every role back to the pipeline output at the start of review, keeping the log', async () => {
    const ws = freshWs();
    await postEvent(ws, 'daniel', { type: 'review_note', claimId: CLAIM, payload: { text: 'tie out', blocking: true } });
    await postEvent(ws, 'daniel', { type: 'adjustment', claimId: CLAIM, payload: { value: 10500, reason: 'D68' } });
    await postEvent(ws, 'priya', { type: 'reveal', payload: { what: 'household:ngozi.ssn' } });
    await postEvent(ws, 'jo', { type: 'clock_moved', payload: { to: '2026-07-20T15:00:00Z' } });
    const clean = await loadWorkspace(freshWs(), 'daniel');

    const r = await postEvent(ws, 'daniel', { type: 'workspace_reset', payload: {} });
    expect(r.ok).toBe(true);

    for (const role of ['daniel', 'priya', 'helen', 'marcus', 'ngozi', 'irs'] as RoleKey[]) {
      const w = await loadWorkspace(ws, role);
      const fresh = await loadWorkspace(freshWs(), role);
      expect(w.state.events).toEqual([]);
      expect(w.state.storyAt).toBe(START);
      expect(w.state.frozen).toBe(false);
      expect(w.state.stage).toBe(fresh.state.stage);
      expect(w.state.reveals).toEqual([]);
      expect(w.state.claims).toEqual(fresh.state.claims);
      expect(w.state.blockers).toEqual(fresh.state.blockers);
    }
    expect((await loadWorkspace(ws, 'daniel')).state.blockers).toEqual(clean.state.blockers);
    // Append-only: the earlier events and the reset are still in the store.
    expect((await getStore().list(ws)).map((e) => e.type)).toEqual(['review_note', 'adjustment', 'reveal', 'clock_moved', 'workspace_reset']);
  });

  it('work after a reset counts from zero, and nothing from before it can be undone', async () => {
    const ws = freshWs();
    const first = await postEvent(ws, 'daniel', { type: 'adjustment', claimId: CLAIM, payload: { value: 10500, reason: 'D68' } });
    const firstSeq = first.ok ? first.event.seq : 0;
    await postEvent(ws, 'daniel', { type: 'workspace_reset', payload: {} });
    const again = await postEvent(ws, 'daniel', { type: 'adjustment', claimId: CLAIM, payload: { value: 10500, reason: 'D68' }, baseVersion: 0 });
    expect(again.ok).toBe(true);
    const w = await loadWorkspace(ws, 'daniel');
    expect(w.state.events.map((e) => e.type)).toEqual(['adjustment']);
    expect(w.state.claims[CLAIM].version).toBe(1);
    const undo = await postEvent(ws, 'daniel', { type: 'undo', payload: {}, retracts: firstSeq });
    expect(undo.ok).toBe(false);
  });

  it('any role may reset, including when the record is frozen (it is a demo control)', async () => {
    for (const role of ['marcus', 'ngozi', 'irs', 'next'] as RoleKey[]) {
      const ws = freshWs();
      await postEvent(ws, 'jo', { type: 'clock_moved', payload: { to: '2026-07-20T15:00:00Z' } });
      const r = await postEvent(ws, role, { type: 'workspace_reset', payload: {} });
      expect(r.ok, `${role} reset`).toBe(true);
      expect((await loadWorkspace(ws, role)).state.storyAt).toBe(START);
    }
  });
});
