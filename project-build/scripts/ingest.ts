// Deploy-time ingest (vercel.json buildCommand, after the tests, before next build). Run: npx tsx scripts/ingest.ts
// Vault mode only (RETURN_ID, BLOB_READ_WRITE_TOKEN, DATA_ENCRYPTION_KEY set): encrypts data/packet.json (copied and
// SHA-checked by scripts/copy-packet.mjs) into the private Blob store if absent, and the active AI producer's committed
// payload (ai/lib/producer.ts) as the production AI payload: sealed if none is stored, kept when the stored bytes are
// the same, replaced when they differ (another producer or prompt version, or a new run). Before sealing, the committed
// payload must be for this packet and every suggestion must pass the verifier, or the build stops. Every upload is read
// back, decrypted and its hash compared. Prints only hash prefixes and sizes. File mode: a no-op.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isVaultMode, PartialVaultConfigError } from '../src/domain/datamode';
import { aiBlobPath, packetBlobPath, readSealed, vaultKey, writeSealed } from '../src/server/vault';
import { indexPacket } from '../src/domain/packet/load';
import type { Packet } from '../src/domain/packet/types';
import type { AiPayload } from '../src/domain/ai/contract';
import { isShown, verifySuggestions } from '../src/domain/ai/verify';
import { ACTIVE_PAYLOAD_FILE, ACTIVE_PRODUCER } from '../ai/lib/producer';

type Env = Record<string, string | undefined>;
type Outcome = 'uploaded' | 'present' | 'replaced' | 'skipped';
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const p12 = (s: string) => s.slice(0, 12);

/** Uploads plain to pathname unless something is there; verifies the stored copy either way (it must decrypt, and pass
 *  checkPresent when given). */
async function ensureBlob(pathname: string, plain: Buffer, overwrite: boolean, env: Env, log: (s: string) => void, label: string, checkPresent?: (b: Buffer) => void): Promise<Outcome> {
  const existing = await readSealed(pathname, env);
  if (existing) {
    checkPresent?.(existing);
    log(`${label}: present (${existing.length} bytes, sha ${p12(sha(existing))}), decrypted and kept`);
    return 'present';
  }
  await writeSealed(pathname, plain, { overwrite }, env);
  const back = await readSealed(pathname, env);
  if (!back || sha(back) !== sha(plain)) throw new Error(`${label}: read-back after upload does not match (sha ${p12(back ? sha(back) : 'none')}).`);
  log(`${label}: uploaded and verified (${plain.length} bytes, sha ${p12(sha(plain))})`);
  return 'uploaded';
}

/** The active producer's committed payload, checked (this packet, every suggestion verified), then sealed: kept when
 *  the stored bytes are the same, else written, read back and hash-checked. Refuses (throws) rather than seal a payload
 *  that would show anything unverified, so what is live is never replaced by worse. */
async function sealActivePayload(id: string, packetBytes: Buffer, env: Env, log: (s: string) => void, root: string): Promise<Outcome> {
  const file = path.join(root, ACTIVE_PAYLOAD_FILE);
  if (!existsSync(file)) throw new Error(`ai payload: no committed payload for the active producer (${ACTIVE_PRODUCER}) at ${ACTIVE_PAYLOAD_FILE}.`);
  const committed = readFileSync(file);
  const payload = JSON.parse(committed.toString('utf8')) as AiPayload;
  const label = `ai payload (${ACTIVE_PRODUCER}, ${String(payload.promptVersion)})`;
  if (payload.packetSha !== id) throw new Error(`${label}: made for another packet (${p12(String(payload.packetSha))}), not sealed.`);
  if (!Array.isArray(payload.suggestions)) throw new Error(`${label}: has no suggestions list, not sealed.`);
  const failed = verifySuggestions(indexPacket(JSON.parse(packetBytes.toString('utf8')) as Packet), payload).filter((v) => !isShown(v));
  if (failed.length) throw new Error(`${label}: ${failed.length} suggestion(s) fail verification (${failed.map((v) => v.id).join(', ')}), not sealed.`);
  const pathname = aiBlobPath(id);
  const existing = await readSealed(pathname, env);
  if (existing && sha(existing) === sha(committed)) {
    log(`${label}: present (${existing.length} bytes, sha ${p12(sha(existing))}), decrypted and kept`);
    return 'present';
  }
  await writeSealed(pathname, committed, { overwrite: true }, env);
  const back = await readSealed(pathname, env);
  if (!back || sha(back) !== sha(committed)) throw new Error(`${label}: read-back after upload does not match (sha ${p12(back ? sha(back) : 'none')}).`);
  log(`${label}: ${existing ? `replaced and verified (was sha ${p12(sha(existing))})` : 'uploaded and verified'} (${committed.length} bytes, sha ${p12(sha(committed))})`);
  return existing ? 'replaced' : 'uploaded';
}

export async function ingest(env: Env = process.env, log: (s: string) => void = console.log, root: string = process.cwd()) {
  let vault: boolean;
  try {
    vault = isVaultMode(env);
  } catch (e) {
    if (e instanceof PartialVaultConfigError) {
      throw new Error(`${e.message} Client data is production-only: a deployment without all three (Preview has the Blob token only) stops here by design.`);
    }
    throw e;
  }
  if (!vault) {
    log('file mode, nothing to ingest');
    return { mode: 'file' as const };
  }
  vaultKey(env); // fails here, with a clear message, if the key is malformed
  const id = env.RETURN_ID!;
  const bytes = readFileSync(path.join(root, 'data', 'packet.json'));
  if (sha(bytes) !== id) throw new Error(`RETURN_ID ${p12(id)} is not the SHA-256 of data/packet.json (${p12(sha(bytes))}).`);
  log(`ingest: return ${p12(id)}`);
  const packet = await ensureBlob(packetBlobPath(id), bytes, false, env, log, 'packet', (b) => {
    if (sha(b) !== id) throw new Error(`packet: the stored copy does not hash to RETURN_ID ${p12(id)}.`);
  });

  const ai = await sealActivePayload(id, bytes, env, log, root);
  return { mode: 'vault' as const, packet, ai };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ingest().catch((e) => { console.error('ingest failed:', e instanceof Error ? e.message : e); process.exit(1); });
}
