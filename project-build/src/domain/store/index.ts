import os from 'node:os';
import path from 'node:path';
import type { EventStore } from '../contracts';
import { MemoryStore } from './memory';
import { FileStore } from './file';
import { PostgresStore } from './postgres';
import { BlobStore } from './blob';

export type StoreKind = 'memory' | 'file' | 'postgres' | 'blob';
type Env = Record<string, string | undefined>;

/** Postgres in production, file locally, memory in tests; Blob only as a fallback. WORKPAPER_STORE overrides. */
export function storeKind(env: Env = process.env): StoreKind {
  const forced = env.WORKPAPER_STORE as StoreKind | undefined;
  if (forced && ['memory', 'file', 'postgres', 'blob'].includes(forced)) return forced;
  if (env.NODE_ENV === 'test' || env.VITEST) return 'memory';
  if (env.DATABASE_URL || env.POSTGRES_URL) return 'postgres';
  if (env.BLOB_READ_WRITE_TOKEN) return 'blob';
  return 'file';
}

const g = globalThis as unknown as { __workpaperStore?: EventStore };

export function getStore(): EventStore {
  if (g.__workpaperStore) return g.__workpaperStore;
  const env = process.env;
  const kind = storeKind(env);
  let store: EventStore;
  if (kind === 'postgres') store = new PostgresStore((env.DATABASE_URL || env.POSTGRES_URL)!);
  else if (kind === 'blob') store = new BlobStore();
  else if (kind === 'memory') store = new MemoryStore();
  else {
    // Serverless file systems are read-only except the temp folder (per instance, not durable).
    const dir = env.VERCEL ? path.join(os.tmpdir(), 'workpaper-events') : path.join(process.cwd(), '.data', 'events');
    store = new FileStore(dir);
  }
  g.__workpaperStore = store;
  return store;
}

export { MemoryStore, FileStore, PostgresStore, BlobStore };
