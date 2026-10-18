import { describe, expect, it } from 'vitest';
import { loadWorkspace, postEvent } from '@/server/state';
import { notificationsFor } from '@/domain/notify';
import type { RoleKey } from '@/domain/contracts';

// Notifications (brief: "Several people at once. Assignments, deadlines, notifications"): a projection of the
// events with recipient rules, worded per recipient at read time. Never the actor's own actions; never identifiers.
let n = 0;
const freshWs = () => `ws-notify-${Date.now().toString(36)}-${n++}`;
const CLAIM = 'line:F540NR.72';
const SSN_SHAPED = /\d{3}-?\d{2}-?\d{4}/;

async function bell(ws: string, role: RoleKey) {
  const w = await loadWorkspace(ws, role);
  return notificationsFor(w.ix, w.state.events, role);
}

describe('notifications', () => {
  it('a review note reaches the preparer, not its author', async () => {
    const ws = freshWs();
    await postEvent(ws, 'daniel', { type: 'review_note', claimId: CLAIM, payload: { text: 'tie out D68', blocking: true } });
    const priya = await bell(ws, 'priya');
    expect(priya).toHaveLength(1);
    expect(priya[0].text).toMatch(/Daniel left a blocking review note on/);
    expect(priya[0].claimId).toBe(CLAIM);
    expect(await bell(ws, 'daniel')).toEqual([]);
  });

  it('an adjustment over the partner threshold asks Helen to sign off, and makes earlier sign-offs stale for their signers', async () => {
    const ws = freshWs();
    await postEvent(ws, 'priya', { type: 'signoff', claimId: CLAIM, payload: { note: 'Tied to the source' } });
    await postEvent(ws, 'daniel', { type: 'adjustment', claimId: CLAIM, payload: { value: 10500, reason: 'D68 designated 2024' } });
    const helen = await bell(ws, 'helen');
    expect(helen.some((x) => /needs your partner sign-off/.test(x.text))).toBe(true);
    const priya = await bell(ws, 'priya');
    expect(priya.some((x) => /Your sign-off on .* is stale/.test(x.text))).toBe(true);
  });

  it('a question to a client reaches that spouse only, in plain words; the answer reaches the preparer', async () => {
    const ws = freshWs();
    const q = await postEvent(ws, 'priya', { type: 'question_to_client', claimId: CLAIM, payload: { to: 'ngozi', text: 'Which payments were for 2025?' } });
    const ngozi = await bell(ws, 'ngozi');
    expect(ngozi).toHaveLength(1);
    expect(ngozi[0].text).toMatch(/Your accountant has a question about/);
    expect(await bell(ws, 'erik')).toEqual([]);
    expect(await bell(ws, 'irs')).toEqual([]);
    await postEvent(ws, 'ngozi', { type: 'answer_recorded', claimId: CLAIM, payload: { questionSeq: q.ok ? q.event.seq : 0, text: 'Three of them' } });
    expect((await bell(ws, 'priya')).some((x) => /Ngozi answered your question on/.test(x.text))).toBe(true);
  });

  it('a question to a colleague reaches that colleague', async () => {
    const ws = freshWs();
    await postEvent(ws, 'daniel', { type: 'question_to_colleague', claimId: CLAIM, payload: { to: 'helen', text: 'Your view?' } });
    expect((await bell(ws, 'helen'))[0].text).toMatch(/Daniel asked you about/);
    expect(await bell(ws, 'priya')).toEqual([]);
  });

  it('never carries free text or identifier digits, for any role, and is newest first', async () => {
    const ws = freshWs();
    await postEvent(ws, 'daniel', { type: 'review_note', claimId: CLAIM, payload: { text: 'SSN 666-12-3456 typo' } });
    await postEvent(ws, 'daniel', { type: 'question_to_colleague', claimId: CLAIM, payload: { to: 'priya', text: 'x' } });
    for (const role of ['priya', 'marcus', 'helen', 'ngozi', 'erik', 'irs'] as RoleKey[]) {
      for (const x of await bell(ws, role)) { expect(x.text).not.toMatch(SSN_SHAPED); expect(x.text).not.toMatch(/typo/); }
    }
    const priya = await bell(ws, 'priya');
    expect(priya.map((x) => x.seq ?? 0)).toEqual([...priya.map((x) => x.seq ?? 0)].sort((a, b) => b - a));
  });

  it('starts empty after a reset', async () => {
    const ws = freshWs();
    await postEvent(ws, 'daniel', { type: 'review_note', claimId: CLAIM, payload: { text: 'x' } });
    await postEvent(ws, 'daniel', { type: 'workspace_reset', payload: {} });
    expect(await bell(ws, 'priya')).toEqual([]);
  });

  it('the partner threshold measures each change against the value before it, not against the computed version', async () => {
    const ws = freshWs();
    const adj = (value: number) => postEvent(ws, 'daniel', { type: 'adjustment', claimId: CLAIM, payload: { value, reason: 'step', status: 'applied' } });
    const partner = async () => (await bell(ws, 'helen')).filter((x) => /needs your partner sign-off/.test(x.text)).length;
    expect((await adj(14800)).ok).toBe(true);   // +800 from the original
    expect((await adj(15600)).ok).toBe(true);   // +800 from the current value (+1,600 from v3)
    expect(await partner()).toBe(0);
    expect((await adj(13000)).ok).toBe(true);   // -2,600 from the current value
    expect(await partner()).toBe(1);
  });

  it('an answer reaches whoever asked the question, falling back to the preparer', async () => {
    const ws = freshWs();
    const q = await postEvent(ws, 'marcus', { type: 'question_to_client', claimId: CLAIM, payload: { to: 'erik', text: 'Which payments?' } });
    expect(q.ok).toBe(true);
    await postEvent(ws, 'erik', { type: 'answer_recorded', claimId: CLAIM, payload: { questionSeq: q.ok ? q.event.seq : 0, text: 'Three' } });
    expect((await bell(ws, 'marcus')).some((x) => /Erik answered your question on/.test(x.text))).toBe(true);
    expect((await bell(ws, 'priya')).some((x) => /answered/.test(x.text))).toBe(false);
    // A client can answer only a referenced question (policy); a staff-recorded answer without one goes to the preparer.
    expect((await postEvent(ws, 'daniel', { type: 'answer_recorded', claimId: CLAIM, payload: { text: 'from the call' } })).ok).toBe(true);
    expect((await bell(ws, 'priya')).some((x) => /Daniel answered your question on/.test(x.text))).toBe(true);
  });

  it('a review note also reaches its addressee; an applied change also reaches whoever proposed it', async () => {
    const ws = freshWs();
    await postEvent(ws, 'daniel', { type: 'review_note', claimId: CLAIM, payload: { text: 'x', to: 'marcus' } });
    expect((await bell(ws, 'marcus')).some((x) => /Daniel left a review note on/.test(x.text))).toBe(true);
    expect((await bell(ws, 'priya')).some((x) => /Daniel left a review note on/.test(x.text))).toBe(true);
    const p = await postEvent(ws, 'marcus', { type: 'adjustment', claimId: CLAIM, payload: { value: 14100, reason: 'r', status: 'proposed' } });
    expect(p.ok).toBe(true);
    const a = await postEvent(ws, 'daniel', { type: 'adjustment', claimId: CLAIM, payload: { value: 14100, reason: 'r', status: 'applied', appliedBy: 'daniel' } });
    expect(a.ok).toBe(true);
    expect((await bell(ws, 'marcus')).some((x) => /Daniel applied your proposed change to/.test(x.text))).toBe(true);
    expect((await bell(ws, 'priya')).some((x) => /Daniel changed/.test(x.text))).toBe(true);
  });

  it('moving the story clock is history only: no notice for anyone', async () => {
    const ws = freshWs();
    await postEvent(ws, 'jo', { type: 'clock_moved', payload: { to: '2026-06-24T00:00:00Z' } });
    for (const role of ['priya', 'marcus', 'daniel', 'helen', 'jo', 'ngozi', 'erik'] as RoleKey[]) expect(await bell(ws, role)).toEqual([]);
  });
});
