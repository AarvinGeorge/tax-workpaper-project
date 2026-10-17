// Round G review fixes: the return approval goes stale only when the return changes after it; signing notices;
// the server, not the browser, fingerprints what a client signs.
import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { projectWorkspace } from '@/domain/project';
import { notificationsFor } from '@/domain/notify';
import { DEFAULT_STORY_AT } from '@/domain/clock';
import { returnFingerprint } from '@/components/client/signing';
import { postEvent, loadWorkspace } from '@/server/state';
import { getStore } from '@/domain/store';
import type { NewEvent, RoleKey, WorkEvent } from '@/domain/contracts';

const ix = indexPacket(loadPacket());
const AT = DEFAULT_STORY_AT(ix);
let seq = 0;
const ev = (role: RoleKey, type: NewEvent['type'], extra: Partial<WorkEvent> = {}): WorkEvent =>
  ({ seq: ++seq, ws: 'ws-g', at: '2026-10-17T00:00:00Z', storyAt: AT, role, type, payload: {}, ...extra });
const approval = () => ev('helen', 'signoff', { claimId: 'return', payload: { scope: 'return', level: 'partner', value: ix.latest.version } });
const change = () => ev('daniel', 'adjustment', { claimId: 'line:F540NR.72', payload: { value: 10500, reason: 'D68', status: 'applied' } });

describe('return approval staleness', () => {
  it('is fresh when nothing changed after it, stale after an applied change, fresh again once that change is undone', () => {
    const a = approval();
    expect(projectWorkspace(ix, [a], 'daniel', []).claims['return'].signoffs[0].stale).toBe(false);
    const c = change();
    expect(projectWorkspace(ix, [a, c], 'daniel', []).claims['return'].signoffs[0].stale).toBe(true);
    const u = ev('daniel', 'undo', { retracts: c.seq });
    expect(projectWorkspace(ix, [a, c, u], 'daniel', []).claims['return'].signoffs[0].stale).toBe(false);
    // A change made before the approval does not make it stale.
    const c2 = change(); const a2 = approval();
    expect(projectWorkspace(ix, [c2, a2], 'daniel', []).claims['return'].signoffs[0].stale).toBe(false);
  });
});

describe('signing notices', () => {
  it("the partner's approval asks both spouses to sign; a client's signature tells the preparer", () => {
    const a = approval();
    for (const k of ['ngozi', 'erik'] as RoleKey[]) {
      const st = projectWorkspace(ix, [a], k, []);
      expect(notificationsFor(ix, st.events, k, st.storyAt).some((x) => /ready for you to sign/.test(x.text)), k).toBe(true);
    }
    const s = ev('ngozi', 'client_signature', { claimId: 'return', payload: { forms: ['8879', 'FTB 8879'], value: 'x' } });
    const st = projectWorkspace(ix, [a, s], 'priya', []);
    expect(notificationsFor(ix, st.events, 'priya', st.storyAt).some((x) => /Ngozi signed Form 8879/.test(x.text))).toBe(true);
  });
});

describe('server fingerprint', () => {
  it('replaces whatever value the browser sends with the fingerprint of the finalized return', async () => {
    const ws = `ws-fp-${Date.now().toString(36)}`;
    // Approval needs no blockers in the real flow; seed it straight into the store to test the signing step alone.
    await getStore().append(ws, { ws, role: 'helen', type: 'signoff', claimId: 'return', storyAt: AT, payload: { scope: 'return', level: 'partner', value: ix.latest.version } });
    const r = await postEvent(ws, 'ngozi', { type: 'client_signature', claimId: 'return', payload: { forms: ['8879', 'FTB 8879'], value: 'forged00' } });
    expect(r.ok).toBe(true);
    const staff = (await loadWorkspace(ws, 'daniel')).state;
    const saved = (await getStore().list(ws)).find((e) => e.type === 'client_signature')!;
    expect(saved.payload.value).toBe(returnFingerprint(ix, staff));
    expect(saved.payload.value).not.toBe('forged00');
  });
});
