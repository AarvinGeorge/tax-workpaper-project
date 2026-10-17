// The deploy-time ingest: a no-op in file mode; in vault mode it encrypts and uploads what is absent and verifies each
// upload by reading it back. @vercel/blob is mocked: no network.
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blobs, calls, resetBlobs } from '../fixtures/blob-mock';

vi.mock('@vercel/blob', async () => (await import('../fixtures/blob-mock')).blobMock);

const bytes = readFileSync(path.join(process.cwd(), 'data', 'packet.json'));
const SHA = createHash('sha256').update(bytes).digest('hex');
const vaultEnv = () => ({ RETURN_ID: SHA, BLOB_READ_WRITE_TOKEN: 'test-token', DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64') });

beforeEach(() => { resetBlobs(); });

describe('ingest', () => {
  it('file mode: prints the no-op line and touches no blob', async () => {
    const { ingest } = await import('../../scripts/ingest');
    const lines: string[] = [];
    const r = await ingest({}, (s) => lines.push(s));
    expect(r.mode).toBe('file');
    expect(lines).toEqual(['file mode, nothing to ingest']);
    expect(calls).toHaveLength(0);
  });

  it('vault mode: uploads the packet and the eval payload once, verified, printing only prefixes and sizes', async () => {
    const { ingest } = await import('../../scripts/ingest');
    const env = vaultEnv();
    const lines: string[] = [];
    const r = await ingest(env, (s) => lines.push(s));
    expect(r).toMatchObject({ mode: 'vault', packet: 'uploaded', ai: 'uploaded' });
    expect([...blobs.keys()].sort()).toEqual([`returns/${SHA}/ai-suggestions.json.enc`, `returns/${SHA}/packet.json.enc`]);
    expect(calls.filter((c) => c.op === 'put').every((c) => c.options.access === 'private' && c.options.addRandomSuffix === false)).toBe(true);
    const out = lines.join('\n');
    expect(out).not.toContain(SHA); // prefixes only
    expect(out).toContain(SHA.slice(0, 12));
    const again = await ingest(env, () => {});
    expect(again).toMatchObject({ packet: 'present', ai: 'present' });
    expect(calls.filter((c) => c.op === 'put')).toHaveLength(2);
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
