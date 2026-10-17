// The data source switch: file mode without the three vault variables (today's behaviour), vault mode with them
// (fetch, decrypt, verify the hash against RETURN_ID, fail closed). @vercel/blob is mocked: no network.
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { blobs, calls, resetBlobs } from '../fixtures/blob-mock';
import { aiFixture } from '../fixtures/ai-payload';

vi.mock('@vercel/blob', async () => (await import('../fixtures/blob-mock')).blobMock);

const bytes = readFileSync(path.join(process.cwd(), 'data', 'packet.json'));
const SHA = createHash('sha256').update(bytes).digest('hex');
const KEY = randomBytes(32).toString('base64');
const VARS = ['RETURN_ID', 'BLOB_READ_WRITE_TOKEN', 'DATA_ENCRYPTION_KEY', 'AI_PAYLOAD_PATH'] as const;
let saved: Record<string, string | undefined>;

function vaultEnv() {
  process.env.RETURN_ID = SHA;
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  process.env.DATA_ENCRYPTION_KEY = KEY;
}

async function sealInto(pathname: string, plain: Buffer) {
  const { seal, vaultKey } = await import('@/server/vault');
  blobs.set(pathname, seal(plain, vaultKey(), pathname));
}

beforeEach(() => {
  saved = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
  for (const k of VARS) delete process.env[k];
  resetBlobs();
  vi.resetModules();
});
afterEach(() => {
  for (const k of VARS) if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
});

describe('data source: file mode', () => {
  it('without the vault variables reads data/packet.json as today and touches no blob', async () => {
    const { dataMode, ensureReturnData } = await import('@/server/data');
    expect(dataMode()).toBe('file');
    await ensureReturnData();
    const { loadPacket, loadedPacketSha } = await import('@/domain/packet/load');
    expect(loadPacket().documents.length).toBeGreaterThan(0);
    expect(loadedPacketSha()).toBe(SHA);
    expect(calls).toHaveLength(0);
  });

  it('fails closed on a partial configuration, naming the missing variables and never a value', async () => {
    process.env.RETURN_ID = SHA;
    process.env.BLOB_READ_WRITE_TOKEN = 'tok-secret-value';
    const { dataMode, ensureReturnData } = await import('@/server/data');
    expect(() => dataMode()).toThrow(/DATA_ENCRYPTION_KEY/);
    await expect(ensureReturnData()).rejects.toThrow(/partial vault configuration/i);
    const { loadPacket } = await import('@/domain/packet/load');
    let msg = '';
    try { loadPacket(); } catch (e) { msg = (e as Error).message; }
    expect(msg).toMatch(/DATA_ENCRYPTION_KEY/);
    expect(msg).not.toContain('tok-secret-value');
    expect(msg).not.toContain(SHA);
    expect(calls).toHaveLength(0);
  });

  it('one variable alone is partial too', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'tok-secret-value';
    const { dataMode } = await import('@/server/data');
    expect(() => dataMode()).toThrow(/RETURN_ID, DATA_ENCRYPTION_KEY/);
  });
});

describe('data source: vault mode', () => {
  it('fetches and decrypts the packet from the private store and warms the cache loadPacket uses', async () => {
    vaultEnv();
    const { packetBlobPath } = await import('@/server/vault');
    await sealInto(packetBlobPath(SHA), bytes);
    const { dataMode, ensureReturnData } = await import('@/server/data');
    expect(dataMode()).toBe('vault');
    await ensureReturnData();
    const { loadPacket, loadedPacketSha } = await import('@/domain/packet/load');
    expect(loadPacket()).toEqual(JSON.parse(bytes.toString('utf8')));
    expect(loadedPacketSha()).toBe(SHA);
    const gets = calls.filter((c) => c.op === 'get');
    expect(gets.map((c) => c.pathname)).toContain(`returns/${SHA}/packet.json.enc`);
    expect(gets.every((c) => c.options.access === 'private')).toBe(true);
  });

  it('loadPacket throws a clear error in vault mode when the cache was not warmed', async () => {
    vaultEnv();
    const { loadPacket } = await import('@/domain/packet/load');
    expect(() => loadPacket()).toThrow(/ensureReturnData/);
  });

  it('fails closed when the decrypted bytes do not hash to RETURN_ID', async () => {
    vaultEnv();
    const { packetBlobPath } = await import('@/server/vault');
    await sealInto(packetBlobPath(SHA), Buffer.from('{"documents":[]}'));
    const { ensureReturnData } = await import('@/server/data');
    await expect(ensureReturnData()).rejects.toThrow(/does not match RETURN_ID/);
    const { loadPacket } = await import('@/domain/packet/load');
    expect(() => loadPacket()).toThrow();
  });

  it('fails closed when the packet blob is missing or was encrypted with another key', async () => {
    vaultEnv();
    const { ensureReturnData } = await import('@/server/data');
    await expect(ensureReturnData()).rejects.toThrow(/not found/);
    const { packetBlobPath, seal } = await import('@/server/vault');
    blobs.set(packetBlobPath(SHA), seal(bytes, randomBytes(32), packetBlobPath(SHA)));
    await expect(ensureReturnData()).rejects.toThrow();
  });

  it('serves the AI payload from the vault, and no AI section when none is stored', async () => {
    vaultEnv();
    const { packetBlobPath, aiBlobPath } = await import('@/server/vault');
    await sealInto(packetBlobPath(SHA), bytes);
    const { ensureReturnData, forceAiRecheck } = await import('@/server/data');
    await ensureReturnData();
    const { indexPacket, loadPacket } = await import('@/domain/packet/load');
    const { aiReview } = await import('@/domain/ai/merge');
    const ix = indexPacket(loadPacket());
    expect(aiReview(ix).present).toBe(false);

    await sealInto(aiBlobPath(SHA), Buffer.from(JSON.stringify(aiFixture())));
    await ensureReturnData();
    expect(aiReview(ix).present).toBe(false); // re-checked at most every 5 minutes
    forceAiRecheck();
    await ensureReturnData();
    const r = aiReview(ix);
    expect(r.present).toBe(true);
    expect(r.findings.length).toBeGreaterThan(0);
  });

  it('re-checks the AI payload after 5 minutes without a redeploy', async () => {
    vaultEnv();
    const { packetBlobPath, aiBlobPath } = await import('@/server/vault');
    await sealInto(packetBlobPath(SHA), bytes);
    const { ensureReturnData, AI_RECHECK_MS } = await import('@/server/data');
    let t = 1_000_000;
    const now = () => t;
    await ensureReturnData(process.env, now);
    await sealInto(aiBlobPath(SHA), Buffer.from(JSON.stringify(aiFixture())));
    t += AI_RECHECK_MS - 1;
    await ensureReturnData(process.env, now);
    const { indexPacket, loadPacket } = await import('@/domain/packet/load');
    const { aiReview } = await import('@/domain/ai/merge');
    expect(aiReview(indexPacket(loadPacket())).present).toBe(false);
    t += 1;
    await ensureReturnData(process.env, now);
    expect(aiReview(indexPacket(loadPacket())).present).toBe(true);
  });
});
