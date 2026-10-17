// Deploy-time ingest (vercel.json buildCommand, after the tests, before next build). Run: npx tsx scripts/ingest.ts
// Vault mode only (RETURN_ID, BLOB_READ_WRITE_TOKEN, DATA_ENCRYPTION_KEY set): encrypts data/packet.json (copied and
// SHA-checked by scripts/copy-packet.mjs) into the private Blob store if absent, and the measured eval payload
// (ai/eval/ai-suggestions.json) as the first production AI payload if none is stored. Every upload is read back,
// decrypted and its hash compared. Prints only hash prefixes and sizes. File mode: a no-op.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isVaultMode, PartialVaultConfigError } from '../src/domain/datamode';
import { aiBlobPath, packetBlobPath, readSealed, vaultKey, writeSealed } from '../src/server/vault';

type Env = Record<string, string | undefined>;
type Outcome = 'uploaded' | 'present' | 'skipped';
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

  let ai: Outcome = 'skipped';
  const evalBytes = readFileSync(path.join(root, 'ai', 'eval', 'ai-suggestions.json'));
  const evalPayload = JSON.parse(evalBytes.toString('utf8')) as { packetSha?: string; promptVersion?: string };
  if (evalPayload.packetSha !== id) log(`ai payload: eval payload is for another packet (${p12(String(evalPayload.packetSha))}), not uploaded`);
  else ai = await ensureBlob(aiBlobPath(id), evalBytes, true, env, log, `ai payload (${evalPayload.promptVersion})`);
  return { mode: 'vault' as const, packet, ai };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ingest().catch((e) => { console.error('ingest failed:', e instanceof Error ? e.message : e); process.exit(1); });
}
