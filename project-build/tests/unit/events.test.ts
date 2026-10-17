import { describe, expect, it } from 'vitest';
import { loadWorkspace, postEvent, isWorkspaceId } from '@/server/state';
import { validateNewEvent } from '@/domain/events';
import { loadPacket, indexPacket } from '@/domain/packet/load';

const ix = indexPacket(loadPacket());
const lineKey = ix.latest.lines.find((l) => typeof l.value === 'number' && l.value !== 0)!.key;
let n = 0;
const freshWs = () => `ws-ev-${Date.now().toString(36)}-${n++}`;

describe('event validation', () => {
  it('accepts a well-formed event and rejects junk', () => {
    expect(validateNewEvent({ type: 'review_note', claimId: 'line:X', payload: { text: 'hi' } }).ok).toBe(true);
    expect(validateNewEvent({ type: 'nope', payload: {} }).ok).toBe(false);
    expect(validateNewEvent({ type: 'review_note', payload: 'x' }).ok).toBe(false);
    expect(validateNewEvent({ type: 'review_note', claimId: 'bad id', payload: {} }).ok).toBe(false);
    expect(validateNewEvent(null).ok).toBe(false);
  });

  it('checks workspace ids', () => {
    expect(isWorkspaceId('demo')).toBe(true);
    expect(isWorkspaceId('ab')).toBe(false);
    expect(isWorkspaceId('Bad_Id')).toBe(false);
    expect(isWorkspaceId('a'.repeat(41))).toBe(false);
  });
});

describe('server state: loadWorkspace and postEvent end to end (memory store)', () => {
  it('loads a clean workspace at the default story time', async () => {
    const w = await loadWorkspace(freshWs(), 'daniel');
    expect(w.role.key).toBe('daniel');
    expect(w.state.events).toEqual([]);
    expect(w.state.storyAt).toBe('2026-06-23T06:05:00Z');
    expect(Array.isArray(w.findings)).toBe(true);
    expect(w.ix.counts.documents).toBe(ix.counts.documents);
  });

  it('saves an adjustment and reads it back; original kept', async () => {
    const ws = freshWs();
    const r = await postEvent(ws, 'daniel', { type: 'adjustment', claimId: `line:${lineKey}`, payload: { value: 1234, reason: 'test' } });
    expect(r.ok).toBe(true);
    const w = await loadWorkspace(ws, 'daniel');
    const c = w.state.claims[`line:${lineKey}`];
    expect(c.current).toBe(1234);
    expect(c.original).toBe(ix.line(ix.latest.version, lineKey)!.value);
    expect(c.adjusted).toBe(true);
  });

  it('refuses a policy breach with 403 and does not save it', async () => {
    const ws = freshWs();
    const r = await postEvent(ws, 'marcus', { type: 'reveal', payload: { what: 'household:ngozi.ssn' } });
    expect(r).toMatchObject({ ok: false, status: 403 });
    expect((await loadWorkspace(ws, 'daniel')).state.events).toHaveLength(0);
  });

  it('returns 409 with the newer events on a stale baseVersion', async () => {
    const ws = freshWs();
    const claimId = `line:${lineKey}`;
    await postEvent(ws, 'daniel', { type: 'adjustment', claimId, payload: { value: 1 }, baseVersion: 0 });
    const r = await postEvent(ws, 'helen', { type: 'adjustment', claimId, payload: { value: 2 }, baseVersion: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(409);
      expect(r.newer?.length).toBe(1);
    }
  });

  it('stamps storyAt from the workspace clock, not from the client', async () => {
    const ws = freshWs();
    const r = await postEvent(ws, 'daniel', { type: 'review_note', claimId: `line:${lineKey}`, payload: { text: 'look' }, storyAt: '2030-01-01T00:00:00Z' } as never);
    expect(r.ok && r.event.storyAt).toBe('2026-06-23T06:05:00Z');
  });
});

describe('approval on the server', () => {
  it('refuses the partner approval with 403 and the blocker list while blockers stand', async () => {
    const ws = freshWs();
    await postEvent(ws, 'daniel', { type: 'review_note', claimId: `line:${lineKey}`, payload: { text: 'tie out first', blocking: true } });
    const r = await postEvent(ws, 'helen', { type: 'signoff', claimId: 'return', payload: { level: 'partner' } });
    expect(r).toMatchObject({ ok: false, status: 403 });
    if (!r.ok) expect(r.reason).toMatch(/tie out first/);
    const d = await postEvent(ws, 'daniel', { type: 'signoff', claimId: 'return', payload: {} });
    expect(d).toMatchObject({ ok: false, status: 403 });
  });
});

describe('API payloads', () => {
  it("Marcus's serialized state carries no real identifier", async () => {
    const { stateResponse } = await import('@/server/state');
    const p = loadPacket();
    const ws = freshWs();
    const ssn = p.household.people[0].ssn as string;
    const bank = (p.household as unknown as { bank_account_for_refund_or_payment: { routing: string; account: string } }).bank_account_for_refund_or_payment;
    await postEvent(ws, 'daniel', { type: 'review_note', claimId: `line:${lineKey}`, payload: { text: `check ${ssn} routing ${bank.routing} account ${bank.account}` } });
    const body = JSON.stringify(await stateResponse(ws, 'marcus'));
    const real = new Set(JSON.stringify(p).match(/\b\d{3}-\d{2}-\d{4}\b/g) ?? []);
    expect(real.size).toBeGreaterThan(0);
    for (const id of real) {
      expect(body).not.toContain(id);
      expect(body).not.toContain(id.replace(/-/g, ''));
    }
    expect(body).not.toContain(bank.routing);
    expect(body).not.toContain(bank.account);
    expect(body).toContain(ssn.slice(-4)); // proves the note was in the response, masked to last 4
  });

  it('GET state only returns events after a given seq when asked', async () => {
    const { stateResponse } = await import('@/server/state');
    const ws = freshWs();
    await postEvent(ws, 'daniel', { type: 'review_note', claimId: `line:${lineKey}`, payload: { text: 'a' } });
    await postEvent(ws, 'daniel', { type: 'review_note', claimId: `line:${lineKey}`, payload: { text: 'b' } });
    const r = await stateResponse(ws, 'daniel', 1);
    expect(r.newEvents.map((e) => e.seq)).toEqual([2]);
    expect(r.lastSeq).toBe(2);
  });
});
