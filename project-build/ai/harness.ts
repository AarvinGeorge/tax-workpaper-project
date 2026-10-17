// AI harness CLI. Run from project-build:  npx tsx ai/harness.ts [payload path]
// Scores the payload (default data/ai-suggestions.json) against the ledger, and the altered-packet payload when present,
// writes ../docs/handin/ai-scorecard.md and prints a summary.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AiPayload } from '../src/domain/ai/contract';
import { indexPacket, loadPacket } from '../src/domain/packet/load';
import { goldSet, scorecardMarkdown, scorePayload, shownView, summaryLine, type Adjudication, type RunMeta, type Score } from './lib/harness-core';
import { redactNames } from './lib/reader-core';

function meta(payloadFile: string): RunMeta {
  const f = payloadFile.replace(/\.json$/, '.run-meta.json');
  if (!existsSync(f)) return {};
  const m = JSON.parse(readFileSync(f, 'utf8')) as { calls: number; costUsd: number | null; usage: Record<string, number> };
  const u = m.usage;
  return { calls: m.calls, costUsd: m.costUsd, tokens: `${u.input_tokens} in, ${u.cache_creation_input_tokens} cache write, ${u.cache_read_input_tokens} cache read, ${u.output_tokens} out` };
}

async function main() {
  const root = process.cwd();
  const file = path.resolve(root, process.argv[2] ?? 'data/ai-suggestions.json');
  if (!existsSync(file)) { console.error(`No payload at ${path.relative(root, file)}. Run the reader first.`); process.exit(2); }
  const payload = JSON.parse(readFileSync(file, 'utf8')) as AiPayload;
  const real = scorePayload(indexPacket(loadPacket()), payload);
  console.log('real packet:    ' + summaryLine(real));

  let altered: Score | null = null;
  const altFile = path.join(root, 'data', 'ai-suggestions.altered.json');
  if (existsSync(altFile)) {
    const { alteredPacket } = await import('../tests/fixtures/altered');
    altered = scorePayload(indexPacket(alteredPacket()), JSON.parse(readFileSync(altFile, 'utf8')) as AiPayload);
    console.log('altered packet: ' + summaryLine(altered) + `; claims on missing lines ${altered.claimsNotInPacket}`);
  }
  // The previous prompt version, when its payload was kept beside this one.
  let previous: { score: Score; meta: RunMeta } | undefined;
  const prevFile = path.join(root, 'data', 'ai-suggestions.v1.json');
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

main().catch((e) => { console.error('harness failed:', e instanceof Error ? e.message : e); process.exit(1); });
