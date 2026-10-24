// The agent loads the packet the way the cloud reader does. Vault mode: sealed Blob -> decrypt -> SHA-256 vs RETURN_ID ->
// refuse on mismatch, never data/packet.json. File mode: data/packet.json, for laptop measurement only. @vercel/blob is
// an in-memory fake: no network.
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blobs, calls, resetBlobs } from '../fixtures/blob-mock';

vi.mock('@vercel/blob', async () => (await import('../fixtures/blob-mock')).blobMock);

const bytes = readFileSync(path.join(process.cwd(), 'data', 'packet.json'));
const SHA = createHash('sha256').update(bytes).digest('hex');
const KEY = randomBytes(32).toString('base64');
const vaultEnv = () => ({ RETURN_ID: SHA, BLOB_READ_WRITE_TOKEN: 'test-token', DATA_ENCRYPTION_KEY: KEY });
/** A directory with no data/packet.json and no case-study package: the vault branch must not need either. */
const emptyRoot = () => mkdtempSync(path.join(tmpdir(), 'agent-root-'));

async function fresh(seedBytes: Buffer | null = bytes) {
  vi.resetModules();
  resetBlobs();
  const vault = await import('@/server/vault');
  if (seedBytes) { const p = vault.packetBlobPath(SHA); blobs.set(p, vault.seal(seedBytes, vault.vaultKey(vaultEnv()), p)); }
  return import('../../ai/lib/agent-packet');
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('agent packet: vault mode (production)', () => {
  it('fetches the sealed packet, decrypts and hash-checks it, and never reads data/packet.json', async () => {
    const { loadAgentPacket } = await fresh();
    const got = await loadAgentPacket({ env: vaultEnv(), root: emptyRoot(), packet: 'real' });
    expect(got.source).toBe('vault');
    expect(got.packetSha).toBe(SHA);
    expect(got.ix.packet.documents.length).toBeGreaterThan(0);
    expect(calls.some((c) => c.op === 'get')).toBe(true); // it really went to the (fake) Blob store
    expect(calls.some((c) => c.op === 'put')).toBe(false); // and wrote nothing there
  });

  it('the packet is the vault\'s copy, not the file on disk (a marked copy sealed under its own hash comes back)', async () => {
    vi.resetModules(); resetBlobs();
    const vault = await import('@/server/vault');
    const marked = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    marked.vault_marker = 'sealed-copy';
    const mb = Buffer.from(JSON.stringify(marked));
    const sha = createHash('sha256').update(mb).digest('hex');
    const env = { ...vaultEnv(), RETURN_ID: sha };
    const p = vault.packetBlobPath(sha);
    blobs.set(p, vault.seal(mb, vault.vaultKey(env), p));
    const { loadAgentPacket } = await import('../../ai/lib/agent-packet');
    const got = await loadAgentPacket({ env, root: emptyRoot(), packet: 'real' });
    expect((got.ix.packet as unknown as Record<string, unknown>).vault_marker).toBe('sealed-copy');
    expect(got.packetSha).toBe(sha);
  });

  it('refuses a packet whose SHA-256 does not match RETURN_ID', async () => {
    const { loadAgentPacket } = await fresh(Buffer.from(JSON.stringify({ tampered: true })));
    await expect(loadAgentPacket({ env: vaultEnv(), root: emptyRoot(), packet: 'real' })).rejects.toThrow(/integrity check/);
  });

  it('refuses when the vault holds no packet', async () => {
    const { loadAgentPacket } = await fresh(null);
    await expect(loadAgentPacket({ env: vaultEnv(), root: emptyRoot(), packet: 'real' })).rejects.toThrow(/not found in the vault/);
  });

  it('fails loudly on a partial vault configuration, naming only the missing variables', async () => {
    const { loadAgentPacket } = await fresh();
    const { PartialVaultConfigError } = await import('@/domain/datamode');
    const p = loadAgentPacket({ env: { RETURN_ID: SHA }, root: emptyRoot(), packet: 'real' });
    await expect(p).rejects.toBeInstanceOf(PartialVaultConfigError);
    await expect(p).rejects.toThrow(/BLOB_READ_WRITE_TOKEN, DATA_ENCRYPTION_KEY not set/);
  });

  it('refuses the altered packet (a laptop measurement) in vault mode', async () => {
    const { loadAgentPacket } = await fresh();
    await expect(loadAgentPacket({ env: vaultEnv(), root: emptyRoot(), packet: 'altered' })).rejects.toThrow(/file mode/);
  });
});

describe('agent packet: file mode (laptop measurement)', () => {
  it('reads data/packet.json and hashes its bytes', async () => {
    const { loadAgentPacket } = await fresh();
    const got = await loadAgentPacket({ env: {}, root: process.cwd(), packet: 'real' });
    expect(got).toMatchObject({ source: 'file', packetSha: SHA });
    expect(calls).toHaveLength(0); // no Blob store in file mode
  });

  it('the run meta records the source', async () => {
    const { runAgent, loadContextFiles } = await import('../../ai/lib/agent-core');
    const { indexPacket, loadPacket } = await import('@/domain/packet/load');
    const final = { id: 'm1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', stop_details: null, stop_sequence: null,
      content: [{ type: 'text', text: JSON.stringify({ suggestions: [], proposals: [] }) }], usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } };
    const fetch = async () => new Response(JSON.stringify(final), { status: 200, headers: { 'content-type': 'application/json' } });
    for (const source of ['vault', 'file'] as const) {
      const res = await runAgent({ ix: indexPacket(loadPacket()), packetSha: SHA, model: 'claude-opus-5-5', apiKey: 'sk-test', fetchImpl: fetch, files: loadContextFiles(process.cwd()), source });
      expect(res.meta.source).toBe(source);
    }
  });
});
