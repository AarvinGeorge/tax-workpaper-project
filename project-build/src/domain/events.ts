// Events: the only thing saved. The packet is read-only; every action is an appended event.
import type { EventType, NewEvent, WorkEvent } from './contracts';

export const EVENT_TYPES: readonly EventType[] = [
  'adjustment', 'review_note', 'note_resolved', 'signoff', 'question_to_client', 'answer_recorded', 'reason_set',
  'reveal', 'clock_moved', 'undo', 'assignment', 'attach_note', 'time_logged', 'verification', 'decision',
  'question_to_colleague', 'finding_cleared',
];

/** 'line:<KEY>', 'doc:<ID>', 'finding:<ID>' (plus 'question:<seq>' and 'return' for whole-return items). */
export const CLAIM_ID = /^(?:(?:line|doc|finding|question):[A-Za-z0-9._#:/-]{1,100}|return)$/;

/** What the client sends: the server adds ws, role (from the path) and storyAt (from the workspace clock). */
export type EventInput = Pick<NewEvent, 'type' | 'payload'> & Partial<Pick<NewEvent, 'claimId' | 'baseVersion' | 'groupId' | 'retracts'>>;

const MAX_PAYLOAD = 8000;

export function validateNewEvent(x: unknown): { ok: true; event: EventInput } | { ok: false; reason: string } {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { ok: false, reason: 'Event must be a JSON object.' };
  const o = x as Record<string, unknown>;
  if (typeof o.type !== 'string' || !EVENT_TYPES.includes(o.type as EventType)) return { ok: false, reason: 'Unknown event type.' };
  if (!o.payload || typeof o.payload !== 'object' || Array.isArray(o.payload)) return { ok: false, reason: 'payload must be an object.' };
  if (JSON.stringify(o.payload).length > MAX_PAYLOAD) return { ok: false, reason: 'payload is too large.' };
  if (o.claimId !== undefined && (typeof o.claimId !== 'string' || !CLAIM_ID.test(o.claimId))) return { ok: false, reason: 'Invalid claimId.' };
  if (o.baseVersion !== undefined && !(Number.isInteger(o.baseVersion) && (o.baseVersion as number) >= 0)) return { ok: false, reason: 'Invalid baseVersion.' };
  if (o.retracts !== undefined && !(Number.isInteger(o.retracts) && (o.retracts as number) > 0)) return { ok: false, reason: 'Invalid retracts.' };
  if (o.groupId !== undefined && (typeof o.groupId !== 'string' || !/^[A-Za-z0-9-]{1,40}$/.test(o.groupId))) return { ok: false, reason: 'Invalid groupId.' };
  const event: EventInput = { type: o.type as EventType, payload: o.payload as Record<string, unknown> };
  if (o.claimId !== undefined) event.claimId = o.claimId as string;
  if (o.baseVersion !== undefined) event.baseVersion = o.baseVersion as number;
  if (o.retracts !== undefined) event.retracts = o.retracts as number;
  if (o.groupId !== undefined) event.groupId = o.groupId as string;
  return { ok: true, event };
}

/** Seqs undone by undo events (one event by `retracts`, or a whole group by `groupId`). Undos are not themselves undone. */
export function retractedSeqs(events: WorkEvent[]): Set<number> {
  const out = new Set<number>();
  for (const u of events) {
    if (u.type !== 'undo') continue;
    if (u.retracts) out.add(u.retracts);
    else if (u.groupId) for (const e of events) if (e.groupId === u.groupId && e.type !== 'undo' && e.seq < u.seq) out.add(e.seq);
  }
  return out;
}

export const isApplied = (e: WorkEvent) => e.type === 'adjustment' && e.payload.status !== 'proposed';
