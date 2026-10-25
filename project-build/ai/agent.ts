// AI agent CLI (Step 2). Run from project-build, only with a budget Aarvin has approved (a run costs real money):
//   npx tsx ai/agent.ts [--model claude-opus-5-5] [--packet real|altered] [--out path] [--max-iterations 40] [--max-cost 12] [--max-minutes 40]
//                       [--blind | --hide-checks <seed>]   (measurement modes, ai/lib/modes.ts; default is production)
// Reads ANTHROPIC_API_KEY from .env.local (never printed or written). One investigation over the whole packet with the
// deterministic tools; writes ai/eval/agent-suggestions[.blind|.hide-<seed>][.altered].json and a run-meta file (tokens,
// cost, turns, seconds, served model, mode). A partial, failed or over-budget run writes nothing and exits 1.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadAgentPacket } from './lib/agent-packet';
import { AGENT_DEFAULT_MODEL, DEFAULT_LIMITS, agentOutFile, loadContextFiles, runAgent, writeRun } from './lib/agent-core';
import { modeLabel, type AgentMode } from './lib/modes';

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

const positive = (name: string, fallback: number) => {
  const v = arg(name);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`--${name} must be a positive number.`);
  return n;
};

async function main() {
  const root = process.cwd();
  if (!existsSync(path.join(root, 'ai', 'lib', 'agent-core.ts'))) throw new Error('Run from project-build.');
  const apiKey = process.env.ANTHROPIC_API_KEY || readKey(path.join(root, '.env.local'));
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is missing. Add a line ANTHROPIC_API_KEY=... to project-build/.env.local (git-ignored) and run again.');
    process.exit(2);
  }
  const model = arg('model') ?? AGENT_DEFAULT_MODEL;
  const limits = {
    maxIterations: Math.floor(positive('max-iterations', DEFAULT_LIMITS.maxIterations)),
    maxCostUsd: positive('max-cost', DEFAULT_LIMITS.maxCostUsd),
    wallClockMs: positive('max-minutes', DEFAULT_LIMITS.wallClockMs / 60_000) * 60_000,
  };
  const blind = process.argv.includes('--blind');
  const seedArg = arg('hide-checks');
  if (blind && seedArg !== undefined) throw new Error('--blind and --hide-checks are separate modes; pick one.');
  if (seedArg !== undefined && !/^\d+$/.test(seedArg)) throw new Error('--hide-checks needs a whole-number seed.');
  const mode: AgentMode = blind ? { kind: 'blind' } : seedArg !== undefined ? { kind: 'hide-checks', seed: Number(seedArg) } : { kind: 'default' };
  const which = arg('packet') ?? 'real';
  if (which !== 'real' && which !== 'altered') throw new Error('--packet must be real or altered.');
  // Vault mode (production) reads the sealed packet exactly as the cloud reader does; file mode reads data/packet.json.
  const { ix, packetSha, source } = await loadAgentPacket({ env: process.env, root, packet: which });
  const out = arg('out') ? path.resolve(root, arg('out')!) : agentOutFile(root, mode, which);

  console.log(`agent: ${which} packet from ${source} (sha ${packetSha.slice(0, 12)}), model ${model}, mode ${modeLabel(mode)}, limits ${JSON.stringify(limits)}`);
  const res = await runAgent({
    ix, packetSha, model, apiKey, mode, source, fetchImpl: fetch, files: loadContextFiles(root), limits, log: (s) => console.log('  ' + s),
  });
  const m = res.meta; const u = m.usage;
  console.log(`agent: ${m.turns} turn(s), ${m.toolCalls} tool call(s), ${m.seconds} s; served ${m.servedModels.join(', ') || 'none'}; tokens in ${u.input_tokens}, cache write ${u.cache_creation_input_tokens}, cache read ${u.cache_read_input_tokens}, out ${u.output_tokens}; approx cost $${m.costUsd.toFixed(3)}`);
  writeRun(res, out); // the trace always; the payload and run meta only for a finished run
  const tracePath = path.relative(root, out.replace(/\.json$/, '.trace.json'));
  if (!res.ok) {
    console.error(`agent FAILED (${res.trace.endedBy}), payload not written; trace in ${tracePath}: ${res.reason}`);
    process.exit(1);
  }
  console.log(`agent: wrote ${path.relative(root, out)}: ${res.payload.suggestions.length} suggestion(s), ${res.payload.rejected.length} rejected (${m.onFindingClaims.count} on a finding's exact claims, kept), ${res.payload.proposals?.length ?? 0} proposal(s); verifier shows ${m.verifier?.shown}, holds back ${m.verifier?.heldBack}`);
}

main().catch((e) => { console.error('agent failed:', e instanceof Error ? e.message : e); process.exit(1); });
