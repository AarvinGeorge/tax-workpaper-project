// Measurement summary CLI (CPA toolkit plan, Task 6). Run from project-build:
//   npx tsx ai/eval/summarize-runs.ts [runs dir, default ai/eval/runs] [--json]
// Offline: no network, no spend, writes nothing. Reads every run under runs/<version>/ (payload, run meta, trace, and
// <run>.adjudication.json when Aarvin has judged its beyond-ledger suggestions), scores each on the packet it was made
// on (real, altered, or the perturbed copy of its seed, rebuilt in memory) and prints each metric per run and as
// median [min-max] per condition, with every metric's definition (ai/lib/run-summary.ts METRICS), plus the offline
// verify_all and planted-list figures for each packet and mode the runs use. --json prints the same as JSON.
import path from 'node:path';
import { indexPacket, loadPacket, type PacketIndex } from '../../src/domain/packet/load';
import { runChecks } from '../../src/domain/checks/index';
import { RUNS_DIR } from '../lib/agent-core';
import { loadRuns, offlineFigures, report, summarizeRun, type PacketContext, type RunFile } from '../lib/run-summary';
import { alteredPacket } from '../../tests/fixtures/altered';
import { perturbedPacket } from '../../tests/fixtures/perturbed';

function main() {
  const root = process.cwd();
  const args = process.argv.slice(2);
  const dir = path.resolve(root, args.find((a) => !a.startsWith('--')) ?? RUNS_DIR);
  const runs = loadRuns(dir);
  const realIx = indexPacket(loadPacket());
  const realFindings = runChecks(realIx);
  const cache = new Map<string, PacketContext>();
  const ctxFor = (r: Pick<RunFile, 'packet' | 'seed'>): PacketContext => {
    const key = r.packet === 'perturbed' ? `seed-${r.seed}` : r.packet;
    if (!cache.has(key)) {
      if (r.packet === 'real') cache.set(key, { ix: realIx });
      else if (r.packet === 'altered') cache.set(key, { ix: indexPacket(alteredPacket()) });
      else { const p = perturbedPacket(r.seed!); cache.set(key, { ix: indexPacket(p.packet) as PacketIndex, planted: p.planted, realFindings }); }
    }
    return cache.get(key)!;
  };
  const summaries = runs.map((r) => summarizeRun(r, ctxFor(r)));
  const combos = new Map<string, RunFile>();
  for (const r of runs) combos.set(`${r.packet === 'perturbed' ? `seed-${r.seed}` : r.packet} ${r.modeLabel}`, r);
  const offline = [...combos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, r]) => offlineFigures(k.split(' ')[0], r.mode, r.modeLabel, ctxFor(r)));
  if (args.includes('--json')) console.log(JSON.stringify({ runsDir: dir.startsWith(root + path.sep) ? path.relative(root, dir) : dir, runs: summaries, offline }, null, 2));
  else console.log(report(summaries, offline));
}

main();
