// The data source switch. File mode (local dev, tests): nothing to do; the packet and the AI payload are read from disk
// as before. Vault mode (RETURN_ID, BLOB_READ_WRITE_TOKEN and DATA_ENCRYPTION_KEY all set): the packet is fetched from
// the private Blob store by its pointer (RETURN_ID, the packet's SHA-256), decrypted, hash-checked (fail closed) and
// put into the cache loadPacket() uses; the AI payload is fetched the same way and re-checked at most every 5 minutes,
// so a cloud reader run shows up without a redeploy. Call ensureReturnData() before anything that reads the packet.
import { createHash } from 'node:crypto';
import { isVaultMode } from '@/domain/datamode';
import { isPacketPrimed, primePacket } from '@/domain/packet/load';
import type { Packet } from '@/domain/packet/types';
import { setVaultAiPayload } from '@/domain/ai/load';
import { aiBlobPath, packetBlobPath, readSealed } from './vault';

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
