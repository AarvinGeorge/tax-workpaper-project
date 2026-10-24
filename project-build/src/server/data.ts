// The data source switch. File mode (local dev, tests): nothing to do; the packet and the AI payload are read from disk
// as before. Vault mode (RETURN_ID, BLOB_READ_WRITE_TOKEN and DATA_ENCRYPTION_KEY all set): the packet is fetched from
// the private Blob store by its pointer (RETURN_ID, the packet's SHA-256), decrypted, hash-checked (fail closed) and
// put into the cache loadPacket() uses; the AI payload is fetched the same way and re-checked at most every 5 minutes,
// so a cloud reader run shows up without a redeploy. Call ensureReturnData() before anything that reads the packet.
// One door to the store: this module is the only runtime code that touches the vault. The AI jobs read the packet
// through ensureReturnData() and save their output through saveAiPayload(), which verifies it before sealing.
import { createHash } from 'node:crypto';
import { isVaultMode } from '@/domain/datamode';
import { isPacketPrimed, primePacket } from '@/domain/packet/load';
import type { Packet } from '@/domain/packet/types';
import { setVaultAiPayload } from '@/domain/ai/load';
import type { AiPayload } from '@/domain/ai/contract';
import { isShown, SSN_SHAPED, verifySuggestions } from '@/domain/ai/verify';
import type { PacketIndex } from '@/domain/packet/load';
import { aiBlobPath, packetBlobPath, readSealed, writeSealed } from './vault';

type Env = Record<string, string | undefined>;

export const AI_RECHECK_MS = 5 * 60_000;

export const dataMode = (env: Env = process.env): 'file' | 'vault' => (isVaultMode(env) ? 'vault' : 'file');

let packetInFlight: Promise<void> | null = null;
let aiInFlight: Promise<void> | null = null;
let aiCheckedAt: number | null = null;

async function warmPacket(env: Env): Promise<void> {
  const id = env.RETURN_ID!;
  const bytes = await readSealed(packetBlobPath(id), env);
  if (!bytes) throw new Error(`Return data not found in the vault for return ${id.slice(0, 12)}: run the ingest (scripts/ingest.ts).`);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== id) throw new Error(`Return data failed its integrity check: SHA-256 ${sha.slice(0, 12)} does not match RETURN_ID ${id.slice(0, 12)}.`);
  primePacket(JSON.parse(bytes.toString('utf8')) as Packet, sha);
}

async function refreshAi(env: Env, now: () => number): Promise<void> {
  try {
    const bytes = await readSealed(aiBlobPath(env.RETURN_ID!), env);
    let raw: unknown = null;
    if (bytes) {
      try { raw = JSON.parse(bytes.toString('utf8')); } catch { raw = 'unreadable'; } // refused by the loader, never thrown
    }
    setVaultAiPayload(raw);
  } catch (err) {
    // A broken AI payload never breaks the workspace: keep what was loaded before, try again after the interval.
    console.error('AI payload not refreshed:', err instanceof Error ? err.message : 'unknown error');
  }
  aiCheckedAt = now();
}

export async function ensureReturnData(env: Env = process.env, now: () => number = Date.now): Promise<void> {
  if (!isVaultMode(env)) return;
  if (!isPacketPrimed()) {
    packetInFlight ??= warmPacket(env).finally(() => { packetInFlight = null; });
    await packetInFlight;
  }
  if (aiCheckedAt === null || now() - aiCheckedAt >= AI_RECHECK_MS) {
    aiInFlight ??= refreshAi(env, now).finally(() => { aiInFlight = null; });
    await aiInFlight;
  }
}

/** The next ensureReturnData() fetches the AI payload again (after the cloud reader stores a new one). */
export function forceAiRecheck(): void {
  aiCheckedAt = null;
}

/** The stored AI payload's envelope (which packet and prompt version made it), or null when absent, undecryptable or
 *  unparseable: all of those count as stale, so the reader runs again. */
export async function storedAiPayloadInfo(env: Env = process.env): Promise<{ packetSha?: unknown; promptVersion?: unknown } | null> {
  try {
    const stored = await readSealed(aiBlobPath(env.RETURN_ID!), env);
    return stored ? (JSON.parse(stored.toString('utf8')) as { packetSha?: unknown; promptVersion?: unknown }) : null;
  } catch (err) {
    console.error('AI payload unreadable, treating as stale:', err instanceof Error ? err.message : 'unknown error');
    return null;
  }
}

/** Seals an AI payload into the store, verified first: a suggestion that fails the verifier (quote not on its page,
 *  unvetted authority, superseded evidence, too long) moves to rejected with its reasons; a payload made for another
 *  packet, or carrying SSN-shaped text anywhere, is refused whole. The app re-verifies again when it loads it. */
export async function saveAiPayload(ix: PacketIndex, payload: AiPayload, env: Env = process.env): Promise<{ suggestions: number; rejected: number }> {
  const id = env.RETURN_ID!;
  if (payload.packetSha !== id) throw new Error('The AI payload was made for another packet; not stored.');
  const checked = verifySuggestions(ix, payload);
  const kept = payload.suggestions.filter((_, i) => isShown(checked[i]));
  // A failed row keeps only its id and reasons: its quote could carry an identifier and must never block the good rows.
  const failed = checked.filter((v) => !isShown(v))
    .map((v) => ({ raw: { id: v.id }, reason: `failed verification before storing: ${v.problems.join('; ')}`.replace(new RegExp(SSN_SHAPED.source, 'g'), '[redacted]') }));
  const out: AiPayload = { ...payload, suggestions: kept, rejected: [...payload.rejected, ...failed] };
  const text = JSON.stringify(out);
  if (SSN_SHAPED.test(text)) throw new Error('The AI payload carries SSN-shaped text; not stored.');
  await writeSealed(aiBlobPath(id), Buffer.from(text), { overwrite: true }, env);
  forceAiRecheck();
  return { suggestions: kept.length, rejected: out.rejected.length };
}
