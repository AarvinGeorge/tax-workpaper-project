import { beforeAll, describe, expect, it } from 'vitest';
import { loadWorkspace, postEvent } from '@/server/state';
import { notificationsFor, type Notice } from '@/domain/notify';
import { DEFAULT_STORY_AT } from '@/domain/clock';
import type { RoleKey } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';

// The packet's own story as a second notification source: derived from the timeline, the e-file records and
// firm.deadlines up to the story clock, never stored. Ids may appear in tests (BUILD-CONTEXT rule 3).
let n = 0;
const freshWs = () => `ws-notify-story-${Date.now().toString(36)}-${n++}`;
const SSN_SHAPED = /\d{3}-?\d{2}-?\d{4}/;
const ALL: RoleKey[] = ['priya', 'marcus', 'daniel', 'helen', 'sam', 'jo', 'ngozi', 'erik', 'next', 'irs'];
let ix: PacketIndex;
const at = (role: RoleKey, storyAt: string): Notice[] => notificationsFor(ix, [], role, storyAt);
const texts = (role: RoleKey, storyAt: string) => at(role, storyAt).map((x) => x.text);

beforeAll(async () => { ix = (await loadWorkspace(freshWs(), 'priya')).ix; });

describe('story notices: e-file rejection', () => {
  const before = '2026-07-13T17:03:00Z';
  const after = '2026-07-13T17:04:00Z';
  it('stays silent before its time', () => {
    for (const r of ALL) expect(texts(r, before).some((t) => /rejected|returned your return/i.test(t))).toBe(false);
  });
  it('reaches the preparer and reviewer with the reason, and both clients in plain words', () => {
    for (const r of ['priya', 'daniel'] as RoleKey[]) {
      const hit = at(r, after).filter((x) => /rejected/i.test(x.text));
      expect(hit).toHaveLength(1);
      expect(hit[0].text).toMatch(/name control/);
      expect(hit[0].id).toMatch(/^tl:/);
    }
    for (const r of ['ngozi', 'erik'] as RoleKey[]) {
      const hit = at(r, after).filter((x) => /returned your return/.test(x.text));
      expect(hit).toHaveLength(1);
      expect(hit[0].text).toMatch(/we need a document from you/);
      expect(hit[0].text).not.toMatch(/name control|e-file database|R0000/);
    }
  });
  it('does not reach the partner, Jo, Marcus or the examiner', () => {
    for (const r of ['helen', 'jo', 'marcus', 'irs'] as RoleKey[]) expect(texts(r, after).some((t) => /rejected|returned/i.test(t))).toBe(false);
  });
});

describe('story notices: after the last computation', () => {
  it('client messages after the latest computed_at reach the preparer, naming the sender', () => {
    expect(texts('priya', DEFAULT_STORY_AT(ix)).some((t) => /sent a message/.test(t))).toBe(false);
    const t = texts('priya', '2026-07-02T00:00:00Z');
    expect(t).toContain(`Erik sent a message after the last computation (${ix.latest.version})`);
    expect(t).toContain(`Ngozi sent a message after the last computation (${ix.latest.version})`);
    expect(texts('priya', '2026-06-30T18:01:00Z').some((x) => /sent a message/.test(x))).toBe(false);
    for (const r of ['daniel', 'ngozi', 'erik', 'jo'] as RoleKey[]) expect(texts(r, '2026-07-02T00:00:00Z').some((x) => /sent a message/.test(x))).toBe(false);
  });
  it('documents received after the latest computed_at reach the preparer; earlier ones do not', () => {
    expect(texts('priya', DEFAULT_STORY_AT(ix)).some((t) => /document arrived/.test(t))).toBe(false);
    const hit = at('priya', '2026-07-13T20:00:00Z').filter((x) => /document arrived after the last computation/.test(x.text));
    expect(hit).toHaveLength(1);
    expect(texts('daniel', '2026-07-13T20:00:00Z').some((t) => /document arrived/.test(t))).toBe(false);
  });
});

describe('story notices: e-file accepted', () => {
  const after = '2026-07-15T03:00:00Z';
  it('reaches preparer, reviewer, partner and both clients, once per jurisdiction', () => {
    for (const r of ['priya', 'daniel', 'helen', 'ngozi', 'erik'] as RoleKey[]) {
      const t = texts(r, after).filter((x) => /accepted/.test(x));
      expect(t).toHaveLength(2);
      expect(t.some((x) => /federal/i.test(x))).toBe(true);
      expect(t.some((x) => /California/.test(x))).toBe(true);
    }
    expect(texts('ngozi', after).filter((x) => /accepted/.test(x)).every((x) => /^Your /.test(x))).toBe(true);
    for (const r of ['jo', 'marcus'] as RoleKey[]) expect(texts(r, after).some((x) => /accepted/.test(x))).toBe(false);
    expect(texts('priya', '2026-07-14T16:21:00Z').some((x) => /accepted/.test(x))).toBe(false);
  });
});

describe('story notices: firm deadlines', () => {
  it('at the default clock the two internal deadlines are overdue for Jo and the preparer, with the extension as context', () => {
    for (const r of ['jo', 'priya'] as RoleKey[]) {
      const dl = at(r, DEFAULT_STORY_AT(ix)).filter((x) => x.id.startsWith('dl:'));
      expect(dl).toHaveLength(2);
      expect(dl.some((x) => /hand-off to review was due 27 Mar 2026/.test(x.text))).toBe(true);
      expect(dl.some((x) => /review complete was due 8 Apr 2026/.test(x.text))).toBe(true);
      expect(dl.every((x) => /on extension to 15 Oct 2026/.test(x.text))).toBe(true);
    }
    for (const r of ['daniel', 'helen', 'ngozi', 'marcus'] as RoleKey[]) expect(at(r, DEFAULT_STORY_AT(ix)).some((x) => x.id.startsWith('dl:'))).toBe(false);
  });
  it('skips deadlines outside the engagement and the original due date met by the extension', () => {
    for (const s of [DEFAULT_STORY_AT(ix), '2026-04-20T00:00:00Z', '2026-10-20T00:00:00Z']) {
      for (const t of texts('jo', s)) { expect(t).not.toMatch(/outside engagement|FBAR|1099/); expect(t).not.toMatch(/original due date/); }
    }
  });
  it('warns within 7 days, stays silent earlier, and goes quiet once met', () => {
    expect(at('jo', '2026-03-15T00:00:00Z').some((x) => x.id.startsWith('dl:'))).toBe(false);
    const soon = at('jo', '2026-03-22T00:00:00Z').filter((x) => x.id.startsWith('dl:'));
    expect(soon).toHaveLength(1);
    expect(soon[0].text).toMatch(/hand-off to review is due 27 Mar 2026, in 5 days/);
    // The client signed the e-file authorization on 10 Jul, so both internal steps were done by then.
    expect(at('jo', '2026-07-11T00:00:00Z').some((x) => x.id.startsWith('dl:'))).toBe(false);
    // Accepted on 14 Jul, before the extended due date: no warning in October.
    expect(at('jo', '2026-10-12T00:00:00Z').some((x) => x.id.startsWith('dl:'))).toBe(false);
  });
});

describe('story notices: safety and shape', () => {
  const clocks = ['2026-06-23T06:05:00Z', '2026-07-11T00:00:00Z', '2026-07-13T20:00:00Z', '2026-08-01T00:00:00Z', '2028-02-01T00:00:00Z'];
  it('never carries a PIN, SSN-shaped text or the signature event, for any role', () => {
    for (const r of ALL) for (const s of clocks) for (const x of at(r, s)) {
      expect(x.text).not.toMatch(SSN_SHAPED);
      expect(x.text).not.toMatch(/PIN|\d{5}|•/);
      expect(x.text).not.toMatch(/8879/);
    }
  });
  it('the examiner gets none at any clock', () => {
    for (const s of clocks) expect(at('irs', s)).toEqual([]);
  });
  it('ids are unique strings and the list is newest first', () => {
    const list = at('priya', '2026-08-01T00:00:00Z');
    expect(list.length).toBeGreaterThan(3);
    expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    const ms = list.map((x) => new Date(x.at).getTime());
    expect(ms).toEqual([...ms].sort((a, b) => b - a));
  });
  it('without a story clock only firm events are returned', () => {
    expect(notificationsFor(ix, [], 'jo')).toEqual([]);
  });
});

describe('grouping', () => {
  it('a bulk sign-off by the reviewer reaches the preparer as one notice; a single one names the item', async () => {
    const ws = freshWs();
    for (const k of ['F540NR.72', 'F540NR.71', 'F1040.1a']) await postEvent(ws, 'daniel', { type: 'signoff', claimId: 'line:' + k, groupId: 'bulk-test1', payload: { level: 'reviewer', bulk: true } });
    let w = await loadWorkspace(ws, 'priya');
    const firm = notificationsFor(w.ix, w.state.events, 'priya').filter((x) => /signed off/.test(x.text));
    expect(firm).toHaveLength(1);
    expect(firm[0].text).toBe('Daniel signed off 3 items');
    expect(firm[0].id).toMatch(/^grp:/);
    await postEvent(ws, 'daniel', { type: 'signoff', claimId: 'line:F1040.11', payload: { level: 'reviewer' } });
    w = await loadWorkspace(ws, 'priya');
    const all = notificationsFor(w.ix, w.state.events, 'priya').filter((x) => /signed off/.test(x.text));
    expect(all).toHaveLength(2);
    expect(all[0].text).toMatch(/^Daniel signed off (?!\d+ items)/);
    expect(notificationsFor(w.ix, w.state.events, 'daniel')).toEqual([]);
    await postEvent(ws, 'daniel', { type: 'undo', groupId: 'bulk-test1', payload: { reason: 'oops' } });
    w = await loadWorkspace(ws, 'priya');
    expect(notificationsFor(w.ix, w.state.events, 'priya').filter((x) => /signed off/.test(x.text))).toHaveLength(1);
  });
});
