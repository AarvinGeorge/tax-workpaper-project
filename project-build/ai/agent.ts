// AI agent CLI (Step 2). Run from project-build, only with a budget Aarvin has approved (a run costs real money):
//   npx tsx ai/agent.ts [--model claude-opus-5-5] [--packet real|altered|perturbed [--seed N]] [--out path] [--max-iterations 40] [--max-cost 12] [--max-minutes 40]
//                       [--blind | --blind-v3 | --hide-checks <seed>]   (measurement modes, ai/lib/modes.ts; default is production)
//                       [--prompt v3|v4]   (system prompt; default v3, the live producer)
//                       [--live]   (write the live payload ai/eval/agent-suggestions.json: agent-v3, default mode, real packet only)
// Reads ANTHROPIC_API_KEY from .env.local (never printed or written). One investigation over the whole packet with the
// deterministic tools. Every run, whatever its prompt or mode, writes ai/eval/runs/<version>/<mode>.<packet>.<n>.json
// (packet real, altered or seed-<n>; n the next free number) with its run meta and trace, unless --live is given; --out
// names another file but never a committed ai/eval/agent-suggestions*.json. A failed run (error, SSN hit, refusal, cut or
// malformed answer) writes its trace only and exits 1; a truncated run (a cost, turn or time cap) writes its trace and
// run meta, marked truncated, and exits 3; neither writes a payload.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadAgentPacket } from './lib/agent-packet';
import { AGENT_DEFAULT_MODEL, DEFAULT_LIMITS, agentPromptFrom, loadContextFiles, resolveOutFile, runAgent, writeRun } from './lib/agent-core';
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
  // --blind-v3: blind as the agent-v3 baseline ran it (fact_copies agreements only), for comparable v3 reruns only.
  const blindV3 = process.argv.includes('--blind-v3');
  const seedArg = arg('hide-checks');
  if ([blind, blindV3, seedArg !== undefined].filter(Boolean).length > 1) throw new Error('--blind, --blind-v3 and --hide-checks are separate modes; pick one.');
  if (seedArg !== undefined && !/^\d+$/.test(seedArg)) throw new Error('--hide-checks needs a whole-number seed.');
  const mode: AgentMode = blind ? { kind: 'blind' } : blindV3 ? { kind: 'blind-v3' } : seedArg !== undefined ? { kind: 'hide-checks', seed: Number(seedArg) } : { kind: 'default' };
  const prompt = agentPromptFrom(process.argv.includes('--prompt') ? (arg('prompt') ?? '') : undefined);
  const which = arg('packet') ?? 'real';
  if (which !== 'real' && which !== 'altered' && which !== 'perturbed') throw new Error('--packet must be real, altered or perturbed.');
  const seedOpt = arg('seed');
  if (seedOpt !== undefined && which !== 'perturbed') throw new Error('--seed applies to --packet perturbed only.');
  if (seedOpt !== undefined && !/^\d+$/.test(seedOpt)) throw new Error('--seed needs a whole-number seed.');
  const seed = seedOpt === undefined ? undefined : Number(seedOpt);
  // Vault mode (production) reads the sealed packet exactly as the cloud reader does; file mode reads data/packet.json.
  // The altered and perturbed copies are laptop measurements: refused in vault mode (agent-packet.ts).
  const got = await loadAgentPacket({ env: process.env, root, packet: which, seed });
  const { ix, packetSha, source } = got;
  // Resolved before any spend: a refused output (a protected file, a --live outside the active producer) costs nothing.
  const live = process.argv.includes('--live');
  const out = resolveOutFile({ root, mode, packet: which, seed: got.seed, prompt, out: process.argv.includes('--out') ? (arg('out') ?? '') : undefined, live });

  console.log(`agent: ${which} packet from ${source} (sha ${packetSha.slice(0, 12)}), model ${model}, mode ${modeLabel(mode)}, prompt ${prompt}, limits ${JSON.stringify(limits)}`);
  const res = await runAgent({
    ix, packetSha, model, apiKey, mode, prompt, source, fetchImpl: fetch, files: loadContextFiles(root), limits, log: (s) => console.log('  ' + s),
  });
  const m = res.meta; const u = m.usage;
  console.log(`agent: ${m.turns} turn(s), ${m.toolCalls} tool call(s), ${m.seconds} s; served ${m.servedModels.join(', ') || 'none'}; tokens in ${u.input_tokens}, cache write ${u.cache_creation_input_tokens}, cache read ${u.cache_read_input_tokens}, out ${u.output_tokens}; approx cost $${m.costUsd.toFixed(3)}`);
  writeRun(res, out, { live }); // the trace always; the run meta for a finished or truncated run; the payload only when finished
  const tracePath = path.relative(root, out.replace(/\.json$/, '.trace.json'));
  if (!res.ok) {
    console.error(`agent ${res.outcome.toUpperCase()} (${res.trace.endedBy}), payload not written; trace in ${tracePath}: ${res.reason}`);
    process.exit(res.outcome === 'truncated' ? 3 : 1);
  }
  console.log(`agent: wrote ${path.relative(root, out)}: ${res.payload.suggestions.length} suggestion(s), ${res.payload.rejected.length} rejected (${m.onFindingClaims.count} on a finding's exact claims, kept), ${res.payload.proposals?.length ?? 0} proposal(s); verifier shows ${m.verifier?.shown}, holds back ${m.verifier?.heldBack}`);
}

main().catch((e) => { console.error('agent failed:', e instanceof Error ? e.message : e); process.exit(1); });
