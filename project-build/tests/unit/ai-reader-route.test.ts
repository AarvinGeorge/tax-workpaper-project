// The cloud AI reader route: bearer CRON_SECRET (timing-safe), 503 without an Anthropic key, idempotent, and a summary
// only (never suggestion content). @vercel/blob and the Messages API are fakes: no network, no model call.
import { createHash, randomBytes } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blobs, resetBlobs } from '../fixtures/blob-mock';
import type { FetchLike } from '../../ai/lib/reader-core';

vi.mock('@vercel/blob', async () => (await import('../fixtures/blob-mock')).blobMock);

const bytes = readFileSync(path.join(process.cwd(), 'data', 'packet.json'));
const SHA = createHash('sha256').update(bytes).digest('hex');
const SECRET = 'cron-secret-for-tests';
const env = () => ({
  RETURN_ID: SHA, BLOB_READ_WRITE_TOKEN: 'test-token', DATA_ENCRYPTION_KEY: KEY, CRON_SECRET: SECRET, ANTHROPIC_API_KEY: 'test-key',
});
const KEY = randomBytes(32).toString('base64');
const req = (auth?: string, q = '') => new Request(`https://x.test/api/internal/ai-reader${q}`, { headers: auth ? { authorization: auth } : {} });

const RATIONALE = 'Distinctive rationale text that must never leave the server in a response.';
let fetchCalls = 0;
const fakeFetch: FetchLike = async (_url, init) => {
  fetchCalls++;
  const body = JSON.parse(init.body) as { messages: { content: string }[] };
  const doc = /Document (\S+)/.exec(JSON.stringify(body))?.[1] ?? 'D01';
  const row = { kind: 'other', otherKind: 'Test kind', claims: [], evidence: [{ doc, page: 1, quote: 'QUOTE-THAT-MUST-NOT-LEAK' }], rationale: RATIONALE, authority: null, confidence: 0.5 };
  const json = { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ suggestions: [row] }) }], usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } };
  return { status: 200, headers: { get: () => null }, json: async () => json, text: async () => JSON.stringify(json) };
};

async function setup() {
  vi.resetModules();
  resetBlobs();
  fetchCalls = 0;
  const vault = await import('@/server/vault');
  const e = env();
  const p = vault.packetBlobPath(SHA);
  blobs.set(p, vault.seal(bytes, vault.vaultKey(e), p));
  const { handleAiReader } = await import('@/server/ai-reader');
  const { PROMPT_VERSION } = await import('../../ai/lib/reader-core');
  return { vault, handleAiReader, PROMPT_VERSION };
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('ai-reader route', () => {
  it('exports GET and POST with maxDuration 300', async () => {
    const mod = await import('@/app/api/internal/ai-reader/route');
    expect(typeof mod.GET).toBe('function');
    expect(typeof mod.POST).toBe('function');
    expect(mod.maxDuration).toBe(300);
  });

  it('401 without a bearer, with a wrong one, and when CRON_SECRET is not set', async () => {
    const { handleAiReader } = await setup();
    for (const r of [req(), req('Bearer wrong'), req(SECRET), req(`Bearer ${SECRET}x`)]) {
      expect((await handleAiReader(r, env(), fakeFetch)).status).toBe(401);
    }
    expect((await handleAiReader(req('Bearer '), { ...env(), CRON_SECRET: '' }, fakeFetch)).status).toBe(401);
    expect(fetchCalls).toBe(0);
  });

  it('503 when ANTHROPIC_API_KEY is not configured', async () => {
    const { handleAiReader } = await setup();
    const res = await handleAiReader(req(`Bearer ${SECRET}`), { ...env(), ANTHROPIC_API_KEY: '' }, fakeFetch);
    expect(res.status).toBe(503);
    expect(await res.text()).toContain('ANTHROPIC_API_KEY not configured');
    expect(fetchCalls).toBe(0);
  });

  it('skips when the stored payload is for this packet and this prompt version, unless forced', async () => {
    const { vault, handleAiReader, PROMPT_VERSION } = await setup();
    const ap = vault.aiBlobPath(SHA);
    const current = { schemaVersion: 1, packetSha: SHA, model: 'm', promptVersion: PROMPT_VERSION, runAt: '2026-10-17T00:00:00Z', suggestions: [], rejected: [] };
    blobs.set(ap, vault.seal(Buffer.from(JSON.stringify(current)), vault.vaultKey(env()), ap));
    const res = await handleAiReader(req(`Bearer ${SECRET}`), env(), fakeFetch, 'reader');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ skipped: true });
    expect(fetchCalls).toBe(0);
  });

  it('runs over the vault packet, stores the encrypted payload, and returns a summary only', async () => {
    const { vault, handleAiReader, PROMPT_VERSION } = await setup();
    const res = await handleAiReader(req(`Bearer ${SECRET}`, '?force=1'), env(), fakeFetch, 'reader');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(RATIONALE);
    expect(text).not.toContain('QUOTE-THAT-MUST-NOT-LEAK');
    const body = JSON.parse(text);
    expect(body).toMatchObject({ ok: true, skipped: false, promptVersion: PROMPT_VERSION });
    expect(typeof body.suggestions).toBe('number');
    expect(typeof body.rejected).toBe('number');
    expect(typeof body.seconds).toBe('number');
    expect(fetchCalls).toBeGreaterThan(0);
    const ap = vault.aiBlobPath(SHA);
    const stored = blobs.get(ap)!;
    expect(stored.includes(Buffer.from(RATIONALE))).toBe(false); // encrypted at rest
    const payload = JSON.parse(vault.unseal(stored, vault.vaultKey(env()), ap).toString('utf8'));
    expect(payload).toMatchObject({ packetSha: SHA, promptVersion: PROMPT_VERSION });
  });

  it('refuses a full run while the active producer is not the reader: it never replaces the agent\'s payload', async () => {
    const { vault, handleAiReader } = await setup();
    const res = await handleAiReader(req(`Bearer ${SECRET}`, '?force=1'), env(), fakeFetch);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: expect.stringMatching(/active AI producer is the agent/) });
    expect(fetchCalls).toBe(0);
    expect(blobs.has(vault.aiBlobPath(SHA))).toBe(false);
  });

  it('an unparseable or undecryptable stored payload is treated as stale and re-run, not a 500', async () => {
    const { vault, handleAiReader } = await setup();
    const ap = vault.aiBlobPath(SHA);
    blobs.set(ap, vault.seal(Buffer.from('{not json'), vault.vaultKey(env()), ap));
    let res = await handleAiReader(req(`Bearer ${SECRET}`), env(), fakeFetch, 'reader');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ skipped: false });
    blobs.set(ap, vault.seal(Buffer.from('{}'), randomBytes(32), ap)); // another key: fails authentication
    const before = fetchCalls;
    res = await handleAiReader(req(`Bearer ${SECRET}`), env(), fakeFetch, 'reader');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ skipped: false });
    expect(fetchCalls).toBeGreaterThan(before);
  });

  it('limit without dryRun is refused (400) so it can never silently start a full, payload-replacing run', async () => {
    const { handleAiReader } = await setup();
    const res = await handleAiReader(req(`Bearer ${SECRET}`, '?limit=2'), env(), fakeFetch);
    expect(res.status).toBe(400);
  });

  it('dry run: reads the first N documents, stores nothing, returns counts only', async () => {
    const { vault, handleAiReader } = await setup();
    const ap = vault.aiBlobPath(SHA);
    const before = new Map(blobs);
    const res = await handleAiReader(req(`Bearer ${SECRET}`, '?dryRun=1&limit=2'), env(), fakeFetch);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(RATIONALE);
    expect(text).not.toContain('QUOTE-THAT-MUST-NOT-LEAK');
    const body = JSON.parse(text);
    expect(body).toMatchObject({ ok: true, dryRun: true, documents: 2 });
    for (const k of ['suggestions', 'rejected', 'grounded', 'seconds']) expect(typeof body[k]).toBe('number');
    expect('costUsdEstimate' in body).toBe(true);
    expect(body).toMatchObject({ calls: 2, failedCalls: 0 });
    expect(fetchCalls).toBe(2);
    expect(blobs.has(ap)).toBe(false); // nothing written
    expect([...blobs.keys()]).toEqual([...before.keys()]);
  });

  it('dry run defaults to 3 documents, runs even when the stored payload is current, and refuses a limit outside 1 to 5', async () => {
    const { vault, handleAiReader, PROMPT_VERSION } = await setup();
    const ap = vault.aiBlobPath(SHA);
    const current = { schemaVersion: 1, packetSha: SHA, model: 'm', promptVersion: PROMPT_VERSION, runAt: '2026-10-17T00:00:00Z', suggestions: [], rejected: [] };
    const sealed = vault.seal(Buffer.from(JSON.stringify(current)), vault.vaultKey(env()), ap);
    blobs.set(ap, sealed);
    const res = await handleAiReader(req(`Bearer ${SECRET}`, '?dryRun=1'), env(), fakeFetch);
    expect(await res.json()).toMatchObject({ dryRun: true, documents: 3 });
    expect(fetchCalls).toBe(3);
    expect(blobs.get(ap)!.equals(sealed)).toBe(true); // the stored payload is untouched
    for (const q of ['0', '6', 'x', '2.5']) {
      expect((await handleAiReader(req(`Bearer ${SECRET}`, `?dryRun=1&limit=${q}`), env(), fakeFetch)).status).toBe(400);
    }
    expect(fetchCalls).toBe(3);
  });

  it('dry run still needs the bearer and the key', async () => {
    const { handleAiReader } = await setup();
    expect((await handleAiReader(req(undefined, '?dryRun=1'), env(), fakeFetch)).status).toBe(401);
    expect((await handleAiReader(req(`Bearer ${SECRET}`, '?dryRun=1'), { ...env(), ANTHROPIC_API_KEY: '' }, fakeFetch)).status).toBe(503);
    expect(fetchCalls).toBe(0);
  });

  it('a stale payload (older prompt version) is re-run without force', async () => {
    const { vault, handleAiReader } = await setup();
    const ap = vault.aiBlobPath(SHA);
    const old = { schemaVersion: 1, packetSha: SHA, model: 'm', promptVersion: 'reader-v0', runAt: '2026-10-17T00:00:00Z', suggestions: [], rejected: [] };
    blobs.set(ap, vault.seal(Buffer.from(JSON.stringify(old)), vault.vaultKey(env()), ap));
    const res = await handleAiReader(req(`Bearer ${SECRET}`), env(), fakeFetch, 'reader');
    expect(await res.json()).toMatchObject({ skipped: false });
    expect(fetchCalls).toBeGreaterThan(0);
  });
});

describe('one door to the store', () => {
  it('no AI code touches the store directly: only the data module (and the deploy-time ingest) imports the vault', () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const f = path.join(d, n); return statSync(f).isDirectory() ? walk(f) : /\.tsx?$/.test(n) ? [f] : []; });
    const files = [...walk(path.join(process.cwd(), 'src')), ...walk(path.join(process.cwd(), 'ai'))];
    const importers = files.filter((f) => /(?:from|import\()\s*['"][^'"]*\/vault(?:\.ts)?['"]/.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(process.cwd(), f)).sort();
    expect(importers).toEqual(['src/server/data.ts']);
  });

  it('saveAiPayload refuses a payload made for another packet, and one carrying SSN-shaped text', async () => {
    await setup();
    const { saveAiPayload } = await import('@/server/data');
    const { indexPacket } = await import('@/domain/packet/load');
    const ix = indexPacket(JSON.parse(bytes.toString('utf8')));
    const base = { schemaVersion: 1 as const, packetSha: SHA, model: 'm', promptVersion: 'reader-v2', runAt: '2026-10-24T00:00:00Z', suggestions: [], rejected: [] };
    await expect(saveAiPayload(ix, { ...base, packetSha: 'f'.repeat(64) }, env())).rejects.toThrow(/another packet/);
    await expect(saveAiPayload(ix, { ...base, rejected: [{ raw: 'ssn 123-45-6789', reason: 'x' }] }, env())).rejects.toThrow(/SSN/);
    expect(blobs.has((await import('@/server/vault')).aiBlobPath(SHA))).toBe(false);
  });

  it('saveAiPayload verifies before sealing: a quote not on its page moves to rejected, a grounded one is kept', async () => {
    const { vault } = await setup();
    const { saveAiPayload } = await import('@/server/data');
    const { indexPacket } = await import('@/domain/packet/load');
    const ix = indexPacket(JSON.parse(bytes.toString('utf8')));
    const d = ix.packet.documents.find((x) => x.pages.some((pg) => /\d/.test(pg.printed_content)))!;
    const pg = d.pages.find((x) => /\d/.test(x.printed_content))!;
    const line = pg.printed_content.split('\n').map((l) => l.trim()).find((l) => l.length > 12 && /\d/.test(l))!;
    const sug = (id: string, quote: string) => ({ id, kind: 'other' as const, otherKind: 'Test', claims: [], evidence: [{ doc: d.id, page: pg.page, quote }], rationale: 'A short reason.', authority: null, confidence: 0.5 });
    const payload = { schemaVersion: 1 as const, packetSha: SHA, model: 'm', promptVersion: 'reader-v2', runAt: '2026-10-24T00:00:00Z',
      suggestions: [sug('AI-1', line), sug('AI-2', 'A sentence that is printed on no page at all 42')], rejected: [] };
    const saved = await saveAiPayload(ix, payload, env());
    expect(saved).toEqual({ suggestions: 1, rejected: 1 });
    const ap = vault.aiBlobPath(SHA);
    const stored = JSON.parse(vault.unseal(blobs.get(ap)!, vault.vaultKey(env()), ap).toString('utf8'));
    expect(stored.suggestions.map((x: { id: string }) => x.id)).toEqual(['AI-1']);
    expect(stored.rejected[0].reason).toMatch(/failed verification before storing: Quote 1: quote not found/);
  });

  it('a rejected row quoting an SSN never blocks the good rows: rejected rows keep only their id and reasons', async () => {
    const { vault } = await setup();
    const { saveAiPayload } = await import('@/server/data');
    const { indexPacket } = await import('@/domain/packet/load');
    const ix = indexPacket(JSON.parse(bytes.toString('utf8')));
    const d = ix.packet.documents.find((x) => x.pages.some((pg) => /\d/.test(pg.printed_content)))!;
    const pg = d.pages.find((x) => /\d/.test(x.printed_content))!;
    const line = pg.printed_content.split('\n').map((l) => l.trim()).find((l) => l.length > 12 && /\d/.test(l))!;
    const sug = (id: string, quote: string) => ({ id, kind: 'other' as const, otherKind: 'Test', claims: [], evidence: [{ doc: d.id, page: pg.page, quote }], rationale: 'A short reason.', authority: null, confidence: 0.5 });
    const payload = { schemaVersion: 1 as const, packetSha: SHA, model: 'm', promptVersion: 'reader-v2', runAt: '2026-10-24T00:00:00Z',
      suggestions: [sug('AI-1', line), sug('AI-2', 'Employee SSN 123-45-6789 printed nowhere')], rejected: [] };
    expect(await saveAiPayload(ix, payload, env())).toEqual({ suggestions: 1, rejected: 1 });
    const ap = vault.aiBlobPath(SHA);
    const text = vault.unseal(blobs.get(ap)!, vault.vaultKey(env()), ap).toString('utf8');
    expect(text).not.toMatch(/123-45-6789/);
    expect(JSON.parse(text).rejected[0].raw).toEqual({ id: 'AI-2' });
  });
});
