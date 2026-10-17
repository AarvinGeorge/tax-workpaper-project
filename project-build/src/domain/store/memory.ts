import type { EventStore, NewEvent, WorkEvent } from '../contracts';

/** In-process store: tests, and a last-resort fallback. Lost on restart. */
export class MemoryStore implements EventStore {
  private byWs = new Map<string, WorkEvent[]>();
  async append(ws: string, e: NewEvent): Promise<WorkEvent> {
    const list = this.byWs.get(ws) ?? [];
    const event: WorkEvent = { ...e, ws, seq: list.length + 1, at: new Date().toISOString() };
    list.push(event);
    this.byWs.set(ws, list);
    return structuredClone(event);
  }
  async list(ws: string, afterSeq = 0): Promise<WorkEvent[]> {
    return (this.byWs.get(ws) ?? []).filter((e) => e.seq > afterSeq).map((e) => structuredClone(e));
  }
}
