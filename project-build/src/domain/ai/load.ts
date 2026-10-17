// Reads the AI payload (data/ai-suggestions.json, or AI_PAYLOAD_PATH) as untrusted input. Never throws.
// Envelope and core fields are strict; unknown extra fields are ignored; an invalid row is held back with its reasons;
// a payload made for another packet is refused whole. Absent file: no AI section, the app is unchanged.
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { loadPacket, type PacketIndex } from '../packet/load';
import { AI_KINDS, type AiEvidence, type AiPayload, type AiRejected, type AiSuggestion } from './contract';

/** A suggestion that will not be shown, and why. id is null when the row has no usable id. */
export interface AiHeld { id: string | null; reasons: string[] }

export type AiLoad =
  | { status: 'absent' }
  | { status: 'refused'; reason: string; held: AiHeld[] }
  | { status: 'loaded'; payload: AiPayload; held: AiHeld[] };

export function aiPayloadPath(): string {
  return process.env.AI_PAYLOAD_PATH || path.join(process.cwd(), 'data', 'ai-suggestions.json');
}

let fileSha: string | null = null;
const shaCache = new WeakMap<object, string>();

/** SHA-256 of the packet the index was built from: the bytes of data/packet.json for the loaded packet. Any other packet
 *  (an altered test copy) hashes its JSON, so no payload made for the delivered packet matches it. */
export function packetShaOf(ix: PacketIndex): string {
  if (ix.packet === loadPacket()) {
    if (!fileSha) fileSha = createHash('sha256').update(readFileSync(path.join(process.cwd(), 'data', 'packet.json'))).digest('hex');
    return fileSha;
  }
  const hit = shaCache.get(ix.packet);
  if (hit) return hit;
  const sha = createHash('sha256').update(JSON.stringify(ix.packet)).digest('hex');
  shaCache.set(ix.packet, sha);
  return sha;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const ID = /^[A-Za-z0-9._-]{1,80}$/;

/** Core fields of one suggestion, copied (extra fields dropped). Returns the reasons when the row is invalid. */
function readSuggestion(raw: unknown): { ok: true; s: AiSuggestion } | { ok: false; id: string | null; reasons: string[] } {
  if (!isObj(raw)) return { ok: false, id: null, reasons: ['Not an object.'] };
  const reasons: string[] = [];
  const id = isStr(raw.id) && ID.test(raw.id) ? raw.id : null;
  if (!id) reasons.push('id must be a short id of letters, digits, dots, dashes or underscores.');
  const kind = raw.kind;
  if (!(AI_KINDS as readonly unknown[]).includes(kind)) reasons.push(`kind must be one of: ${AI_KINDS.join(', ')}.`);
  const otherKind = raw.otherKind ?? null;
  if (otherKind !== null && typeof otherKind !== 'string') reasons.push('otherKind must be text or null.');
  if (kind === 'other' && !isStr(otherKind)) reasons.push('otherKind is required when kind is other.');
  const claims = raw.claims;
  if (!Array.isArray(claims) || !claims.every((c) => isStr(c))) reasons.push('claims must be a list of line keys.');
  const evidence: AiEvidence[] = [];
  if (!Array.isArray(raw.evidence) || raw.evidence.length === 0) reasons.push('evidence must list at least one quote.');
  else raw.evidence.forEach((e, i) => {
    if (!isObj(e) || !isStr(e.doc) || !(Number.isInteger(e.page) && (e.page as number) >= 1) || !isStr(e.quote)) {
      reasons.push(`evidence ${i + 1} needs doc, page (a whole number from 1) and a quote.`);
    } else evidence.push({ doc: e.doc, page: e.page as number, quote: e.quote });
  });
  if (!isStr(raw.rationale)) reasons.push('rationale is required.');
  if (raw.authority !== null && raw.authority !== undefined && typeof raw.authority !== 'string') reasons.push('authority must be text or null.');
  const conf = raw.confidence;
  if (typeof conf !== 'number' || !Number.isFinite(conf) || conf < 0 || conf > 1) reasons.push('confidence must be a number from 0 to 1.');
  if (reasons.length) return { ok: false, id, reasons };
  return {
    ok: true,
    s: {
      id: id!, kind: kind as AiSuggestion['kind'], otherKind: otherKind as string | null, claims: claims as string[], evidence,
      rationale: raw.rationale as string, authority: (raw.authority as string | null | undefined) ?? null, confidence: conf as number,
    },
  };
}

/** Validates a parsed payload against the packet it must have been made for. Never throws. */
export function parseAiPayload(raw: unknown, expectedSha: string): AiLoad {
  if (!isObj(raw)) return { status: 'refused', reason: 'The AI payload is not a JSON object.', held: [] };
  const rows = Array.isArray(raw.suggestions) ? raw.suggestions : null;
  const all = (reason: string): AiHeld[] => (rows ?? []).map((r) => ({ id: isObj(r) && isStr(r.id) ? r.id : null, reasons: [reason] }));
  const env: string[] = [];
  if (raw.schemaVersion !== 1) env.push('schemaVersion must be 1');
  for (const k of ['packetSha', 'model', 'promptVersion', 'runAt'] as const) if (!isStr(raw[k])) env.push(`${k} is required`);
  if (isStr(raw.runAt) && Number.isNaN(Date.parse(raw.runAt))) env.push('runAt must be a date and time');
  if (!rows) env.push('suggestions must be a list');
  if (raw.rejected !== undefined && !Array.isArray(raw.rejected)) env.push('rejected must be a list');
  if (env.length) {
    const reason = `The AI payload was refused: ${env.join('; ')}.`;
    return { status: 'refused', reason, held: all(reason) };
  }
  if (raw.packetSha !== expectedSha) {
    const reason = 'Made for a different packet: its packet hash does not match the loaded packet.';
    return { status: 'refused', reason, held: all(reason) };
  }
  const suggestions: AiSuggestion[] = [];
  const held: AiHeld[] = [];
  const seen = new Set<string>();
  for (const r of rows!) {
    const v = readSuggestion(r);
    if (!v.ok) { held.push({ id: v.id, reasons: v.reasons }); continue; }
    if (seen.has(v.s.id)) { held.push({ id: v.s.id, reasons: ['Duplicate id: an earlier suggestion has the same id.'] }); continue; }
    seen.add(v.s.id);
    suggestions.push(v.s);
  }
  const payload: AiPayload = {
    schemaVersion: 1, packetSha: raw.packetSha as string, model: raw.model as string, promptVersion: raw.promptVersion as string,
    runAt: raw.runAt as string, suggestions, rejected: (raw.rejected as AiRejected[] | undefined) ?? [],
  };
  return { status: 'loaded', payload, held };
}

const cache = new Map<string, { mtimeMs: number; sha: string; result: AiLoad }>();

/** Reads and validates the payload file (default data/ai-suggestions.json; AI_PAYLOAD_PATH overrides). Cached per file
 *  until the file changes. */
export function loadAiPayload(ix: PacketIndex, file: string = aiPayloadPath()): AiLoad {
  let mtimeMs: number;
  try { mtimeMs = statSync(file).mtimeMs; } catch { return { status: 'absent' }; }
  const sha = packetShaOf(ix);
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === mtimeMs && hit.sha === sha) return hit.result;
  let result: AiLoad;
  try {
    result = parseAiPayload(JSON.parse(readFileSync(file, 'utf8')), sha);
  } catch {
    result = { status: 'refused', reason: 'The AI payload could not be read as JSON.', held: [] };
  }
  cache.set(file, { mtimeMs, sha, result });
  return result;
}
