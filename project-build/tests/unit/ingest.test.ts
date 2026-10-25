// The deploy-time ingest: a no-op in file mode; in vault mode it encrypts and uploads what is absent and verifies each
// upload by reading it back. @vercel/blob is mocked: no network.
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blobs, calls, resetBlobs } from '../fixtures/blob-mock';
import { indexPacket } from '@/domain/packet/load';
import { isShown, verifySuggestions } from '@/domain/ai/verify';

vi.mock('@vercel/blob', async () => (await import('../fixtures/blob-mock')).blobMock);

const bytes = readFileSync(path.join(process.cwd(), 'data', 'packet.json'));
const SHA = createHash('sha256').update(bytes).digest('hex');
const vaultEnv = () => ({ RETURN_ID: SHA, BLOB_READ_WRITE_TOKEN: 'test-token', DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64') });

beforeEach(() => { resetBlobs(); });

// A root of its own: the packet copy and a committed active-producer payload made from the reader's committed (fully
// grounded) payload, retagged to the active prompt version. The live agent payload file is never read here.
const readerAll = JSON.parse(readFileSync(path.join(process.cwd(), 'ai/eval/ai-suggestions.json'), 'utf8'));
// Only the suggestions that pass the verifier (the committed reader payload holds one it holds back).
const readerPayload = { ...readerAll, suggestions: verifySuggestions(indexPacket(JSON.parse(bytes.toString('utf8'))), readerAll).filter(isShown).map(({ grounded: _g, problems: _p, ...s }) => s) };
async function rootWith(payload: unknown | null) {
  const { ACTIVE_PAYLOAD_FILE } = await import('../../ai/lib/producer');
  const root = mkdtempSync(path.join(tmpdir(), 'ingest-'));
  mkdirSync(path.join(root, 'data'), { recursive: true });
  writeFileSync(path.join(root, 'data', 'packet.json'), bytes);
  mkdirSync(path.dirname(path.join(root, ACTIVE_PAYLOAD_FILE)), { recursive: true });
  if (payload !== null) writeFileSync(path.join(root, ACTIVE_PAYLOAD_FILE), JSON.stringify(payload));
  return { root, file: path.join(root, ACTIVE_PAYLOAD_FILE), done: () => rmSync(root, { recursive: true, force: true }) };
}
async function activePayload(extra: Record<string, unknown> = {}) {
  const { ACTIVE_PROMPT_VERSION } = await import('../../ai/lib/producer');
  return { ...readerPayload, packetSha: SHA, promptVersion: ACTIVE_PROMPT_VERSION, ...extra };
}
async function stored(env: Record<string, string>) {
  const vault = await import('@/server/vault');
  const p = vault.aiBlobPath(SHA);
  return blobs.has(p) ? vault.unseal(blobs.get(p)!, vault.vaultKey(env), p) : null;
}
async function seed(env: Record<string, string>, payload: unknown) {
  const vault = await import('@/server/vault');
  const p = vault.aiBlobPath(SHA);
  blobs.set(p, vault.seal(Buffer.from(JSON.stringify(payload)), vault.vaultKey(env), p));
}

describe('ingest', () => {
  it('file mode: prints the no-op line and touches no blob', async () => {
    const { ingest } = await import('../../scripts/ingest');
    const lines: string[] = [];
    const r = await ingest({}, (s) => lines.push(s));
    expect(r.mode).toBe('file');
    expect(lines).toEqual(['file mode, nothing to ingest']);
    expect(calls).toHaveLength(0);
  });

  it('vault mode: uploads the packet and the active producer\'s payload once, verified, printing only prefixes and sizes', async () => {
    const { ingest } = await import('../../scripts/ingest');
    const r0 = await rootWith(await activePayload());
    const env = vaultEnv();
    const lines: string[] = [];
    const r = await ingest(env, (s) => lines.push(s), r0.root);
    expect(r).toMatchObject({ mode: 'vault', packet: 'uploaded', ai: 'uploaded' });
    expect([...blobs.keys()].sort()).toEqual([`returns/${SHA}/ai-suggestions.json.enc`, `returns/${SHA}/packet.json.enc`]);
    expect(calls.filter((c) => c.op === 'put').every((c) => c.options.access === 'private' && c.options.addRandomSuffix === false)).toBe(true);
    const out = lines.join('\n');
    expect(out).not.toContain(SHA); // prefixes only
    expect(out).toContain(SHA.slice(0, 12));
    expect((await stored(env))!.equals(readFileSync(r0.file))).toBe(true);
    const again = await ingest(env, () => {}, r0.root);
    expect(again).toMatchObject({ packet: 'present', ai: 'present' }); // same bytes: kept
    expect(calls.filter((c) => c.op === 'put')).toHaveLength(2);
    r0.done();
  });

  it('a stored payload from another producer (another prompt version) is replaced by the committed one, read back and hash-checked', async () => {
    const { ingest } = await import('../../scripts/ingest');
    const r0 = await rootWith(await activePayload());
    const env = vaultEnv();
    await ingest(env, () => {}, r0.root); // packet in place
    await seed(env, { ...readerPayload, packetSha: SHA }); // the reader's payload is what is live
    const lines: string[] = [];
    const r = await ingest(env, (s) => lines.push(s), r0.root);
    expect(r).toMatchObject({ packet: 'present', ai: 'replaced' });
    expect((await stored(env))!.equals(readFileSync(r0.file))).toBe(true);
    expect(lines.join('\n')).toMatch(/replaced and verified/);
    r0.done();
  });

  it('same prompt version but different bytes is replaced too', async () => {
    const { ingest } = await import('../../scripts/ingest');
    const r0 = await rootWith(await activePayload());
    const env = vaultEnv();
    await ingest(env, () => {}, r0.root);
    await seed(env, await activePayload({ runAt: '2020-01-01T00:00:00Z' }));
    expect(await ingest(env, () => {}, r0.root)).toMatchObject({ ai: 'replaced' });
    r0.done();
  });

  it('refuses to seal a committed payload with a suggestion that fails verification; what is stored is untouched', async () => {
    const { ingest } = await import('../../scripts/ingest');
    const good = await activePayload();
    const s0 = good.suggestions[0];
    const bad = { ...good, suggestions: [...good.suggestions, { ...s0, id: s0.id + '-x', evidence: [{ ...s0.evidence[0], quote: 'This sentence is not printed on any page of the packet.' }] }] };
    const r0 = await rootWith(bad);
    const env = vaultEnv();
    await seed(env, { ...readerPayload, packetSha: SHA });
    const before = await stored(env);
    await expect(ingest(env, () => {}, r0.root)).rejects.toThrow(/fail verification/);
    expect((await stored(env))!.equals(before!)).toBe(true);
    r0.done();
  });

  it('refuses a committed payload made for another packet, and a missing one', async () => {
    const { ingest } = await import('../../scripts/ingest');
    const env = vaultEnv();
    const other = await rootWith(await activePayload({ packetSha: 'b'.repeat(64) }));
    await expect(ingest(env, () => {}, other.root)).rejects.toThrow(/another packet/);
    other.done();
    const none = await rootWith(null);
    await expect(ingest(env, () => {}, none.root)).rejects.toThrow(/no committed payload/);
    none.done();
  });

  it('partial configuration (Preview: the Blob token only) stops the build, naming the missing variables', async () => {
    const { ingest } = await import('../../scripts/ingest');
    const err = await ingest({ BLOB_READ_WRITE_TOKEN: 'tok-secret-value' }, () => {}).then(() => null, (e: Error) => e);
    expect(err?.message).toMatch(/RETURN_ID, DATA_ENCRYPTION_KEY/);
    expect(err?.message).toMatch(/production-only/);
    expect(err?.message).not.toContain('tok-secret-value');
    expect(calls).toHaveLength(0);
  });

  it('vault mode: refuses a RETURN_ID that is not the local packet hash', async () => {
    const { ingest } = await import('../../scripts/ingest');
    await expect(ingest({ ...vaultEnv(), RETURN_ID: 'a'.repeat(64) }, () => {})).rejects.toThrow(/RETURN_ID/);
    expect(calls.filter((c) => c.op === 'put')).toHaveLength(0);
  });
});
