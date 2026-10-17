import type { EventStore, NewEvent, WorkEvent } from '../contracts';
import { assertWorkspaceId } from './ids';

/** Fallback only (no database provisioned): one blob per event; no atomic sequence, so order is the
 *  time-sortable key and seq is the position in that order. */
export const blobPrefix = (ws: string) => `workpaper/${ws}/`;
export function blobKey(ws: string, at: Date, rand: string): string {
  return `${blobPrefix(ws)}${at.getTime().toString().padStart(15, '0')}-${rand}.json`;
}
export function seqFromKeys(keys: string[]): [string, number][] {
  return [...keys].sort().map((k, i) => [k, i + 1]);
}

type BlobMod = {
  put: (key: string, body: string, o: object) => Promise<{ url: string }>;
  list: (o: object) => Promise<{ blobs: { pathname: string; url: string }[]; cursor?: string; hasMore: boolean }>;
};

export class BlobStore implements EventStore {
  private mod: Promise<BlobMod> | null = null;
  private lib() { return (this.mod ??= import('@vercel/blob') as unknown as Promise<BlobMod>); }
  private async all(ws: string): Promise<{ pathname: string; url: string }[]> {
    const { list } = await this.lib();
    const out: { pathname: string; url: string }[] = [];
    let cursor: string | undefined;
    do {
      const r = await list({ prefix: blobPrefix(ws), cursor });
      out.push(...r.blobs);
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return out;
  }
  async append(ws: string, e: NewEvent): Promise<WorkEvent> {
    assertWorkspaceId(ws);
    const { put } = await this.lib();
    const now = new Date();
    const key = blobKey(ws, now, Math.random().toString(36).slice(2, 8));
    const body = { ...e, ws, at: now.toISOString() };
    await put(key, JSON.stringify(body), { access: 'public', contentType: 'application/json', addRandomSuffix: false });
    const seq = seqFromKeys((await this.all(ws)).map((b) => b.pathname)).find(([k]) => k === key)?.[1] ?? 0;
    return { ...body, seq };
  }
  async list(ws: string, afterSeq = 0): Promise<WorkEvent[]> {
    assertWorkspaceId(ws);
    const blobs = await this.all(ws);
    const urlOf = new Map(blobs.map((b) => [b.pathname, b.url]));
    const ordered = seqFromKeys(blobs.map((b) => b.pathname)).filter(([, s]) => s > afterSeq);
    return Promise.all(ordered.map(async ([k, seq]) => {
      const r = await fetch(urlOf.get(k)!, { cache: 'no-store' });
      return { ...((await r.json()) as WorkEvent), seq };
    }));
  }
}
