import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { NewEvent } from '@/domain/contracts';
import { MemoryStore } from '@/domain/store/memory';
import { FileStore } from '@/domain/store/file';
import { pgSql } from '@/domain/store/postgres';
import { blobKey, blobPrefix, seqFromKeys } from '@/domain/store/blob';
import { getStore, storeKind } from '@/domain/store';

const ev = (type: NewEvent['type'], extra: Partial<NewEvent> = {}): NewEvent => ({
  ws: 'ws-test', storyAt: '2026-06-23T06:05:00Z', role: 'daniel', type, payload: {}, ...extra,
});

describe('memory store', () => {
  it('appends with increasing seq and lists in order, per workspace', async () => {
    const s = new MemoryStore();
    const a = await s.append('ws-a', ev('review_note', { ws: 'ws-a' }));
    const b = await s.append('ws-a', ev('signoff', { ws: 'ws-a' }));
    await s.append('ws-b', ev('signoff', { ws: 'ws-b' }));
    expect([a.seq, b.seq]).toEqual([1, 2]);
    expect(typeof a.at).toBe('string');
    expect((await s.list('ws-a')).map((e) => e.type)).toEqual(['review_note', 'signoff']);
    expect((await s.list('ws-a', 1)).map((e) => e.seq)).toEqual([2]);
    expect(await s.list('ws-b')).toHaveLength(1);
    expect(await s.list('ws-none')).toEqual([]);
  });
});

describe('file store', () => {
  it('round-trips across instances (survives a restart)', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wp-store-'));
    const one = new FileStore(dir);
    await one.append('ws-f', ev('adjustment', { ws: 'ws-f', claimId: 'line:X', payload: { value: 1 } }));
    await one.append('ws-f', ev('undo', { ws: 'ws-f', retracts: 1 }));
    const two = new FileStore(dir);
    const list = await two.list('ws-f');
    expect(list.map((e) => [e.seq, e.type])).toEqual([[1, 'adjustment'], [2, 'undo']]);
    expect(list[0].payload).toEqual({ value: 1 });
    const third = await two.append('ws-f', ev('signoff', { ws: 'ws-f' }));
    expect(third.seq).toBe(3);
    expect(await two.list('ws-f', 2)).toHaveLength(1);
  });

  it('refuses a workspace id that could escape the folder', async () => {
    const s = new FileStore(mkdtempSync(path.join(tmpdir(), 'wp-store-')));
    await expect(s.append('../x', ev('signoff', { ws: '../x' }))).rejects.toThrow();
  });
});

describe('postgres adapter (SQL only; no database in unit tests)', () => {
  it('builds a single events table with a per-workspace sequence', () => {
    expect(pgSql.create).toMatch(/CREATE TABLE IF NOT EXISTS/);
    expect(pgSql.create).toMatch(/PRIMARY KEY \(ws, seq\)/);
    expect(pgSql.insert).toMatch(/COALESCE\(MAX\(seq\), 0\) \+ 1/);
    expect(pgSql.list).toMatch(/WHERE ws = \$1 AND seq > \$2 ORDER BY seq/);
  });
});

describe('blob adapter (keys only)', () => {
  it('uses time-sortable keys under a workspace prefix', () => {
    const k1 = blobKey('ws-b', new Date('2026-01-01T00:00:00Z'), 'aaaa');
    const k2 = blobKey('ws-b', new Date('2026-01-01T00:00:01Z'), 'aaaa');
    expect(k1.startsWith(blobPrefix('ws-b'))).toBe(true);
    expect([k2, k1].sort()).toEqual([k1, k2]);
    expect(seqFromKeys([k2, k1])).toEqual([[k1, 1], [k2, 2]]);
  });
});

describe('getStore', () => {
  it('chooses by environment', () => {
    expect(storeKind({ NODE_ENV: 'test' })).toBe('memory');
    expect(storeKind({ DATABASE_URL: 'postgres://x' })).toBe('postgres');
    expect(storeKind({ POSTGRES_URL: 'postgres://x' })).toBe('postgres');
    expect(storeKind({ BLOB_READ_WRITE_TOKEN: 't' })).toBe('blob');
    expect(storeKind({ DATABASE_URL: 'postgres://x', BLOB_READ_WRITE_TOKEN: 't' })).toBe('postgres');
    expect(storeKind({})).toBe('file');
    expect(storeKind({ WORKPAPER_STORE: 'memory', DATABASE_URL: 'postgres://x' })).toBe('memory');
    expect(getStore()).toBe(getStore());
  });
});
