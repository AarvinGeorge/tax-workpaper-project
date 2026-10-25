// The measurement summariser (ai/lib/run-summary.ts, CLI ai/eval/summarize-runs.ts), Task 6: tested on fixture run
// files written to a temp folder (payload, run meta, trace), never on a paid run. Offline. Scoring side: it may read
// the ledger through the harness, as ai-harness.test.ts does.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { runChecks } from '@/domain/checks/index';
import { isShown, verifySuggestions } from '@/domain/ai/verify';
import type { AiPayload } from '@/domain/ai/contract';
import { alteredPacket } from '../fixtures/altered';
import { PERTURBED_SEED, perturbedPacket } from '../fixtures/perturbed';
import { goldSet } from '../../ai/lib/harness-core';
import { runTool } from '../../ai/lib/agent-tools';
import { DIFFERS_KINDS, sweep, verifyAll } from '../../ai/lib/verify-all';
import type { AgentMode } from '../../ai/lib/modes';
import {
  METRICS, aggregate, itemLines, stopRule, leakScanner, loadRuns, offlineFigures, report, runOutcome, stat, summarizeRun, type RunFile,
} from '../../ai/lib/run-summary';

const ix = indexPacket(loadPacket());
const BLIND: AgentMode = { kind: 'blind' };
const gold = goldSet(ix);

// A grounded, shown quote: the first page line long enough for the verifier that passes it.
const rowFor = (claims: string[], doc: string, page: number, quote: string) => ({ kind: 'document_not_reflected', otherKind: null, claims, evidence: [{ doc, page, quote }], rationale: 'The page states an amount the return does not reflect.', authority: null, confidence: 0.6 });
const payloadOf = (rows: ReturnType<typeof rowFor>[]): AiPayload => ({ schemaVersion: 1, packetSha: 'abc', model: 'claude-opus-5-5', promptVersion: 'agent-v4-blind', runAt: '2026-10-25T00:00:00Z', suggestions: rows.map((r, i) => ({ id: `s${i + 1}`, ...r })), rejected: [], proposals: [] } as unknown as AiPayload);
const shownQuote = (() => {
  for (const d of ix.packet.documents) for (const p of d.pages) for (const l of p.printed_content.split('\n').map((x) => x.trim())) {
    if (l.length < 40 || /\d{3}-\d{2}-\d{4}|•/.test(l)) continue;
    const [v] = verifySuggestions(ix, payloadOf([rowFor([ix.latest.lines[0].key], d.id, p.page, l)]));
    if (isShown(v)) return { doc: d.id, page: p.page, quote: l };
  }
  throw new Error('no shown quote');
})();
const row = (claims: string[]) => rowFor(claims, shownQuote.doc, shownQuote.page, shownQuote.quote);

// Ledger entries: one a differs item on verify_all's first page touches (tool-surfaced when recorded after that page),
// one no differs item touches at all (the judgement tier), and a line no entry claims (beyond the ledger).
const firstPage = verifyAll(ix, { kind: 'differs', limit: 50, cursor: 0 }, BLIND).items as Record<string, unknown>[];
const pageLines = new Set(firstPage.flatMap((i) => itemLines(ix, i)));
const differsLines = new Set(sweep(ix, BLIND).items.filter((i) => DIFFERS_KINDS.includes(i.kind)).flatMap((i) => itemLines(ix, i as unknown as Record<string, unknown>)));
const isLine = (k: string) => !!ix.line(ix.latest.version, k);
const gA = gold.find((g) => [...g.claimLines].some((l) => pageLines.has(l) && isLine(l)))!;
const lineA = [...gA.claimLines].find((l) => pageLines.has(l))!;
const gB = gold.find((g) => g !== gA && [...g.claimLines].some(isLine) && ![...g.claimLines].some((l) => differsLines.has(l)))!;
const lineB = [...gB.claimLines].find(isLine)!;
const claimedByLedger = new Set(gold.flatMap((g) => [...g.claimLines]));
const lineC = ix.latest.lines.map((l) => l.key).find((k) => !claimedByLedger.has(k) && !differsLines.has(k))!;

let n = 0;
const turn = (t: number, calls: [string, Record<string, unknown>][], text: string | null = null, extra: Record<string, unknown> = {}) => ({
  turn: t, stopReason: calls.length ? 'tool_use' : 'end_turn', model: 'claude-opus-5-5', usage: {}, costUsd: 0.5 * t, text,
  toolCalls: calls.map(([name, input]) => ({ name, input, result: { bytes: 1, error: false } })), ...extra, _n: ++n,
});
const write = (dir: string, stem: string, o: { payload?: unknown; meta?: unknown; trace?: unknown; adjudication?: unknown }) => {
  mkdirSync(dir, { recursive: true });
  if (o.payload) writeFileSync(path.join(dir, `${stem}.json`), JSON.stringify(o.payload));
  if (o.meta) writeFileSync(path.join(dir, `${stem}.run-meta.json`), JSON.stringify(o.meta));
  if (o.trace) writeFileSync(path.join(dir, `${stem}.trace.json`), JSON.stringify(o.trace));
  if (o.adjudication) writeFileSync(path.join(dir, `${stem}.adjudication.json`), JSON.stringify(o.adjudication));
};

function fixtureRuns() {
  const runs = mkdtempSync(path.join(tmpdir(), 'summary-'));
  const v4 = path.join(runs, 'agent-v4');
  // Run 1: B recorded before any verify (agent-found, judgement tier); verify_all page 1; then A recorded (tool-surfaced);
  // C in the final answer only (beyond the ledger, adjudicated verified). An unrecordable marker names lineB.
  const trace1 = {
    promptVersion: 'agent-v4-blind', runAt: 'x', endedBy: 'final_turn', reason: null, outcome: 'ok',
    turns: [
      turn(1, [['record_suggestion', row([lineB])], ['get_line', { key: lineB }], ['get_page', { doc: shownQuote.doc, page: shownQuote.page }]]),
      turn(2, [['verify_all', { kind: 'differs', limit: 50, cursor: 0 }], ['lookup', { section: 'client_text', text: 'refund' }]]),
      turn(3, [['record_suggestion', row([lineA])], ['verify', { method: 'recompute_line', ids: [lineC], target: null, limit: null, cursor: null }]], null, { unrecordable: [`unrecordable: ${lineB}, no page carries the figure`] }),
      turn(4, [], '{"suggestions":[],"proposals":[]}'),
    ],
  };
  write(v4, 'blind.real.1', {
    payload: payloadOf([row([lineB]), row([lineA]), row([lineC])]), trace: trace1,
    meta: { payload: 'blind.real.1.json', mode: 'blind', turns: 4, toolCalls: 7, seconds: 100, costUsd: 2.5, outcome: 'ok' },
    adjudication: { promptVersion: 'agent-v4-blind', reviewer: 'Aarvin', file: 'x', matches: [], beyond: [{ suggestionId: 's3', verdict: 'verified', reason: 'r' }] },
  });
  // Run 2: truncated (trace and meta, no payload). Run 3: failed (trace only). Run 4: ok, nothing found.
  write(v4, 'blind.real.2', { trace: { promptVersion: 'agent-v4-blind', runAt: 'x', endedBy: 'stopped', reason: 'over the cost budget ($6.10 > $6)', outcome: 'truncated', turns: [turn(1, [['get_line', { key: lineA }]])] }, meta: { payload: null, mode: 'blind', outcome: 'truncated', costUsd: 6.1, turns: 1, toolCalls: 1, seconds: 50 } });
  write(v4, 'blind.real.3', { trace: { promptVersion: 'agent-v4-blind', runAt: 'x', endedBy: 'stopped', reason: 'final payload is not JSON', outcome: 'failed', turns: [] } });
  write(v4, 'blind.real.4', { payload: payloadOf([]), trace: { promptVersion: 'agent-v4-blind', runAt: 'x', endedBy: 'end_turn', reason: null, turns: [turn(1, [])] }, meta: { mode: 'blind', turns: 1, toolCalls: 0, seconds: 10, costUsd: 0.4 } });
  return runs;
}

describe('summariser: run files', () => {
  it('loads every run by stem (payload, meta, trace, adjudication), and reads the outcome', () => {
    const runs = loadRuns(fixtureRuns());
    expect(runs.map((r) => r.file)).toEqual(['agent-v4/blind.real.1.json', 'agent-v4/blind.real.2.json', 'agent-v4/blind.real.3.json', 'agent-v4/blind.real.4.json'].map((f) => f.split('/').join(path.sep)));
    expect(runs.map(runOutcome)).toEqual(['ok', 'truncated', 'failed', 'ok']); // run 4's trace predates the outcome field
    expect(runs[0]).toMatchObject({ version: 'agent-v4', modeLabel: 'blind', packet: 'real', n: 1 });
    expect(runs[0].adjudication?.beyond).toHaveLength(1);
    expect(runOutcome({ payload: null, meta: null, trace: { endedBy: 'iteration_cap', reason: null } as never })).toBe('truncated');
    expect(runOutcome({ payload: null, meta: null, trace: { endedBy: 'stopped', reason: 'the model refused' } as never })).toBe('failed');
  });
});

describe('summariser: per-run metrics', () => {
  const runs = loadRuns(fixtureRuns());
  const s = summarizeRun(runs[0], { ix });

  it('the fixture means something: A is on verify_all page 1, B on no differs item, C on no ledger line', () => {
    expect(gA && gB && lineC).toBeTruthy();
    expect(gA.id).not.toBe(gB.id);
  });

  it('strict recall over reachable entries, precision, and the tool-surfaced / agent-found split from the replayed trace', () => {
    const g = s.ledger!;
    expect(g.reachable).toBe(gold.filter((x) => [...x.claimLines].some(isLine)).length);
    expect(g.total).toBe(gold.length);
    expect(g.recallAll).toBe(g.found.length / gold.length);
    expect(g.recall).toBe(g.found.length / g.reachable);
    expect(g.found).toEqual(expect.arrayContaining([gA.id, gB.id]));
    expect(g.toolSurfaced).toContain(gA.id);   // verify_all page 1 (turn 2) covered lineA before it was recorded (turn 3)
    expect(g.agentFound).toContain(gB.id);     // recorded in turn 1, before any verify
    expect(g.untouchedByDiffers).toContain(gB.id);
    expect(g.untouchedByDiffers).not.toContain(gA.id);
    expect(g.judgementFound).toContain(gB.id);
    expect(g.judgementRecall).toBe(g.judgementFound.length / g.untouchedByDiffers.length);
    expect(g.precision).toBe(g.matchedGrounded / g.grounded);
    expect(g.grounded).toBe(3);
  });

  it('beyond the ledger: shown suggestions on no entry, with Aarvin\'s verdicts', () => {
    expect(s.beyond!.candidates).toBeGreaterThanOrEqual(1);
    expect(s.beyond!.verified).toBe(1);
    expect(s.beyond!.unadjudicated).toBe(s.beyond!.candidates - 1);
  });

  it('verify before record: A was covered by an earlier verify_all result, B was not; C (final answer) by the turn-3 verify', () => {
    expect(s.discipline).toEqual({ recorded: 3, covered: 2, share: 2 / 3 });
  });

  it('verify_all coverage, the unrecordable marker, lines and documents opened, tool mix, run figures', () => {
    expect(s.coverage.differs).toBe(sweep(ix, BLIND).items.filter((i) => DIFFERS_KINDS.includes(i.kind)).length);
    expect(s.coverage.addressed).toBeGreaterThan(0);
    expect(s.coverage.share).toBe(s.coverage.addressed / s.coverage.differs);
    expect(s.unrecordable).toEqual({ markers: 1, lines: [lineB] });
    expect(s.opened).toMatchObject({ lines: 2, getLine: 1, docs: 1, linesTotal: ix.latest.lines.length, docsTotal: ix.packet.documents.length });
    expect(s.toolMix).toEqual({ record_suggestion: 2, get_line: 1, get_page: 1, verify_all: 1, lookup: 1, verify: 1 });
    expect(s.verifyFamilyCalls).toBe(3);
    expect(s.getPageCalls).toBe(1);
    expect(s).toMatchObject({ turns: 4, toolCalls: 7, seconds: 100, costUsd: 2.5, outcome: 'ok', heldBack: 0, rejected: 0 });
  });

  it('blind leak check: every traced call replayed, none carries a finding\'s text; the scanner does fire on run_checks output', () => {
    expect(s.leak).toEqual({ checked: 7, leaks: [] });
    const scan = leakScanner(ix);
    const checks = runTool(ix, 'run_checks', { limit: 50, cursor: 0 }, { mode: { kind: 'default' } });
    expect(scan(checks)).not.toBeNull(); // a zero proven able to be non-zero
    expect(scan(runTool(ix, 'verify_all', { kind: 'differs', limit: 50, cursor: 0 }, { mode: BLIND }))).toBeNull();
    expect(summarizeRun({ ...runs[0], mode: { kind: 'default' }, modeLabel: 'default' }, { ix }).leak).toBeNull(); // only blind modes
  });

  it('truncated and failed runs are not scored, but keep their trace figures', () => {
    const t = summarizeRun(runs[1], { ix });
    expect(t).toMatchObject({ outcome: 'truncated', ledger: null, beyond: null, costUsd: 6.1, turns: 1 });
    expect(t.opened.getLine).toBe(1);
    expect(summarizeRun(runs[2], { ix })).toMatchObject({ outcome: 'failed', ledger: null, reason: 'final payload is not JSON' });
  });

  it('altered packet: entries whose claim lines were removed are unreachable, not misses', () => {
    const aIx = indexPacket(alteredPacket());
    const a = summarizeRun({ ...runs[3] }, { ix: aIx });
    const goneAll = goldSet(aIx).filter((g) => ![...g.claimLines].some((l) => !!aIx.line(aIx.latest.version, l))).map((g) => g.id);
    expect(a.ledger!.unreachable).toEqual(goneAll);
    expect(a.ledger!.reachable + a.ledger!.unreachable.length).toBe(gold.length);
    // At least one entry reachable on the real packet lost every claim line on the altered one (the removed form).
    expect(goneAll.some((id) => [...gold.find((g) => g.id === id)!.claimLines].some(isLine))).toBe(true);
  });
});

describe('summariser: the perturbed packet', () => {
  const b = perturbedPacket(PERTURBED_SEED);
  const pIx = indexPacket(b.packet);
  const realFindings = runChecks(ix);
  it('scores the agent on the planted list, with attributable beside precision', () => {
    const p = b.planted[0];
    const doc = pIx.packet.documents.find((d) => d.id === shownQuote.doc)!;
    expect(doc.pages.find((x) => x.page === shownQuote.page)!.printed_content).toContain(shownQuote.quote);
    const stale = [...new Set(b.planted.flatMap((x) => x.stale))].slice(0, 3);
    const payload = payloadOf([row([p.lines[0]]), ...stale.map((k) => row([k]))]);
    const run: RunFile = { file: 'agent-v4/blind.seed-1.1.json', version: 'agent-v4', modeLabel: 'blind', mode: BLIND, packet: 'perturbed', seed: 1, n: 1, payload, meta: { outcome: 'ok' }, trace: { promptVersion: 'x', runAt: 'x', endedBy: 'end_turn', reason: null, outcome: 'ok', turns: [] }, adjudication: null };
    const s = summarizeRun(run, { ix: pIx, planted: b.planted, realFindings });
    expect(s.planted).toMatchObject({ considered: 4, matched: 1, attributable: 0, falsePositives: 3 }); // the shotgun buys nothing
    expect(s.planted!.precision).toBe(0.25);
    const text = report([s]);
    expect(text).toMatch(/precision 0\.25 \(attributable 0, false positives 3\)/);
    expect(text).toMatch(/planted: on line .*precision .*\(attributable /);
  });

  it('offline figures: verify_all differs and the ledger entries they touch; on perturbed, checks and sweep on the planted list', () => {
    const real = offlineFigures('real', BLIND, 'blind', { ix });
    expect(real.differs).toBe(sweep(ix, BLIND).items.filter((i) => DIFFERS_KINDS.includes(i.kind)).length);
    expect(real.ledgerTotal).toBe(gold.length);
    expect(real.ledgerTouchedByDiffers).toContain(gA.id);
    expect(real.ledgerTouchedByDiffers).not.toContain(gB.id);
    expect(real.planted).toBeNull();
    const pert = offlineFigures('seed-1', BLIND, 'blind', { ix: pIx, planted: b.planted, realFindings });
    expect(pert.planted!.sweep.considered).toBeGreaterThan(0);
    expect(Object.keys(pert.planted!.perKind).sort()).toEqual([...new Set(b.planted.map((x) => x.kind))].sort());
    expect(report([], [pert])).toMatch(/sweep: matched \d+ of \d+, precision [\d.]+ \(attributable \d+\)/);
  });
});

describe('summariser: aggregation and report', () => {
  const runs = loadRuns(fixtureRuns());
  const all = runs.map((r) => summarizeRun(r, { ix }));

  it('median, min and max per condition over ok runs only; truncated and failed counted apart', () => {
    const [c] = aggregate(all);
    expect(c).toMatchObject({ condition: 'agent-v4 blind real', runs: 4, ok: 2, truncated: 1, failed: 1 });
    expect(c.stats.cost_usd).toEqual({ median: 1.45, min: 0.4, max: 2.5, n: 2 });
    expect(stat([3, 1, 2])).toEqual({ median: 2, min: 1, max: 3, n: 3 });
    expect(stat([])).toBeNull();
  });

  it('every metric is defined in code and printed with its definition', () => {
    const text = report(all);
    expect(new Set(METRICS.map((m) => m.key)).size).toBe(METRICS.length);
    for (const m of METRICS) {
      expect(m.define.length, m.key).toBeGreaterThan(10);
      expect(text, m.key).toContain(`- **${m.key}**: ${m.define}`);
      expect(text, m.key).toMatch(new RegExp(`^- ${m.key}: `, 'm'));
    }
    expect(text).toContain('1 truncated, 1 failed');
    // Stop rule: the fixture has a failed run and one over $4 (the truncated run at $6.10).
    expect(stopRule(all)).toMatchObject({ halt: true, failed: [path.join('agent-v4', 'blind.real.3.json')], overCost: [path.join('agent-v4', 'blind.real.2.json')] });
    expect(stopRule(all.filter((r) => r.outcome === 'ok')).halt).toBe(false);
    expect(text).toMatch(/^Stop rule .*: HALT;/m);
    expect(text).toMatch(/tool-surfaced .* vs agent-found/);
    expect(text).toMatch(/blind leak check: 0 leak\(s\) in 7 replayed results/);
  });

  it('the CLI exists, reads runs/ by default and loads each packet the runs name; agent code never imports the summariser', () => {
    const src = readFileSync('ai/eval/summarize-runs.ts', 'utf8');
    expect(src).toMatch(/loadRuns\(/);
    expect(src).toMatch(/RUNS_DIR/);
    expect(src).toMatch(/perturbedPacket\(/);
    expect(src).toMatch(/alteredPacket\(/);
    expect(src).not.toMatch(/agent\.ts|runAgent|ANTHROPIC|\.env/);
    for (const f of ['ai/lib/agent-core.ts', 'ai/lib/agent-tools.ts', 'ai/lib/calculator.ts', 'ai/lib/case-file.ts', 'ai/lib/modes.ts', 'ai/lib/verify-all.ts', 'ai/lib/lookup.ts', 'ai/lib/prompt-v4.ts', 'ai/agent.ts']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/run-summary|summarize-runs/);
    }
    expect(existsSync('ai/lib/run-summary.ts')).toBe(true);
  });
});
