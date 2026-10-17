import type { EventStore, NewEvent, WorkEvent } from '../contracts';
import { assertWorkspaceId } from './ids';

/** SQL for the one events table. seq is per workspace; the primary key turns a race into a retry. */
export const pgSql = {
  create: `CREATE TABLE IF NOT EXISTS workpaper_events (
  ws text NOT NULL, seq integer NOT NULL, at timestamptz NOT NULL DEFAULT now(), event jsonb NOT NULL,
  PRIMARY KEY (ws, seq))`,
  insert: `INSERT INTO workpaper_events (ws, seq, at, event)
  SELECT $1, COALESCE(MAX(seq), 0) + 1, now(), $2::jsonb FROM workpaper_events WHERE ws = $1
  RETURNING seq, at`,
  list: `SELECT seq, at, event FROM workpaper_events WHERE ws = $1 AND seq > $2 ORDER BY seq`,
};

type Pool = { query: (sql: string, args?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

export class PostgresStore implements EventStore {
  private pool: Promise<Pool> | null = null;
  private ready: Promise<unknown> | null = null;
  constructor(private url: string) {}
  private async db(): Promise<Pool> {
    if (!this.pool) {
      this.pool = import('pg').then((m) => {
        const PoolCtor = (m.default?.Pool ?? (m as unknown as { Pool: new (o: object) => Pool }).Pool) as unknown as new (o: object) => Pool;
        const ssl = /localhost|127\.0\.0\.1/.test(this.url) ? undefined : { rejectUnauthorized: false };
        return new PoolCtor({ connectionString: this.url, ssl, max: 3 });
      });
    }
    const pool = await this.pool;
    if (!this.ready) this.ready = pool.query(pgSql.create);
    await this.ready;
    return pool;
  }
  async append(ws: string, e: NewEvent): Promise<WorkEvent> {
    assertWorkspaceId(ws);
    const pool = await this.db();
    const body = { ...e, ws };
    for (let attempt = 0; ; attempt++) {
      try {
        const { rows } = await pool.query(pgSql.insert, [ws, JSON.stringify(body)]);
        const seq = Number(rows[0].seq);
        const at = new Date(rows[0].at as string).toISOString();
        return { ...body, seq, at };
      } catch (err) {
        if (attempt < 5 && (err as { code?: string }).code === '23505') continue; // unique violation: retry
        throw err;
      }
    }
  }
  async list(ws: string, afterSeq = 0): Promise<WorkEvent[]> {
    assertWorkspaceId(ws);
    const pool = await this.db();
    const { rows } = await pool.query(pgSql.list, [ws, afterSeq]);
    return rows.map((r) => ({ ...(r.event as NewEvent), ws, seq: Number(r.seq), at: new Date(r.at as string).toISOString() }));
  }
}
