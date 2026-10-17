// Client data at rest: AES-256-GCM envelopes in a private Vercel Blob store. Server only.
// Envelope: 1 version byte | 12-byte IV | 16-byte auth tag | ciphertext. The blob path is the additional authenticated
// data, so an envelope moved to another path (another return) fails to open.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { get, put } from '@vercel/blob';

type Env = Record<string, string | undefined>;

const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER = 1 + IV_BYTES + TAG_BYTES;
const SHA_RE = /^[0-9a-f]{64}$/;

/** The 32-byte key from DATA_ENCRYPTION_KEY (base64). Throws a clear error, never the value. */
export function vaultKey(env: Env = process.env): Buffer {
  const raw = env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error('DATA_ENCRYPTION_KEY is not set.');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error(`DATA_ENCRYPTION_KEY must be base64 of 32 bytes (it decodes to ${key.length}).`);
  return key;
}

export function seal(plain: Buffer, key: Buffer, aad: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const c = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(aad, 'utf8'));
  const body = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, c.getAuthTag(), body]);
}

/** Throws on a wrong key, a wrong path, an unknown version or any changed byte. */
export function unseal(sealed: Buffer, key: Buffer, aad: string): Buffer {
  if (sealed.length < HEADER) throw new Error('Vault envelope is too short.');
  if (sealed[0] !== VERSION) throw new Error(`Vault envelope version ${sealed[0]} is not supported.`);
  const d = createDecipheriv('aes-256-gcm', key, sealed.subarray(1, 1 + IV_BYTES));
  d.setAAD(Buffer.from(aad, 'utf8'));
  d.setAuthTag(sealed.subarray(1 + IV_BYTES, HEADER));
  try {
    return Buffer.concat([d.update(sealed.subarray(HEADER)), d.final()]);
  } catch {
    throw new Error(`Vault envelope at ${aad} failed authentication (wrong key or altered bytes).`);
  }
}

function returnDir(sha: string): string {
  if (!SHA_RE.test(sha)) throw new Error('A return id must be a SHA-256 hex digest.');
  return `returns/${sha}`;
}
export const packetBlobPath = (sha: string) => `${returnDir(sha)}/packet.json.enc`;
export const aiBlobPath = (sha: string) => `${returnDir(sha)}/ai-suggestions.json.enc`;

/** Reads and decrypts one private blob; null when it does not exist. Bypasses the CDN cache (always the latest). */
export async function readSealed(pathname: string, env: Env = process.env): Promise<Buffer | null> {
  const key = vaultKey(env);
  const r = await get(pathname, { access: 'private', useCache: false, token: env.BLOB_READ_WRITE_TOKEN }); // 404: null
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  const sealed = Buffer.from(await new Response(r.stream).arrayBuffer());
  return unseal(sealed, key, pathname);
}

/** Encrypts and writes one private blob at a fixed path (no random suffix). overwrite only for the AI payload. */
export async function writeSealed(pathname: string, plain: Buffer, opts: { overwrite: boolean }, env: Env = process.env): Promise<void> {
  const sealed = seal(plain, vaultKey(env), pathname);
  await put(pathname, sealed, {
    access: 'private', addRandomSuffix: false, allowOverwrite: opts.overwrite,
    contentType: 'application/octet-stream', token: env.BLOB_READ_WRITE_TOKEN,
  });
}
