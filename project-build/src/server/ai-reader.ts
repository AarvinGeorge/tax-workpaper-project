// The AI reader in the cloud: the same reader core as the CLI (ai/lib/reader-core.ts: masking, one call per document,
// row validation), run over the vault packet, its payload verified and encrypted into the private store. Called on
// demand with the CRON_SECRET bearer (no schedule since 24 Oct 2026: the demo packet never changes). Idempotent: a payload already made for this packet and this prompt version is
// kept unless ?force=1. ?dryRun=1&limit=N (N 1 to 5, default 3) runs the first N documents and stores nothing: a
// production proof of the cloud path that never replaces the measured payload. The response is a summary only
// (counts, seconds, cost estimate), never suggestion content. A full run is refused (409) while the active AI producer
// (ai/lib/producer.ts) is not the reader: the route never replaces the agent's payload.
import { createHash, timingSafeEqual } from 'node:crypto';
import { DEFAULT_MODEL, isGrounded, runReader, type FetchLike } from '../../ai/lib/reader-core';
import { ACTIVE_PRODUCER, PRODUCERS, type ProducerName } from '../../ai/lib/producer';
import { isVaultMode, PartialVaultConfigError } from '@/domain/datamode';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { ensureReturnData, saveAiPayload, storedAiPayloadInfo } from './data';

type Env = Record<string, string | undefined>;

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

/** Timing-safe: both sides hashed to equal length first. No secret configured: nobody is authorised. */
function authorised(req: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const h = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(req.headers.get('authorization') ?? ''), h(`Bearer ${secret}`));
}

export async function handleAiReader(req: Request, env: Env = process.env, fetchImpl: FetchLike = fetch as unknown as FetchLike, producer: ProducerName = ACTIVE_PRODUCER): Promise<Response> {
  if (!authorised(req, env.CRON_SECRET)) return json(401, { ok: false, reason: 'Unauthorised.' });
  if (!env.ANTHROPIC_API_KEY) return json(503, { ok: false, reason: 'ANTHROPIC_API_KEY not configured' });
  let vault: boolean;
  try {
    vault = isVaultMode(env);
  } catch (e) {
    if (e instanceof PartialVaultConfigError) return json(503, { ok: false, reason: e.message }); // names only, never values
    throw e;
  }
  if (!vault) return json(503, { ok: false, reason: 'Vault not configured (RETURN_ID, BLOB_READ_WRITE_TOKEN, DATA_ENCRYPTION_KEY).' });
  const id = env.RETURN_ID!;
  const q = new URL(req.url).searchParams;
  const force = q.get('force') === '1';
  const dryRun = q.get('dryRun') === '1';
  const limitText = q.get('limit') ?? '3';
  const limit = /^[1-5]$/.test(limitText) ? Number(limitText) : null;
  if (dryRun && limit === null) return json(400, { ok: false, reason: 'limit must be a whole number from 1 to 5.' });
  if (!dryRun && q.has('limit')) return json(400, { ok: false, reason: 'limit applies only to a dry run (dryRun=1).' });
  if (!dryRun && producer !== 'reader') {
    return json(409, { ok: false, reason: `The active AI producer is the ${producer}; the reader route does not replace its payload (dry runs still work).` });
  }
  try {
    await ensureReturnData(env);
    if (dryRun) {
      const ix = indexPacket(loadPacket());
      const started = Date.now();
      const res = await runReader({ ix, packetSha: id, model: DEFAULT_MODEL, apiKey: env.ANTHROPIC_API_KEY, fetchImpl, limit: limit! });
      return json(200, {
        ok: true, dryRun: true, documents: Math.min(limit!, ix.packet.documents.length), promptVersion: res.payload.promptVersion,
        suggestions: res.payload.suggestions.length, rejected: res.payload.rejected.length,
        grounded: res.payload.suggestions.filter((s) => isGrounded(ix, s)).length,
        calls: res.calls, failedCalls: res.failedCalls, seconds: Math.round((Date.now() - started) / 1000), costUsdEstimate: res.costUsd,
      });
    }
    if (!force) {
      const cur = await storedAiPayloadInfo(env);
      if (cur && cur.packetSha === id && cur.promptVersion === PRODUCERS.reader.promptVersion) {
        return json(200, { ok: true, skipped: true, reason: 'The stored payload is current for this packet and prompt version.', promptVersion: PRODUCERS.reader.promptVersion });
      }
    }
    const started = Date.now();
    const ix = indexPacket(loadPacket());
    const res = await runReader({ ix, packetSha: id, model: DEFAULT_MODEL, apiKey: env.ANTHROPIC_API_KEY, fetchImpl });
    const saved = await saveAiPayload(ix, res.payload, env); // verified, then sealed (one door to the store)
    return json(200, {
      ok: true, skipped: false, model: res.payload.model, promptVersion: res.payload.promptVersion, runAt: res.payload.runAt,
      suggestions: saved.suggestions, rejected: saved.rejected, calls: res.calls, failedCalls: res.failedCalls,
      seconds: Math.round((Date.now() - started) / 1000), costUsdEstimate: res.costUsd,
    });
  } catch (err) {
    console.error('ai-reader failed:', err instanceof Error ? err.message : 'unknown error');
    return json(500, { ok: false, reason: 'The AI reader run failed; see the function logs.' });
  }
}
