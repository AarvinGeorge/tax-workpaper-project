// AI harness CLI. Run from project-build:  npx tsx ai/harness.ts [payload path] [--check]
// --check is the CI eval gate: scores the payload, prints the gate result, writes nothing, exits 1 on any failure.
// Scores the payload (default ai/eval/ai-suggestions.json) against the ledger, and the altered-packet payload when present,
// writes ../docs/handin/ai-scorecard.md and prints a summary.
// --agent scores every ai/eval/agent-suggestions[.blind|.hide-<seed>].json beside the reader's payload, each on its mode's
// tier (and the altered copies when present), and writes ai/eval/agent-scorecard.md; the handed-in scorecard is not touched.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AiPayload } from '../src/domain/ai/contract';
import { indexPacket, loadPacket } from '../src/domain/packet/load';
import { GATE_BASELINES_FILE, agentScorecardMarkdown, baselineFrom, evalGate, gateBaseline, sidecarTexts, goldSet, hiddenOnlyLedger, uncheckedLedger, type ModeRun, type ScoredRun, scorecardMarkdown, scorePayload, shownView, summaryLine, type Adjudication, type RunMeta, type Score } from './lib/harness-core';
import { redactNames } from './lib/reader-core';
import { ACTIVE_PAYLOAD_FILE, ACTIVE_PRODUCER, ACTIVE_PROMPT_VERSION } from './lib/producer';
import { hiddenCheckIds } from './lib/modes';

function meta(payloadFile: string): RunMeta {
  const f = payloadFile.replace(/\.json$/, '.run-meta.json');
  if (!existsSync(f)) return {};
  const m = JSON.parse(readFileSync(f, 'utf8')) as { calls: number; costUsd: number | null; usage: Record<string, number> };
  const u = m.usage;
  return { calls: m.calls, costUsd: m.costUsd, tokens: `${u.input_tokens} in, ${u.cache_creation_input_tokens} cache write, ${u.cache_read_input_tokens} cache read, ${u.output_tokens} out` };
}

async function main() {
  const root = process.cwd();
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const file = path.resolve(root, args.find((a) => !a.startsWith('--')) ?? ACTIVE_PAYLOAD_FILE);
  if (!existsSync(file)) { console.error(`No payload at ${path.relative(root, file)}. Run the active producer (${ACTIVE_PRODUCER}) first.`); process.exit(2); }
  const payload = JSON.parse(readFileSync(file, 'utf8')) as AiPayload;
  if (args.includes('--agent')) return agentCard(root);
  if (args.includes('--set-baseline')) {
    // The active producer's committed payload becomes its gate baseline (what it reaches now); commit the file it writes.
    const b = baselineFrom(indexPacket(loadPacket()), ACTIVE_PRODUCER, payload);
    const g = evalGate(indexPacket(loadPacket()), payload, ACTIVE_PROMPT_VERSION, b, sidecarTexts(path.relative(root, file), root));
    if (g.failures.length) { for (const f of g.failures) console.error('set-baseline refused: ' + f); process.exit(1); }
    const out = path.join(root, GATE_BASELINES_FILE);
    const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) as Record<string, unknown> : {};
    writeFileSync(out, JSON.stringify({ ...all, [ACTIVE_PRODUCER]: b }, null, 2) + '\n');
    console.log(`gate baseline for ${ACTIVE_PRODUCER} (${b.promptVersion}): strict recall as shown at least ${b.minStrict}, held back at most ${b.maxHeldBack}; wrote ${GATE_BASELINES_FILE}`);
    return;
  }
  if (check) {
    const base = gateBaseline(ACTIVE_PRODUCER, root);
    const g = evalGate(indexPacket(loadPacket()), payload, ACTIVE_PROMPT_VERSION, base, sidecarTexts(path.relative(root, file), root));
    console.log(`eval gate (${ACTIVE_PRODUCER}): ${path.relative(root, file)} (${payload.promptVersion}); strict recall as shown ${g.strictFound}/${g.ledgerTotal} (baseline ${base?.minStrict ?? 'none'}); raw grounding ${(g.rawGrounding * 100).toFixed(0)}% of ${g.produced}; held back ${g.heldBack} (baseline ${base?.maxHeldBack ?? 'none'}), shown ${g.shown}`);
    for (const f of g.failures) console.error('eval gate FAILED: ' + f);
    if (g.failures.length) process.exit(1);
    console.log('eval gate: passed');
    return;
  }
  const real = scorePayload(indexPacket(loadPacket()), payload);
  console.log('real packet:    ' + summaryLine(real));

  let altered: Score | null = null;
  const altFile = path.join(root, 'ai', 'eval', 'ai-suggestions.altered.json');
  if (existsSync(altFile)) {
    const { alteredPacket } = await import('../tests/fixtures/altered');
    altered = scorePayload(indexPacket(alteredPacket()), JSON.parse(readFileSync(altFile, 'utf8')) as AiPayload);
    console.log('altered packet: ' + summaryLine(altered) + `; claims on missing lines ${altered.claimsNotInPacket}`);
  }
  // The previous prompt version, when its payload was kept beside this one.
  let previous: { score: Score; meta: RunMeta } | undefined;
  const prevFile = path.join(root, 'ai', 'eval', 'ai-suggestions.v1.json');
  if (existsSync(prevFile) && path.resolve(prevFile) !== file) {
    const prev = JSON.parse(readFileSync(prevFile, 'utf8')) as AiPayload;
    if (prev.promptVersion !== payload.promptVersion) {
      previous = { score: scorePayload(indexPacket(loadPacket()), prev), meta: meta(prevFile) };
      console.log(`previous (${prev.promptVersion}): ` + summaryLine(previous.score));
    }
  }
  const shown = shownView(indexPacket(loadPacket()), payload);
  console.log(`as shown:       ${summaryLine(shown.score)}; held back ${shown.heldBack} ${JSON.stringify(shown.reasons)}`);
  const out = path.join(root, '..', 'docs', 'handin', 'ai-scorecard.md');
  // A second model's verdicts on the strict matches, kept beside the code (ai/adjudication-<version>.json); names redacted.
  let adjudication: Adjudication | undefined;
  const adjFile = path.join(root, 'ai', `adjudication-${payload.promptVersion.replace(/^reader-/, '')}.json`);
  if (existsSync(adjFile)) {
    const ix = indexPacket(loadPacket());
    const a = JSON.parse(readFileSync(adjFile, 'utf8')) as Adjudication;
    adjudication = { ...a, matches: a.matches.map((m) => ({ ...m, reason: redactNames(ix, m.reason) })), beyond: a.beyond.map((b) => ({ ...b, reason: redactNames(ix, b.reason) })) };
    const known = new Set(real.strictMatches.map((m) => `${m.suggestionId}|${m.ledgerId}`));
    const missing = real.strictMatches.filter((m) => !adjudication!.matches.some((x) => x.suggestionId === m.suggestionId && x.ledgerId === m.ledgerId));
    const stale = adjudication.matches.filter((m) => !known.has(`${m.suggestionId}|${m.ledgerId}`));
    console.log(`adjudication: ${adjudication.matches.length} verdicts; strict matches without one ${missing.length}; verdicts with no match ${stale.length}`);
  }
  writeFileSync(out, scorecardMarkdown(real, altered, meta(file), undefined, previous, shown, adjudication, goldSet(indexPacket(loadPacket()))));
  console.log(`harness: wrote ${path.relative(root, out)}; ${real.unmatched.length} grounded suggestion(s) match no ledger entry (listed for reading)`);
}

/** Run figures from a run-meta file: the reader's (calls) or the agent's (turns, tool calls, served models). */
function figures(payloadFile: string): ScoredRun['meta'] {
  const f = payloadFile.replace(/\.json$/, '.run-meta.json');
  if (!existsSync(f)) return {};
  const m = JSON.parse(readFileSync(f, 'utf8')) as ScoredRun['meta'];
  return { costUsd: m.costUsd, seconds: m.seconds, calls: m.calls, turns: m.turns, toolCalls: m.toolCalls, servedModels: m.servedModels };
}

/** A second model's verdicts for a payload's prompt version, when kept beside the code (names redacted on print). */
function adjudicationFor(root: string, version: string): Adjudication | undefined {
  const f = path.join(root, 'ai', `adjudication-${version.replace(/^reader-/, '')}.json`);
  if (!existsSync(f)) return undefined;
  const a = JSON.parse(readFileSync(f, 'utf8')) as Adjudication;
  return a.promptVersion === version ? a : undefined;
}

async function agentCard(root: string) {
  const ev = (f: string) => path.join(root, 'ai', 'eval', f);
  const agentFiles = readdirSync(path.join(root, 'ai', 'eval')).filter((f) => /^agent-suggestions(\.blind|\.hide-\d+)?\.json$/.test(f))
    .sort((x, y) => Number(x !== 'agent-suggestions.json') - Number(y !== 'agent-suggestions.json') || x.localeCompare(y)); // production first
  if (!agentFiles.length) { console.error('No ai/eval/agent-suggestions*.json. Run the agent first (npx tsx ai/agent.ts, budget approved).'); process.exit(2); }
  const { alteredPacket } = await import('../tests/fixtures/altered');
  const realIx = indexPacket(loadPacket()); const altIx = indexPacket(alteredPacket());
  const gold = goldSet(realIx);
  const scored = (ix: typeof realIx, f: string): ScoredRun => {
    const p = JSON.parse(readFileSync(ev(f), 'utf8')) as AiPayload;
    return { label: p.promptVersion, score: scorePayload(ix, p), shown: shownView(ix, p), meta: figures(ev(f)), adjudication: adjudicationFor(root, p.promptVersion) };
  };
  const reader = scored(realIx, 'ai-suggestions.json');
  const agents: ModeRun[] = agentFiles.map((f) => {
    const run = scored(realIx, f);
    const metaFile = ev(f).replace(/\.json$/, '.run-meta.json');
    const m = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) as { mode?: ModeRun['mode']; seed?: number | null; hiddenCheckIds?: string[] } : {};
    const mode = m.mode ?? 'default';
    if (mode === 'blind') return { ...run, mode, tier: gold.map((g) => g.id) };
    if (mode === 'hide-checks') {
      const seed = Number(m.seed);
      if (!Number.isInteger(seed)) throw new Error(`${f}: hide-checks run without a seed in its run meta`);
      const hidden = hiddenCheckIds(seed); // recomputed here from the seed and the real checks, never taken from the agent
      if (m.hiddenCheckIds && m.hiddenCheckIds.join('|') !== hidden.join('|')) console.warn(`${f}: run meta's hidden check ids differ from the seed's; scoring the seed's`);
      return { ...run, mode, seed, tier: hiddenOnlyLedger(realIx, hidden) };
    }
    return { ...run, mode: 'default', tier: uncheckedLedger(realIx) };
  });
  const altered = ['ai-suggestions.altered.json', 'agent-suggestions.altered.json'].filter((f) => existsSync(ev(f))).map((f) => scored(altIx, f));
  for (const r of [reader, ...agents, ...altered]) console.log(`${r.label}: ${summaryLine(r.score)}`);
  const out = ev('agent-scorecard.md');
  writeFileSync(out, agentScorecardMarkdown(reader, agents, altered, gold));
  console.log(`harness: wrote ${path.relative(root, out)}`);
}

main().catch((e) => { console.error('harness failed:', e instanceof Error ? e.message : e); process.exit(1); });
