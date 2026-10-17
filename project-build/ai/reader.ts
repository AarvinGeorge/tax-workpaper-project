// AI reader CLI. Run from project-build:
//   npx tsx ai/reader.ts [--model claude-sonnet-5-5] [--limit N] [--concurrency 4] [--packet real|altered] [--out path] [--docs D01,D02]
// Reads ANTHROPIC_API_KEY from .env.local (never printed or written), one call per document, writes
// ai/eval/ai-suggestions.json (or ai/eval/ai-suggestions.altered.json) and a run-meta file with tokens and cost.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { indexPacket } from '../src/domain/packet/load';
import type { Packet } from '../src/domain/packet/types';
import { DEFAULT_MODEL, MAX_TOKENS, THINKING, runReader, sha256, type FetchLike } from './lib/reader-core';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Reads one key from .env.local without echoing anything. */
function readKey(file: string): string {
  if (!existsSync(file)) return '';
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*ANTHROPIC_API_KEY\s*=\s*(.*)\s*$/);
    if (m) return m[1].replace(/^['"]|['"]$/g, '').trim();
  }
  return '';
}

async function main() {
  const root = process.cwd();
  const packetFile = path.join(root, 'data', 'packet.json');
  if (!existsSync(packetFile)) throw new Error('Run from project-build (data/packet.json not found).');
  const apiKey = process.env.ANTHROPIC_API_KEY || readKey(path.join(root, '.env.local'));
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is missing. Add a line ANTHROPIC_API_KEY=... to project-build/.env.local (git-ignored) and run again.');
    process.exit(2);
  }
  const model = arg('model') ?? DEFAULT_MODEL;
  const limitArg = arg('limit');
  const limit = limitArg ? Number(limitArg) : undefined;
  if (limitArg && (!Number.isInteger(limit) || limit! < 1)) throw new Error('--limit must be a positive integer.');
  const concurrency = Number(arg('concurrency') ?? 4);
  const which = arg('packet') ?? 'real';

  let packet: Packet; let packetSha: string; let out: string;
  if (which === 'altered') {
    const { alteredPacket } = await import('../tests/fixtures/altered');
    packet = alteredPacket();
    packetSha = sha256(JSON.stringify(packet)); // in-memory packet: hash of its JSON text
    out = path.join(root, 'ai', 'eval', 'ai-suggestions.altered.json');
  } else if (which === 'real') {
    const bytes = readFileSync(packetFile);
    packetSha = sha256(bytes);
    packet = JSON.parse(bytes.toString('utf8')) as Packet;
    out = path.join(root, 'ai', 'eval', 'ai-suggestions.json');
  } else throw new Error('--packet must be real or altered.');

  if (arg('out')) out = path.resolve(root, arg('out')!);
  const ix = indexPacket(packet);
  const docIds = arg('docs')?.split(',').map((x) => x.trim()).filter(Boolean);
  const n = Math.min(limit ?? Infinity, docIds?.length ?? packet.documents.length);
  console.log(`reader: ${which} packet (sha ${packetSha.slice(0, 12)}), model ${model}, ${n} document call(s), concurrency ${concurrency}`);
  const started = Date.now();
  const res = await runReader({ ix, packetSha, model, apiKey, fetchImpl: fetch as unknown as FetchLike, limit, docIds, concurrency, log: (s) => console.log('  ' + s) });
  writeFileSync(out, JSON.stringify(res.payload, null, 2) + '\n');
  const meta = {
    payload: path.basename(out), model, promptVersion: res.payload.promptVersion, runAt: res.payload.runAt, documents: n, docIds: docIds ?? null,
    thinking: THINKING, maxTokens: MAX_TOKENS,
    calls: res.calls, failedCalls: res.failedCalls, usage: res.usage, costUsd: res.costUsd, seconds: Math.round((Date.now() - started) / 1000),
  };
  writeFileSync(out.replace(/\.json$/, '.run-meta.json'), JSON.stringify(meta, null, 2) + '\n');
  const u = res.usage;
  console.log(`reader: wrote ${path.relative(root, out)}: ${res.payload.suggestions.length} suggestion(s), ${res.payload.rejected.length} rejected`);
  console.log(`reader: ${res.calls} HTTP call(s), ${res.failedCalls} failed; tokens in ${u.input_tokens}, cache write ${u.cache_creation_input_tokens}, cache read ${u.cache_read_input_tokens}, out ${u.output_tokens}; approx cost ${res.costUsd == null ? 'unknown (no price for model)' : `$${res.costUsd.toFixed(3)}`}`);
}

main().catch((e) => { console.error('reader failed:', e instanceof Error ? e.message : e); process.exit(1); });
