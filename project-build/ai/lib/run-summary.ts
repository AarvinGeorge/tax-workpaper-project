// The measurement summariser's core (CPA toolkit plan, Task 6; CLI ai/eval/summarize-runs.ts). Offline: reads run files
// (payload, run meta, trace) and computes every metric of the plan's measurement design per run, then median, min and
// max per condition (prompt version x mode x packet). Every metric is defined in code (METRICS) and printed with its
// definition, so a headline number always says what it counts. Scoring side only: it reads the ledger through the
// harness (goldSet) and the planted list through planted-score, as the harness does; agent code never imports it and
// nothing here reaches the model. Tool results are not stored in a trace, so each traced tool call is replayed here,
// on the same packet and in the run's mode, through the agent's own runTool (deterministic, read-only).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { AiPayload, AiSuggestion } from '../../src/domain/ai/contract';
import type { Finding } from '../../src/domain/contracts';
import type { PacketIndex } from '../../src/domain/packet/load';
import { runChecks } from '../../src/domain/checks/index';
import type { Plant } from '../../tests/fixtures/perturbed';
import type { AgentRunMeta, AgentTrace, RunOutcome } from './agent-core';
import { runTool } from './agent-tools';
import { goldSet, isGrounded, matches, matchesStrict, scorePayload, shownView, type Adjudication, type Gold } from './harness-core';
import { isBlind, type AgentMode } from './modes';
import { plantedReport, plantedScore, type KindTally, type SweepItem } from './planted-score';
import { DIFFERS_KINDS, sweep } from './verify-all';

type Obj = Record<string, unknown>;
export type PacketName = 'real' | 'altered' | 'perturbed';

// ---------- Run files ----------
/** <mode>.<packet>.<n>.json under runs/<version>/ (agent-core agentOutFile). */
export const RUN_NAME = /^(default|blind|blind-v3|hide-\d+)\.(real|altered|seed-\d+)\.(\d+)\.json$/;
export function modeFromLabel(label: string): AgentMode {
  if (label === 'default' || label === 'blind' || label === 'blind-v3') return { kind: label };
  const m = label.match(/^hide-(\d+)$/);
  if (!m) throw new Error(`unknown mode label ${label}`);
  return { kind: 'hide-checks', seed: Number(m[1]) };
}

export interface RunFile {
  /** Relative to the runs folder, e.g. agent-v4/blind.real.1.json (the payload's name, present or not). */
  file: string; version: string; modeLabel: string; mode: AgentMode; packet: PacketName; seed: number | null; n: number;
  payload: AiPayload | null; meta: (Partial<AgentRunMeta> & { reason?: string }) | null; trace: AgentTrace | null;
  /** Verdicts on this run's beyond-ledger suggestions, from <stem>.adjudication.json beside it (Adjudication format). */
  adjudication: Adjudication | null;
}

const readJson = <T>(f: string): T | null => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as T : null);

/** Every run in runs/<version>/: one per stem with a payload, a run meta or a trace (a failed run has a trace only). */
export function loadRuns(runsDir: string): RunFile[] {
  if (!existsSync(runsDir)) return [];
  const out: RunFile[] = [];
  for (const version of readdirSync(runsDir).sort()) {
    const dir = path.join(runsDir, version);
    let names: string[];
    try { names = readdirSync(dir); } catch { continue; }
    const stems = new Set(names.map((f) => f.replace(/\.(trace|run-meta|adjudication)\.json$/, '.json')).filter((f) => RUN_NAME.test(f)));
    for (const f of [...stems].sort()) {
      const [, label, packetTag, n] = f.match(RUN_NAME)!;
      const stem = path.join(dir, f.replace(/\.json$/, ''));
      out.push({
        file: path.join(version, f), version, modeLabel: label, mode: modeFromLabel(label),
        packet: packetTag.startsWith('seed-') ? 'perturbed' : (packetTag as PacketName), seed: packetTag.startsWith('seed-') ? Number(packetTag.slice(5)) : null, n: Number(n),
        payload: readJson<AiPayload>(`${stem}.json`), meta: readJson(`${stem}.run-meta.json`), trace: readJson<AgentTrace>(`${stem}.trace.json`),
        adjudication: readJson<Adjudication>(`${stem}.adjudication.json`),
      });
    }
  }
  return out;
}

/** ok, truncated or failed: from the trace or run meta when they say; for older files, a payload means ok, a cap means
 *  truncated, anything else failed. */
export function runOutcome(r: Pick<RunFile, 'payload' | 'meta' | 'trace'>): RunOutcome {
  const said = r.trace?.outcome ?? r.meta?.outcome;
  if (said) return said;
  if (r.payload) return 'ok';
  const why = `${r.trace?.reason ?? ''} ${r.meta?.reason ?? ''}`;
  return r.trace?.endedBy === 'iteration_cap' || /cost budget|wall-clock|iteration cap/.test(why) ? 'truncated' : 'failed';
}

// ---------- Trace replay ----------
interface Call { turn: number; name: string; input: Obj }
const callsOf = (t: AgentTrace | null): Call[] => (t?.turns ?? []).flatMap((x) => x.toolCalls.map((c) => ({ turn: x.turn, name: c.name, input: (c.input ?? {}) as Obj })));
const lastTurn = (t: AgentTrace | null) => (t?.turns.length ? t.turns[t.turns.length - 1].turn : 0);

/** One traced call re-run on the packet in the run's mode: the result text, or null when it cannot run (an error). */
function replay(ix: PacketIndex, c: Call, mode: AgentMode, recorder?: unknown[]): string | null {
  try { return runTool(ix, c.name, c.input, { mode, recorder: recorder as never }); } catch { return null; }
}
const dataOf = (text: string | null): Obj | null => { if (!text) return null; try { return (JSON.parse(text) as { data?: Obj }).data ?? null; } catch { return null; } };

const isLine = (ix: PacketIndex, k: unknown): k is string => typeof k === 'string' && !!ix.line(ix.latest.version, k);
const lineOf = (c: string) => c.replace(/^line:/, '');
/** The line keys a tool item is about: key, lines, line claims, and ids that are line keys (as planted-score reads a
 *  sweep item). */
export function itemLines(ix: PacketIndex, it: Obj): string[] {
  const raw = [it.key, ...((it.lines as unknown[]) ?? []), ...((it.claims as unknown[]) ?? []), ...((it.ids as unknown[]) ?? [])];
  return [...new Set(raw.filter((x): x is string => typeof x === 'string').map(lineOf).filter((k) => isLine(ix, k)))];
}
/** The lines a verify or verify_all result covers: its items' lines, plus (verify) the line ids and target it was given. */
function coveredLines(ix: PacketIndex, c: Call, data: Obj | null): string[] {
  const items = Array.isArray(data?.items) ? (data!.items as Obj[]) : [];
  const own = c.name === 'verify' && !data?.error ? [...((c.input.ids as unknown[]) ?? []), c.input.target].filter((x) => isLine(ix, x)) as string[] : [];
  return [...new Set([...own, ...items.flatMap((i) => itemLines(ix, i))])];
}

/** The documents a line cites (value ids' documents, doc: refs). */
function lineDocs(ix: PacketIndex, key: string): string[] {
  const l = ix.line(ix.latest.version, key);
  return (l?.sources ?? []).map(String).map((s) => (s.startsWith('ev-') ? ix.valueById.get(s)?.document_id ?? null : s.match(/^doc:(D\d+)/)?.[1] ?? null)).filter((d): d is string => !!d);
}

const sugKey = (s: { kind?: unknown; claims?: unknown; evidence?: unknown }) => {
  const claims = Array.isArray(s.claims) ? (s.claims as string[]).map(lineOf).sort().join(',') : '';
  const doc = Array.isArray(s.evidence) && s.evidence[0] ? String((s.evidence[0] as Obj).doc) : '';
  return `${String(s.kind)}|${claims}|${doc}`;
};

// ---------- Leak scan (blind) ----------
/** What must never appear in a blind tool result: a finding's title or explanation (as JSON text), a check id, a
 *  ledger id, or the onCheck field. Returns the first match's description, or null. */
export function leakScanner(ix: PacketIndex): (text: string) => string | null {
  const esc = (t: string) => JSON.stringify(t).slice(1, -1);
  const findings = runChecks(ix);
  const titles = [...new Set(findings.map((f) => f.title))].filter((t) => t.length >= 12).map((t) => ({ what: `finding title "${t}"`, s: esc(t) }));
  const expl = [...new Set(findings.map((f) => f.explanation))].filter((t) => t.length >= 20).map((t) => ({ what: 'a finding explanation', s: esc(t) }));
  return (text) => {
    if (/CHK-[A-Z]/.test(text)) return 'a check id';
    if (/GT-[A-Z]\d\d/.test(text)) return 'a ledger id';
    if (/"onCheck"/.test(text)) return 'onCheck';
    for (const x of [...titles, ...expl]) if (text.includes(x.s)) return x.what;
    return null;
  };
}

// ---------- Per run ----------
export interface LedgerMetrics {
  /** Entries with a claim line in this packet (the others are unreachable, not misses). */
  reachable: number; unreachable: string[];
  found: string[]; total: number; recallAll: number | null; recall: number | null; shownFound: string[]; shownRecall: number | null;
  matchedGrounded: number; grounded: number; precision: number | null;
  looseOnly: string[];
  toolSurfaced: string[]; agentFound: string[];
  /** Reachable entries no verify_all differs item touches (the judgement tier) and the agent-found among them. */
  untouchedByDiffers: string[]; judgementFound: string[]; judgementRecall: number | null;
}
export interface RunSummary {
  file: string; condition: string; version: string; mode: string; packet: string; n: number;
  outcome: RunOutcome; endedBy: string | null; reason: string | null;
  turns: number | null; toolCalls: number | null; seconds: number | null; costUsd: number | null;
  toolMix: Record<string, number>; verifyFamilyCalls: number; getPageCalls: number;
  suggestions: number | null; shown: number | null; heldBack: number | null; rejected: number | null;
  ledger: LedgerMetrics | null;
  opened: { lines: number; getLine: number; linesTotal: number; docs: number; docsTotal: number };
  coverage: { differs: number; addressed: number; share: number | null; addressedUnrecordable: number };
  unrecordable: { markers: number; lines: string[] };
  discipline: { recorded: number; covered: number; share: number | null };
  leak: { checked: number; leaks: { turn: number; tool: string; what: string }[] } | null;
  beyond: { candidates: number; verified: number; plausible: number; wrong: number; duplicate: number; unadjudicated: number } | null;
  planted: { considered: number; matched: number; attributable: number; falsePositives: number; precision: number; perKind: Record<string, KindTally> } | null;
}

/** The packet a run was made on, and (perturbed) its planted list and the real packet's findings for the baseline. */
export interface PacketContext { ix: PacketIndex; planted?: Plant[]; realFindings?: Finding[] }

const ratio = (a: number, b: number) => (b ? a / b : null);
const VERDICT: Record<string, 'verified' | 'plausible' | 'wrong' | 'duplicate'> = {
  verified: 'verified', 'REAL-NEW': 'verified', plausible: 'plausible', UNSURE: 'plausible', wrong: 'wrong', 'NOT-REAL': 'wrong', 'REAL-DUPLICATE': 'duplicate',
};

export function summarizeRun(run: RunFile, ctx: PacketContext): RunSummary {
  const { ix } = ctx;
  const mode = run.mode;
  const outcome = runOutcome(run);
  const calls = callsOf(run.trace);
  const final = lastTurn(run.trace);
  const toolMix: Record<string, number> = {};
  for (const c of calls) toolMix[c.name] = (toolMix[c.name] ?? 0) + 1;

  // Replay, in order: what each verify / verify_all call covered and when; which record_suggestion was accepted when.
  const touches: { turn: number; lines: Set<string> }[] = [];
  const recorder: unknown[] = [];
  const accepted: { turn: number; key: string; claims: string[] }[] = [];
  const leakOf = isBlind(mode) ? leakScanner(ix) : null;
  const leaks: { turn: number; tool: string; what: string }[] = [];
  for (const c of calls) {
    const before = recorder.length;
    const text = replay(ix, c, mode, c.name === 'record_suggestion' ? recorder : undefined);
    if (leakOf && text) { const w = leakOf(text); if (w) leaks.push({ turn: c.turn, tool: c.name, what: w }); }
    if (c.name === 'verify' || c.name === 'verify_all') touches.push({ turn: c.turn, lines: new Set(coveredLines(ix, c, dataOf(text))) });
    if (c.name === 'record_suggestion' && recorder.length > before) {
      accepted.push({ turn: c.turn, key: sugKey(c.input), claims: ((c.input.claims as string[]) ?? []).map(lineOf) });
    }
  }
  const touchedBefore = (lines: string[], turn: number) => touches.some((t) => t.turn < turn && lines.some((l) => t.lines.has(l)));
  /** The turn a payload suggestion was settled: its accepted record_suggestion call, else the final answer. */
  const turnOf = (s: AiSuggestion) => accepted.find((a) => a.key === sugKey(s))?.turn ?? final;

  const openedLines = new Set(calls.filter((c) => c.name === 'get_line' && isLine(ix, c.input.key)).map((c) => String(c.input.key)));
  // Lines opened, as the v3 blind trace was counted (62 of 627): line keys given to get_line or to verify (ids, target).
  const touchedLines = new Set([...openedLines, ...calls.filter((c) => c.name === 'verify').flatMap((c) => [...((c.input.ids as unknown[]) ?? []), c.input.target]).filter((x): x is string => isLine(ix, x))]);
  const openedDocs = new Set(calls.filter((c) => c.name === 'get_page' && typeof c.input.doc === 'string').map((c) => String(c.input.doc)));

  // Unrecordable markers: the kept lines (TraceTurn.unrecordable), or for older traces the cut text.
  const marks = (run.trace?.turns ?? []).flatMap((t) => t.unrecordable ?? (t.text ? t.text.split('\n').filter((l) => /^\s*unrecordable:/i.test(l)) : []));
  const markLines = new Set(marks.flatMap((m) => (m.match(/[A-Za-z0-9][\w.-]*/g) ?? []).filter((w) => isLine(ix, w))));

  // verify_all coverage: every differs item of the full sweep in this mode, and whether the agent addressed it.
  const differs = sweep(ix, mode).items.filter((i) => DIFFERS_KINDS.includes(i.kind));
  const suggestedLines = new Set([...accepted.flatMap((a) => a.claims), ...(run.payload?.suggestions ?? []).flatMap((s) => s.claims.map(lineOf))]);
  let addressed = 0; let addressedUnrecordable = 0;
  for (const it of differs) {
    const lines = itemLines(ix, it as unknown as Obj);
    const docs = new Set([...lines.flatMap((l) => lineDocs(ix, l)), ...(it.ids ?? []).map((x) => (x.startsWith('ev-') ? ix.valueById.get(x)?.document_id : x.match(/^(?:doc:)?(D\d+)/)?.[1])).filter((d): d is string => !!d)]);
    const hit = lines.some((l) => openedLines.has(l) || suggestedLines.has(l)) || [...docs].some((d) => openedDocs.has(d));
    if (!hit) continue;
    addressed++;
    if (lines.some((l) => markLines.has(l))) addressedUnrecordable++;
  }

  // Number discipline: each recorded suggestion (accepted record calls, then final-answer-only rows at the last turn).
  const finalOnly = (run.payload?.suggestions ?? []).filter((s) => !accepted.some((a) => a.key === sugKey(s)));
  const recorded = [...accepted.map((a) => ({ turn: a.turn, claims: a.claims })), ...finalOnly.map((s) => ({ turn: final, claims: s.claims.map(lineOf) }))];
  const covered = recorded.filter((r) => touchedBefore(r.claims, r.turn)).length;

  const summary: RunSummary = {
    file: run.file, condition: `${run.version} ${run.modeLabel} ${run.packet === 'perturbed' ? `seed-${run.seed}` : run.packet}`,
    version: run.version, mode: run.modeLabel, packet: run.packet === 'perturbed' ? `seed-${run.seed}` : run.packet, n: run.n,
    outcome, endedBy: run.trace?.endedBy ?? null, reason: run.trace?.reason ?? run.meta?.reason ?? null,
    turns: run.meta?.turns ?? (run.trace ? run.trace.turns.length : null), toolCalls: run.meta?.toolCalls ?? (run.trace ? calls.length : null),
    seconds: run.meta?.seconds ?? null, costUsd: run.meta?.costUsd ?? (run.trace?.turns.length ? run.trace.turns[run.trace.turns.length - 1].costUsd : null),
    toolMix, verifyFamilyCalls: (toolMix.verify ?? 0) + (toolMix.verify_all ?? 0) + (toolMix.lookup ?? 0), getPageCalls: toolMix.get_page ?? 0,
    suggestions: null, shown: null, heldBack: null, rejected: null, ledger: null,
    opened: { lines: touchedLines.size, getLine: openedLines.size, linesTotal: ix.latest.lines.length, docs: openedDocs.size, docsTotal: ix.packet.documents.length },
    coverage: { differs: differs.length, addressed, share: ratio(addressed, differs.length), addressedUnrecordable },
    unrecordable: { markers: marks.length, lines: [...markLines].sort() },
    discipline: { recorded: recorded.length, covered, share: ratio(covered, recorded.length) },
    leak: leakOf ? { checked: calls.length, leaks } : null,
    beyond: null, planted: null,
  };
  if (outcome !== 'ok' || !run.payload) return summary; // truncated or failed: evidence kept, no payload scored

  const p = run.payload;
  const score = scorePayload(ix, p);
  const shown = shownView(ix, p);
  const gold = goldSet(ix);
  const reach = (g: Gold) => [...g.claimLines].some((l) => isLine(ix, l));
  const reachable = gold.filter(reach);
  const found = reachable.filter((g) => score.ledgerFound.includes(g.id));
  const grounded = p.suggestions.filter((s) => isGrounded(ix, s));
  const toolSurfaced: string[] = []; const agentFound: string[] = [];
  for (const g of found) {
    const at = Math.min(...grounded.filter((s) => matchesStrict(s, g)).map(turnOf));
    (touchedBefore([...g.claimLines], at) ? toolSurfaced : agentFound).push(g.id);
  }
  const differsLines = new Set(differs.flatMap((i) => itemLines(ix, i as unknown as Obj)));
  const untouched = reachable.filter((g) => ![...g.claimLines].some((l) => differsLines.has(l))).map((g) => g.id);
  const judgementFound = agentFound.filter((id) => untouched.includes(id));
  summary.suggestions = p.suggestions.length; summary.shown = shown.shown; summary.heldBack = shown.heldBack; summary.rejected = p.rejected.length;
  summary.ledger = {
    reachable: reachable.length, unreachable: gold.filter((g) => !reach(g)).map((g) => g.id),
    found: found.map((g) => g.id), total: gold.length, recallAll: ratio(found.length, gold.length), recall: ratio(found.length, reachable.length),
    shownFound: reachable.filter((g) => shown.score.ledgerFound.includes(g.id)).map((g) => g.id),
    shownRecall: ratio(reachable.filter((g) => shown.score.ledgerFound.includes(g.id)).length, reachable.length),
    matchedGrounded: score.matchedGrounded, grounded: score.grounded, precision: ratio(score.matchedGrounded, score.grounded),
    looseOnly: gold.filter((g) => !score.ledgerFound.includes(g.id) && grounded.some((s) => matches(s, g))).map((g) => g.id),
    toolSurfaced, agentFound, untouchedByDiffers: untouched, judgementFound, judgementRecall: ratio(judgementFound.length, untouched.length),
  };
  const candidates = shown.score.unmatched.map((u) => u.id);
  const verdicts = new Map((run.adjudication?.beyond ?? []).map((b) => [b.suggestionId, VERDICT[b.verdict]]));
  const count = (v: string) => candidates.filter((id) => verdicts.get(id) === v).length;
  summary.beyond = { candidates: candidates.length, verified: count('verified'), plausible: count('plausible'), wrong: count('wrong'), duplicate: count('duplicate'), unadjudicated: candidates.filter((id) => !verdicts.get(id)).length };
  if (ctx.planted) {
    const s = plantedScore(ix, ctx.planted, p);
    summary.planted = { considered: s.considered, matched: s.matched, attributable: s.attributable, falsePositives: s.falsePositives, precision: s.precision, perKind: s.perKind };
  }
  return summary;
}

// ---------- Offline figures per packet and mode (deterministic, no run needed) ----------
export interface OfflineFigures {
  packet: string; mode: string; differs: number; ledgerTouchedByDiffers: string[]; ledgerTotal: number;
  /** Perturbed only: runChecks (new findings vs the real packet) and the verify_all sweep scored on the planted list. */
  planted: { checks: { considered: number; matched: number; attributable: number; precision: number }; sweep: { considered: number; matched: number; attributable: number; precision: number }; perKind: Record<string, { plants: number; checks: KindTally; sweep: KindTally | null }> } | null;
}
export function offlineFigures(packet: string, mode: AgentMode, modeLabel: string, ctx: PacketContext): OfflineFigures {
  const { ix } = ctx;
  const items = sweep(ix, mode).items;
  const differsLines = new Set(items.filter((i) => DIFFERS_KINDS.includes(i.kind)).flatMap((i) => itemLines(ix, i as unknown as Obj)));
  const gold = goldSet(ix);
  let planted: OfflineFigures['planted'] = null;
  if (ctx.planted && ctx.realFindings) {
    const r = plantedReport(ix, ctx.planted, { findings: runChecks(ix), baseline: ctx.realFindings, sweep: items as unknown as SweepItem[] });
    const pick = (s: { considered: number; matched: number; attributable: number; precision: number }) => ({ considered: s.considered, matched: s.matched, attributable: s.attributable, precision: s.precision });
    planted = { checks: pick(r.checks), sweep: pick(r.sweep!), perKind: Object.fromEntries(Object.entries(r.perKind).map(([k, v]) => [k, { plants: v.plants, checks: v.checks, sweep: v.sweep }])) };
  }
  return { packet, mode: modeLabel, differs: items.filter((i) => DIFFERS_KINDS.includes(i.kind)).length, ledgerTouchedByDiffers: gold.filter((g) => [...g.claimLines].some((l) => differsLines.has(l))).map((g) => g.id), ledgerTotal: gold.length, planted };
}

// ---------- Metrics, defined once ----------
export interface Metric { key: string; define: string; get: (r: RunSummary) => number | null }
const len = (x: string[] | undefined) => (x ? x.length : null);
/** Every number the summary aggregates, with its definition. Ratios are null when their denominator is zero. */
export const METRICS: Metric[] = [
  { key: 'strict_recall', define: 'Ledger entries with a grounded suggestion on one of the entry\'s own claim lines (harness-core matchesStrict), over every ledger entry: the harness figure, comparable with earlier scorecards.', get: (r) => r.ledger?.recallAll ?? null },
  { key: 'strict_recall_reachable', define: 'The same finds over the entries reachable in this packet (one of their claim lines is in it); unreachable entries (no claim line, or every claim line removed, as on the altered packet) are listed, not counted as misses.', get: (r) => r.ledger?.recall ?? null },
  { key: 'strict_found', define: 'Count of those entries.', get: (r) => len(r.ledger?.found) },
  { key: 'strict_recall_shown', define: 'Strict recall after the backend verifier (what a reviewer would see).', get: (r) => r.ledger?.shownRecall ?? null },
  { key: 'strict_precision', define: 'Grounded suggestions on any ledger entry\'s claim line, over all grounded suggestions (harness-core scorePayload). Unmatched ones may still be real: see beyond_*.', get: (r) => r.ledger?.precision ?? null },
  { key: 'tool_surfaced', define: 'Strict finds where a verify or verify_all result (replayed from the trace) covered one of the entry\'s claim lines in a turn before the matching suggestion was accepted (record_suggestion) or, if never recorded, before the final answer: our generic code surfaced it.', get: (r) => len(r.ledger?.toolSurfaced) },
  { key: 'agent_found', define: 'Strict finds with no such earlier verify/verify_all result: found by the agent reading.', get: (r) => len(r.ledger?.agentFound) },
  { key: 'judgement_tier', define: 'Reachable ledger entries no verify_all differs item (full offline sweep, this mode) touches by claim line.', get: (r) => len(r.ledger?.untouchedByDiffers) },
  { key: 'judgement_recall', define: 'Agent-found strict finds in the judgement tier, over the judgement tier (the headline judgement figure).', get: (r) => r.ledger?.judgementRecall ?? null },
  { key: 'loose_only', define: 'Ledger entries matched only loosely (a shared evidence document, not a claim line): found but claimed on the wrong line.', get: (r) => len(r.ledger?.looseOnly) },
  { key: 'beyond_candidates', define: 'Shown suggestions that match no ledger entry: each is for Aarvin to adjudicate.', get: (r) => r.beyond?.candidates ?? null },
  { key: 'beyond_verified', define: 'Of those, verdict verified (or REAL-NEW) in <run>.adjudication.json.', get: (r) => r.beyond?.verified ?? null },
  { key: 'beyond_plausible', define: 'Verdict plausible (or UNSURE).', get: (r) => r.beyond?.plausible ?? null },
  { key: 'beyond_wrong', define: 'Verdict wrong (or NOT-REAL).', get: (r) => r.beyond?.wrong ?? null },
  { key: 'beyond_unadjudicated', define: 'Candidates with no verdict yet.', get: (r) => r.beyond?.unadjudicated ?? null },
  { key: 'differs_items', define: 'verify_all differs items in the full offline sweep of this packet and mode.', get: (r) => r.coverage.differs },
  { key: 'differs_addressed_share', define: 'Share of differs items the agent addressed: get_line on one of the item\'s lines, get_page on a document those lines (or the item\'s ids) cite, or a recorded suggestion claiming one of its lines.', get: (r) => r.coverage.share },
  { key: 'addressed_unrecordable', define: 'Addressed differs items with a line named in an "unrecordable:" marker (an issue with no page to quote).', get: (r) => r.coverage.addressedUnrecordable },
  { key: 'unrecordable_markers', define: '"unrecordable:" lines in the trace (kept whole past the text cut).', get: (r) => r.unrecordable.markers },
  { key: 'verify_before_record', define: 'Share of recorded suggestions (accepted record_suggestion calls; final-answer-only rows at the last turn) with a verify or verify_all result covering one of their claim lines in an earlier turn.', get: (r) => r.discipline.share },
  { key: 'lines_opened', define: 'Distinct return lines the agent opened: line keys given to get_line, or to verify as ids or target (of the latest return\'s lines; the v3 blind trace counted this way gives 62 of 627).', get: (r) => r.opened.lines },
  { key: 'docs_opened', define: 'Distinct documents opened with get_page (of the packet\'s documents).', get: (r) => r.opened.docs },
  { key: 'verify_family_calls', define: 'Calls to verify, verify_all and lookup.', get: (r) => r.verifyFamilyCalls },
  { key: 'get_page_calls', define: 'Calls to get_page.', get: (r) => r.getPageCalls },
  { key: 'turns', define: 'Model turns (run meta; else the trace).', get: (r) => r.turns },
  { key: 'tool_calls', define: 'Tool calls (run meta; else the trace).', get: (r) => r.toolCalls },
  { key: 'seconds', define: 'Wall-clock seconds (run meta).', get: (r) => r.seconds },
  { key: 'cost_usd', define: 'Approximate cost in USD at the served model\'s prices (run meta; else the trace\'s running cost).', get: (r) => r.costUsd },
  { key: 'held_back', define: 'Suggestions the backend verifier holds back.', get: (r) => r.heldBack },
  { key: 'rejected', define: 'Rows rejected while the payload was validated.', get: (r) => r.rejected },
  { key: 'blind_leaks', define: 'Blind modes: replayed tool results carrying a finding title or explanation, a check id, a ledger id or onCheck. Must be 0.', get: (r) => (r.leak ? r.leak.leaks.length : null) },
  { key: 'planted_on_line', define: 'Perturbed: plants with a grounded suggestion on the planted line itself (planted-score onLine).', get: (r) => (r.planted ? Object.values(r.planted.perKind).reduce((n, k) => n + k.onLine, 0) : null) },
  { key: 'planted_precision', define: 'Perturbed: grounded suggestions on a plant\'s claim set, over grounded suggestions less the attributable ones (always printed with planted_attributable).', get: (r) => r.planted?.precision ?? null },
  { key: 'planted_attributable', define: 'Perturbed: suggestions on a plant\'s stale parent that also name that plant\'s source (planted-score, per plant): out of the precision denominator.', get: (r) => r.planted?.attributable ?? null },
];

export interface Stat { median: number; min: number; max: number; n: number }
export function stat(xs: number[]): Stat | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return { median: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2, min: s[0], max: s[s.length - 1], n: s.length };
}
export interface ConditionSummary { condition: string; runs: number; ok: number; truncated: number; failed: number; stats: Record<string, Stat | null> }
/** Per condition: run counts by outcome (truncated and failed apart) and, over ok runs only, each metric's stat. */
export function aggregate(rs: RunSummary[]): ConditionSummary[] {
  const by = new Map<string, RunSummary[]>();
  for (const r of rs) by.set(r.condition, [...(by.get(r.condition) ?? []), r]);
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([condition, list]) => {
    const ok = list.filter((r) => r.outcome === 'ok');
    return {
      condition, runs: list.length, ok: ok.length, truncated: list.filter((r) => r.outcome === 'truncated').length, failed: list.filter((r) => r.outcome === 'failed').length,
      stats: Object.fromEntries(METRICS.map((m) => [m.key, stat(ok.map(m.get).filter((x): x is number => x !== null))])),
    };
  });
}

// ---------- Report ----------
const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2));
const st = (s: Stat | null) => (s ? `${fmt(s.median)} [${fmt(s.min)}-${fmt(s.max)}]` : 'n/a');
const frac = (a: number, b: number) => `${a}/${b}`;

/** The plan's stop rule: halt the batch on any failed run, on two truncated runs, or on any run over this cost. */
export const STOP_RULE_USD = 4;
export function stopRule(runs: RunSummary[]): { halt: boolean; failed: string[]; truncated: string[]; overCost: string[] } {
  const failed = runs.filter((r) => r.outcome === 'failed').map((r) => r.file);
  const truncated = runs.filter((r) => r.outcome === 'truncated').map((r) => r.file);
  const overCost = runs.filter((r) => (r.costUsd ?? 0) > STOP_RULE_USD).map((r) => r.file);
  return { halt: failed.length > 0 || truncated.length >= 2 || overCost.length > 0, failed, truncated, overCost };
}

export function report(runs: RunSummary[], offline: OfflineFigures[] = []): string {
  const L: string[] = ['# Agent measurement runs', ''];
  if (!runs.length) L.push('No runs found.', '');
  const stop = stopRule(runs);
  L.push(`Stop rule (any failed, two truncated, or any run over $${STOP_RULE_USD}): ${stop.halt ? 'HALT' : 'continue'}; failed ${stop.failed.join(', ') || 'none'}; truncated ${stop.truncated.join(', ') || 'none'}; over $${STOP_RULE_USD} ${stop.overCost.join(', ') || 'none'}.`, '');
  for (const c of aggregate(runs)) {
    L.push(`## ${c.condition}: ${c.runs} run(s), ${c.ok} ok, ${c.truncated} truncated, ${c.failed} failed`, '');
    L.push('Median [min-max] over ok runs:', '');
    const s = c.stats;
    L.push(`- headline: strict recall ${st(s.strict_recall)} (over reachable ${st(s.strict_recall_reachable)}), precision ${st(s.strict_precision)}; tool-surfaced ${st(s.tool_surfaced)} vs agent-found ${st(s.agent_found)}; judgement recall ${st(s.judgement_recall)} of ${st(s.judgement_tier)} entries`);
    if (s.planted_precision) L.push(`- planted: on line ${st(s.planted_on_line)}, precision ${st(s.planted_precision)} (attributable ${st(s.planted_attributable)})`);
    for (const m of METRICS) L.push(`- ${m.key}: ${st(s[m.key])}`);
    L.push('');
  }
  L.push('## Runs', '');
  for (const r of runs) {
    const g = r.ledger;
    L.push(`### ${r.file} (${r.outcome}${r.endedBy ? `, ${r.endedBy}` : ''})`);
    if (r.outcome !== 'ok') L.push(`- not scored: ${r.reason ?? 'no payload'}`);
    if (g) {
      L.push(`- strict recall ${frac(g.found.length, g.total)}, over reachable ${frac(g.found.length, g.reachable)}${g.unreachable.length ? ` (unreachable here: ${g.unreachable.join(', ')})` : ''}; as shown ${frac(g.shownFound.length, g.reachable)}; precision ${frac(g.matchedGrounded, g.grounded)}`);
      L.push(`- tool-surfaced ${g.toolSurfaced.join(', ') || 'none'}; agent-found ${g.agentFound.join(', ') || 'none'}`);
      L.push(`- judgement tier (no differs item touches): ${frac(g.judgementFound.length, g.untouchedByDiffers.length)} agent-found (${g.judgementFound.join(', ') || 'none'})`);
      L.push(`- loose-only (claimed on the wrong line): ${g.looseOnly.join(', ') || 'none'}`);
    }
    if (r.beyond) L.push(`- beyond the ledger: ${r.beyond.candidates} shown on no entry; verified ${r.beyond.verified}, plausible ${r.beyond.plausible}, wrong ${r.beyond.wrong}, duplicate ${r.beyond.duplicate}, not adjudicated ${r.beyond.unadjudicated}`);
    if (r.planted) {
      L.push(`- planted: matched ${r.planted.matched} of ${r.planted.considered} considered, precision ${fmt(r.planted.precision)} (attributable ${r.planted.attributable}, false positives ${r.planted.falsePositives})`);
      L.push(`- planted per kind (plants / agent on line / cascade only): ${Object.entries(r.planted.perKind).map(([k, t]) => `${k} ${t.plants}/${t.onLine}/${t.onCascadeOnly}`).join('; ')}`);
    }
    L.push(`- verify_all differs addressed ${frac(r.coverage.addressed, r.coverage.differs)} (unrecordable ${r.coverage.addressedUnrecordable}); unrecordable markers ${r.unrecordable.markers}${r.unrecordable.lines.length ? ` on ${r.unrecordable.lines.join(', ')}` : ''}`);
    L.push(`- verify before record ${frac(r.discipline.covered, r.discipline.recorded)}; opened lines ${frac(r.opened.lines, r.opened.linesTotal)} (get_line ${r.opened.getLine}), documents ${frac(r.opened.docs, r.opened.docsTotal)}`);
    L.push(`- tools: ${Object.entries(r.toolMix).sort().map(([k, n]) => `${k} ${n}`).join(', ') || 'none'} (verify+verify_all+lookup ${r.verifyFamilyCalls}, get_page ${r.getPageCalls}); turns ${r.turns ?? 'n/a'}, seconds ${r.seconds ?? 'n/a'}, cost ${r.costUsd == null ? 'n/a' : `$${r.costUsd.toFixed(2)}`}; held back ${r.heldBack ?? 'n/a'}, rejected ${r.rejected ?? 'n/a'}`);
    if (r.leak) L.push(`- blind leak check: ${r.leak.leaks.length} leak(s) in ${r.leak.checked} replayed results${r.leak.leaks.length ? `: ${r.leak.leaks.map((x) => `turn ${x.turn} ${x.tool}: ${x.what}`).join('; ')}` : ''}`);
    L.push('');
  }
  if (offline.length) {
    L.push('## Offline (deterministic, no run)', '');
    for (const o of offline) {
      L.push(`- ${o.packet} ${o.mode}: verify_all differs items ${o.differs}; ledger entries a differs item touches ${frac(o.ledgerTouchedByDiffers.length, o.ledgerTotal)}`);
      if (o.planted) {
        L.push(`  - planted, checks: matched ${o.planted.checks.matched} of ${o.planted.checks.considered}, precision ${fmt(o.planted.checks.precision)} (attributable ${o.planted.checks.attributable}); sweep: matched ${o.planted.sweep.matched} of ${o.planted.sweep.considered}, precision ${fmt(o.planted.sweep.precision)} (attributable ${o.planted.sweep.attributable})`);
        L.push(`  - per kind (plants / checks on line / sweep on line): ${Object.entries(o.planted.perKind).map(([k, v]) => `${k} ${v.plants}/${v.checks.onLine}/${v.sweep?.onLine ?? 'n/a'}`).join('; ')}`);
      }
    }
    L.push('');
  }
  L.push('## Definitions', '');
  for (const m of METRICS) L.push(`- **${m.key}**: ${m.define}`);
  L.push('- **outcome**: ok (payload written), truncated (a cost, turn or time cap; trace and run meta kept, nothing scored), failed (error, SSN hit, refusal, cut or malformed answer). Stats use ok runs only.');
  return L.join('\n') + '\n';
}
