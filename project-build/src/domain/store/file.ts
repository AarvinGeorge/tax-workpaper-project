import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { EventStore, NewEvent, WorkEvent } from '../contracts';
import { assertWorkspaceId } from './ids';

/** One JSON-lines file per workspace. Local development (and /tmp on a serverless instance). */
export class FileStore implements EventStore {
  constructor(private dir: string) {}
  private file(ws: string) {
    assertWorkspaceId(ws);
    return path.join(this.dir, `${ws}.jsonl`);
  }
  private read(ws: string): WorkEvent[] {
    const f = this.file(ws);
    if (!existsSync(f)) return [];
    return readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as WorkEvent);
  }
  async append(ws: string, e: NewEvent): Promise<WorkEvent> {
    const f = this.file(ws);
    mkdirSync(this.dir, { recursive: true });
    const list = this.read(ws);
    const last = list.length ? list[list.length - 1].seq : 0;
    const event: WorkEvent = { ...e, ws, seq: last + 1, at: new Date().toISOString() };
    appendFileSync(f, JSON.stringify(event) + '\n', 'utf8');
    return event;
  }
  async list(ws: string, afterSeq = 0): Promise<WorkEvent[]> {
    return this.read(ws).filter((e) => e.seq > afterSeq);
  }
}
