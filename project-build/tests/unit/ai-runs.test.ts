// Task 6 (CPA toolkit plan): run outputs off the live file, truncated vs failed runs, the unrecordable marker in the
// trace, and the v4 independent case file. No network and no spend: the SDK client gets a scripted fake fetch.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { runChecks } from '@/domain/checks/index';
import {
  AGENT_DEFAULT_MODEL, RUNS_DIR, TRACE_TEXT_MAX, UNRECORDABLE_MAX_CHARS, agentContext, agentOutFile, agentSystem,
  isProtectedEvalFile, loadContextFiles, nextRunNumber, resolveOutFile, runAgent, writeRun, type AgentPrompt, type AgentRunOptions,
} from '../../ai/lib/agent-core';
import { ACTIVE_PAYLOAD_FILE } from '../../ai/lib/producer';
import { caseFile } from '../../ai/lib/case-file';
import { agentRunFiles } from '../../ai/lib/harness-core';
import { agentTools } from '../../ai/lib/agent-tools';
import type { AgentMode } from '../../ai/lib/modes';

const ix = indexPacket(loadPacket());
const files = loadContextFiles(process.cwd());
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const MODES: AgentMode[] = [{ kind: 'default' }, { kind: 'blind' }, { kind: 'blind-v3' }, { kind: 'hide-checks', seed: 7 }];
const PACKETS = ['real', 'altered', 'perturbed'] as const;
const PROMPTS: AgentPrompt[] = ['v3', 'v4'];

let n = 0;
const usage = { input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 5000 };
const message = (content: unknown[], stop: string, u = usage) => ({ id: `m${++n}`, type: 'message', role: 'assistant', model: AGENT_DEFAULT_MODEL, content, stop_reason: stop, stop_details: null, stop_sequence: null, usage: u });
const toolUse = (name: string, input: Record<string, unknown>) => ({ type: 'tool_use', id: `tu${++n}`, name, input });
const final = () => message([{ type: 'text', text: JSON.stringify({ suggestions: [], proposals: [] }) }], 'end_turn');
function fake(script: (turn: number) => Record<string, unknown>) {
  let calls = 0;
  return async () => new Response(JSON.stringify(script(++calls)), { status: 200, headers: { 'content-type': 'application/json' } });
}
const freeLine = ix.latest.lines.find((l) => !runChecks(ix).some((f) => f.claims.includes(`line:${l.key}`)))!.key;
const opts = (fetch: unknown, extra: Partial<AgentRunOptions> = {}): AgentRunOptions => ({
  ix, packetSha: 'abc', model: AGENT_DEFAULT_MODEL, apiKey: 'sk-test', fetchImpl: fetch as never, files, now: () => new Date('2026-10-24T00:00:00Z'), ...extra,
});
const tmpRoot = () => { const r = mkdtempSync(path.join(tmpdir(), 'runs-')); mkdirSync(path.join(r, 'ai', 'eval'), { recursive: true }); return r; };
const LIVE = (root: string) => ['agent-suggestions.json', 'agent-suggestions.run-meta.json', 'agent-suggestions.trace.json'].map((f) => path.join(root, 'ai', 'eval', f));

describe('run outputs: off the live file', () => {
  it('agentOutFile never returns the live payload or any committed agent-suggestions file, for any prompt, mode or packet', () => {
    for (const prompt of PROMPTS) for (const mode of MODES) for (const packet of PACKETS) {
      const f = agentOutFile('/r', mode, packet, 1, prompt, 1);
      expect(f, `${prompt} ${JSON.stringify(mode)} ${packet}`).not.toBe(path.join('/r', ACTIVE_PAYLOAD_FILE));
      expect(path.basename(f)).not.toMatch(/^agent-suggestions/);
      expect(isProtectedEvalFile(f)).toBe(false);
      expect(f.startsWith(path.join('/r', RUNS_DIR) + path.sep)).toBe(true);
    }
  });

  it('a v4 run (and any measurement run) writes ai/eval/runs/<version>/<mode>.<packet>.<n>.json', () => {
    expect(RUNS_DIR).toBe(path.join('ai', 'eval', 'runs'));
    expect(agentOutFile('/r', { kind: 'blind' }, 'real', undefined, 'v4', 1)).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v4', 'blind.real.1.json'));
    expect(agentOutFile('/r', { kind: 'blind' }, 'altered', undefined, 'v4', 2)).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v4', 'blind.altered.2.json'));
    expect(agentOutFile('/r', { kind: 'blind' }, 'perturbed', 1, 'v4', 3)).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v4', 'blind.seed-1.3.json'));
    expect(agentOutFile('/r', { kind: 'blind-v3' }, 'real', undefined, 'v3', 2)).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v3', 'blind-v3.real.2.json'));
    expect(agentOutFile('/r', { kind: 'default' }, 'real', undefined, 'v3', 1)).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v3', 'default.real.1.json'));
    expect(agentOutFile('/r', { kind: 'hide-checks', seed: 7 }, 'real', undefined, 'v4', 1)).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v4', 'hide-7.real.1.json'));
    expect(/perturb|plant/i.test(agentOutFile('/r', { kind: 'blind' }, 'perturbed', 1, 'v4', 1))).toBe(false); // names the seed, never the copy
  });

  it('nextRunNumber counts every run left in the folder, a truncated one (trace only) included', () => {
    const root = tmpRoot();
    const mode: AgentMode = { kind: 'blind' };
    expect(nextRunNumber(root, mode, 'real', undefined, 'v4')).toBe(1);
    const dir = path.join(root, RUNS_DIR, 'agent-v4');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'blind.real.1.json'), '{}');
    writeFileSync(path.join(dir, 'blind.real.2.trace.json'), '{}');
    writeFileSync(path.join(dir, 'blind.altered.7.json'), '{}');
    writeFileSync(path.join(dir, 'default.real.9.json'), '{}');
    expect(nextRunNumber(root, mode, 'real', undefined, 'v4')).toBe(3);
    expect(nextRunNumber(root, mode, 'altered', undefined, 'v4')).toBe(8);
    expect(nextRunNumber(root, mode, 'perturbed', 1, 'v4')).toBe(1);
  });

  it('isProtectedEvalFile: the live payload, its sidecars and every committed ai/eval/agent-suggestions*.json', () => {
    for (const f of LIVE('/r')) expect(isProtectedEvalFile(f), f).toBe(true);
    for (const f of ['agent-suggestions.blind.json', 'agent-suggestions.blind.trace.json', 'agent-suggestions.v4.json']) expect(isProtectedEvalFile(path.join('/r', 'ai', 'eval', f)), f).toBe(true);
    expect(isProtectedEvalFile(path.join('/r', 'ai', 'eval', 'runs', 'agent-v4', 'blind.real.1.json'))).toBe(false);
    expect(isProtectedEvalFile(path.join('/tmp', 'x', 'agent-suggestions.json'))).toBe(false); // not under ai/eval
  });

  // Fix round 1 (Fable): macOS volumes are case-insensitive, so a differently cased path names the same file.
  const CASED = ['AI/EVAL/agent-suggestions.json', 'ai/eval/Agent-Suggestions.json', 'ai/Eval/agent-suggestions.json', 'ai/eval/AGENT-SUGGESTIONS.TRACE.JSON'];
  it('case variants of a protected path are protected too (isProtectedEvalFile, resolveOutFile, writeRun)', async () => {
    for (const f of CASED) expect(isProtectedEvalFile(path.join('/r', f)), f).toBe(true);
    const base = { root: '/r', mode: { kind: 'default' } as AgentMode, packet: 'real' as const, seed: undefined, prompt: 'v3' as AgentPrompt, live: false };
    for (const out of CASED.slice(0, 3)) for (const prompt of PROMPTS) expect(() => resolveOutFile({ ...base, prompt, out }), `${prompt} ${out}`).toThrow(/protected|--live/);
    const res = await runAgent(opts(fake(() => final())));
    const root = tmpRoot();
    for (const f of CASED.slice(0, 3)) expect(() => writeRun(res, path.join(root, f)), f).toThrow(/protected/);
    expect(readdirSync(path.join(root, 'ai', 'eval'))).toEqual([]);
  });

  it('a symlinked folder that resolves to ai/eval is protected (the real parent is checked)', async () => {
    const { symlinkSync } = await import('node:fs');
    const root = tmpRoot();
    const link = path.join(root, 'alias');
    symlinkSync(path.join(root, 'ai', 'eval'), link);
    expect(isProtectedEvalFile(path.join(link, 'agent-suggestions.json'))).toBe(true);
    const res = await runAgent(opts(fake(() => final())));
    expect(() => writeRun(res, path.join(link, 'agent-suggestions.json'))).toThrow(/protected/);
    expect(readdirSync(path.join(root, 'ai', 'eval'))).toEqual([]);
  });

  it('a symlinked FILE pointing at the live payload (or a sidecar, or a dangling link to one) is protected (final review)', async () => {
    const { symlinkSync } = await import('node:fs');
    const root = tmpRoot();
    const [live, liveMeta, liveTrace] = LIVE(root);
    writeFileSync(live, '{"sentinel":true}');
    mkdirSync(path.join(root, 'elsewhere'));
    const link = path.join(root, 'elsewhere', 'out.json');
    symlinkSync(live, link);
    const dangling = path.join(root, 'elsewhere', 'trace-link.json');
    symlinkSync(liveTrace, dangling); // the sidecar does not exist yet: writing through it would create it
    const chained = path.join(root, 'elsewhere', 'chain.json');
    symlinkSync(link, chained);
    for (const f of [link, dangling, chained]) expect(isProtectedEvalFile(f), f).toBe(true);
    const res = await runAgent(opts(fake(() => final())));
    for (const f of [link, dangling, chained]) expect(() => writeRun(res, f), f).toThrow(/protected/);
    expect(readFileSync(live, 'utf8')).toBe('{"sentinel":true}');
    expect(existsSync(liveTrace)).toBe(false);
    expect(existsSync(liveMeta)).toBe(false);
    // A symlink to an ordinary run file is not protected.
    const runFile = path.join(root, 'ai', 'eval', 'runs', 'r.json');
    mkdirSync(path.dirname(runFile), { recursive: true }); writeFileSync(runFile, '{}');
    const ok = path.join(root, 'elsewhere', 'ok.json'); symlinkSync(runFile, ok);
    expect(isProtectedEvalFile(ok)).toBe(false);
  });

  it('resolveOutFile: without --live no path (given or default) reaches a protected file; --out at one is refused', () => {
    const root = '/r';
    const base = { root, mode: { kind: 'default' } as AgentMode, packet: 'real' as const, seed: undefined, prompt: 'v3' as AgentPrompt, live: false };
    expect(resolveOutFile(base)).toBe(path.join(root, RUNS_DIR, 'agent-v3', 'default.real.1.json'));
    for (const out of ['ai/eval/agent-suggestions.json', 'ai/eval/agent-suggestions.trace.json', 'ai/eval/agent-suggestions.run-meta.json', './ai/eval/../eval/agent-suggestions.json', path.join(root, 'ai', 'eval', 'agent-suggestions.json'), 'ai/eval/agent-suggestions.blind.json']) {
      for (const prompt of PROMPTS) expect(() => resolveOutFile({ ...base, prompt, out }), `${prompt} ${out}`).toThrow(/protected|--live/);
    }
    expect(() => resolveOutFile({ ...base, out: 'ai/eval/runs/x' })).toThrow(/\.json/);
    expect(resolveOutFile({ ...base, out: 'ai/eval/runs/agent-v3/mine.json' })).toBe(path.join(root, 'ai', 'eval', 'runs', 'agent-v3', 'mine.json'));
  });

  it('resolveOutFile --live: only the active producer (agent-v3, default mode, real packet, no --out) may target the live payload', () => {
    const base = { root: '/r', mode: { kind: 'default' } as AgentMode, packet: 'real' as const, seed: undefined, prompt: 'v3' as AgentPrompt, live: true };
    expect(resolveOutFile(base)).toBe(path.join('/r', ACTIVE_PAYLOAD_FILE));
    expect(() => resolveOutFile({ ...base, prompt: 'v4' })).toThrow(/--live/);
    for (const mode of MODES.slice(1)) expect(() => resolveOutFile({ ...base, mode })).toThrow(/--live/);
    expect(() => resolveOutFile({ ...base, packet: 'altered' })).toThrow(/--live/);
    expect(() => resolveOutFile({ ...base, packet: 'perturbed', seed: 1 })).toThrow(/--live/);
    expect(() => resolveOutFile({ ...base, out: 'x.json' })).toThrow(/--live/);
  });

  it('writeRun refuses a protected file unless told it is the live payload (defence in depth, no CLI needed)', async () => {
    const res = await runAgent(opts(fake(() => final())));
    expect(res.ok).toBe(true);
    const root = tmpRoot();
    const [live] = LIVE(root);
    expect(() => writeRun(res, live)).toThrow(/protected/);
    expect(() => writeRun(res, path.join(root, 'ai', 'eval', 'agent-suggestions.blind.json'))).toThrow(/protected/);
    expect(() => writeRun(res, path.join(root, 'ai', 'eval', 'agent-suggestions.trace.json'))).toThrow(/protected/);
    expect(readdirSync(path.join(root, 'ai', 'eval'))).toEqual([]); // nothing written, not even the trace
    expect(() => writeRun(res, path.join(root, 'ai', 'eval', 'agent-suggestions.blind.json'), { live: true })).toThrow(/protected/); // live names one file only
    expect(writeRun(res, live, { live: true })).toBe(true);
    for (const f of LIVE(root)) expect(existsSync(f), f).toBe(true);
    // A run file goes under runs/, its folder made on demand.
    const out = agentOutFile(root, { kind: 'blind' }, 'real', undefined, 'v4', 1);
    expect(writeRun(res, out)).toBe(true);
    expect(readdirSync(path.dirname(out)).sort()).toEqual(['blind.real.1.json', 'blind.real.1.run-meta.json', 'blind.real.1.trace.json']);
  });

  it('the CLI resolves its output through resolveOutFile, passes --live on to writeRun, and names the flag in its usage', () => {
    const src = readFileSync('ai/agent.ts', 'utf8');
    expect(src).toMatch(/resolveOutFile\(/);
    expect(src).toMatch(/--live/);
    expect(src).toMatch(/writeRun\(res, out, \{ live \}\)/);
    expect(src).not.toMatch(/agentOutFile\(/); // the old direct path is gone
  });
});

describe('truncated is not failed: a capped run keeps its evidence', () => {
  it('over the cost budget: truncated; the trace and run meta (marked truncated) are written, no payload', async () => {
    const big = { input_tokens: 2_000_000, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    const res = await runAgent(opts(fake(() => message([toolUse('get_line', { key: freeLine })], 'tool_use', big)), { limits: { maxCostUsd: 1 } }));
    expect(res.ok).toBe(false);
    expect(!res.ok && res.outcome).toBe('truncated');
    expect(res.meta.outcome).toBe('truncated');
    expect(res.trace.outcome).toBe('truncated');
    const root = tmpRoot();
    const out = agentOutFile(root, { kind: 'blind' }, 'real', undefined, 'v4', 1);
    expect(writeRun(res, out)).toBe(false);
    expect(readdirSync(path.dirname(out)).sort()).toEqual(['blind.real.1.run-meta.json', 'blind.real.1.trace.json']);
    const meta = JSON.parse(readFileSync(out.replace(/\.json$/, '.run-meta.json'), 'utf8'));
    expect(meta).toMatchObject({ outcome: 'truncated', payload: null });
    expect(meta.costUsd).toBeGreaterThan(1);
    expect(JSON.parse(readFileSync(out.replace(/\.json$/, '.trace.json'), 'utf8')).outcome).toBe('truncated');
  });

  it('the turn cap with no answer: truncated', async () => {
    // A turn cap of 1 leaves no reserved final turn, so the run ends at the cap with tool calls pending.
    const res = await runAgent(opts(fake(() => message([toolUse('get_line', { key: freeLine })], 'tool_use')), { limits: { maxIterations: 1 } }));
    expect(res.ok).toBe(false);
    expect(res.trace.endedBy).toBe('iteration_cap');
    expect(res.meta.outcome).toBe('truncated');
  });

  it('a cut or malformed answer is failed: the trace only (as before), marked failed', async () => {
    const cut = await runAgent(opts(fake(() => message([{ type: 'text', text: 'x' }], 'max_tokens'))));
    expect(cut.ok).toBe(false);
    expect(cut.meta.outcome).toBe('failed');
    expect(cut.trace.outcome).toBe('failed');
    const bad = await runAgent(opts(fake(() => message([{ type: 'text', text: 'not json' }], 'end_turn'))));
    expect(bad.ok).toBe(false);
    expect(bad.trace.outcome).toBe('failed');
    const root = tmpRoot();
    const out = agentOutFile(root, { kind: 'blind' }, 'real', undefined, 'v4', 1);
    expect(writeRun(cut, out)).toBe(false);
    expect(readdirSync(path.dirname(out))).toEqual(['blind.real.1.trace.json']);
  });

  it('a finished run is ok, in its meta and trace', async () => {
    const res = await runAgent(opts(fake(() => final())));
    expect(res.ok).toBe(true);
    expect(res.meta.outcome).toBe('ok');
    expect(res.trace.outcome).toBe('ok');
  });

  it('the CLI exits apart for a truncated run (3) and a failed one (1)', () => {
    const src = readFileSync('ai/agent.ts', 'utf8');
    expect(src).toMatch(/outcome === 'truncated'[^\n]*process\.exit\(3\)|process\.exit\(res\.outcome === 'truncated' \? 3 : 1\)/);
  });
});

describe('trace: the unrecordable marker survives the text cut', () => {
  it('keeps each "unrecordable:" line whole (bounded) though the turn text is cut at TRACE_TEXT_MAX', async () => {
    const long = 'Looking at the open items. '.repeat(20);
    const marker = `unrecordable: ${freeLine}, ${ix.latest.lines[1].key}, the lines disagree but no document page carries either amount to quote`;
    const huge = `unrecordable: ${'x'.repeat(UNRECORDABLE_MAX_CHARS + 200)}`;
    const text = `${long}\n${marker}\nmore words\n  Unrecordable: ${freeLine} also nothing to quote\n${huge}`;
    const res = await runAgent(opts(fake((t) => (t === 1 ? message([{ type: 'text', text }, toolUse('get_line', { key: freeLine })], 'tool_use') : final()))));
    expect(res.ok).toBe(true);
    const turn = res.trace.turns[0];
    expect(turn.text!.length).toBeLessThanOrEqual(TRACE_TEXT_MAX);
    expect(turn.text).not.toContain('unrecordable:'); // past the cut: only the marker field keeps it
    expect(turn.unrecordable).toHaveLength(3);
    expect(turn.unrecordable![0]).toBe(marker);
    expect(turn.unrecordable![1]).toBe(`Unrecordable: ${freeLine} also nothing to quote`);
    expect(turn.unrecordable![2].length).toBe(UNRECORDABLE_MAX_CHARS);
    expect(res.trace.turns[1].unrecordable).toBeUndefined(); // only when present
  });

  it('a turn with many markers keeps a bounded number', async () => {
    const text = Array.from({ length: 40 }, (_, i) => `unrecordable: line ${i}, nothing to quote`).join('\n');
    const res = await runAgent(opts(fake((t) => (t === 1 ? message([{ type: 'text', text }, toolUse('get_line', { key: freeLine })], 'tool_use') : final()))));
    expect(res.trace.turns[0].unrecordable!.length).toBe(20);
  });
});

describe('independence: the v4 independent case file does not define F', () => {
  // sha256 of agentContext(mode) taken at db9eaf8, before this task: v3, blind-v3 and default stay byte-identical.
  const PINNED = {
    default: 'e2a512236a9794985322ff5f4213e2b9c7d1259b74ab6aa41eee74855ff4e1c2',
    blind: 'c2ef8166894b25dfd7e4cf41accf1db8c629f863cfce69252f9779086e117904',
    hide7: '835d500dd3055454096a05d21fbacc6f3142fdebc360c0cd71fa87ac9cf8322a',
  };
  it('v3 contexts are pinned: default, blind, blind-v3 and hide-checks; v4 default and hide-checks equal v3', () => {
    expect(sha(agentContext(ix, files))).toBe(PINNED.default);
    expect(sha(agentContext(ix, files, { kind: 'default' }, 'v3'))).toBe(PINNED.default);
    expect(sha(agentContext(ix, files, { kind: 'blind' }, 'v3'))).toBe(PINNED.blind);
    expect(sha(agentContext(ix, files, { kind: 'blind-v3' }, 'v3'))).toBe(PINNED.blind);
    expect(sha(agentContext(ix, files, { kind: 'hide-checks', seed: 7 }, 'v3'))).toBe(PINNED.hide7);
    expect(sha(agentContext(ix, files, { kind: 'default' }, 'v4'))).toBe(PINNED.default);
    expect(sha(agentContext(ix, files, { kind: 'hide-checks', seed: 7 }, 'v4'))).toBe(PINNED.hide7);
    expect(caseFile(ix, files.digest, { kind: 'blind' })).toBe(agentContext(ix, files, { kind: 'blind' }, 'v3'));
  });

  it('v4 + blind: the state map legend has no F, and nothing says a check exists', () => {
    for (const mode of [{ kind: 'blind' }, { kind: 'blind-v3' }] as AgentMode[]) {
      const t = agentContext(ix, files, mode, 'v4');
      const legend = t.split('\n## ').find((s) => s.startsWith('State map'))!.split('\n').slice(0, 4).join('\n');
      expect(legend).toMatch(/P proved by our code/);
      expect(legend).not.toMatch(/\bF\b/);
      expect(t).not.toMatch(/deterministic check/i);
      expect(t).not.toMatch(/no check covers/i);
      expect(t).not.toMatch(/\| F$/m);
      // Only the wording changed: the same lines, statuses and items as the v3 blind case file otherwise.
      const v3 = agentContext(ix, files, mode, 'v3').split('\n');
      const v4 = t.split('\n');
      expect(v4.length).toBe(v3.length);
      expect(v4.filter((l, i) => l !== v3[i]).length).toBeLessThanOrEqual(3);
    }
  });

  it('runAgent sends the v4 independent case file for prompt v4 + blind, and the v3 one otherwise', async () => {
    const bodies: { system: { text: string }[] }[] = [];
    const fetch = async (_u: unknown, init?: RequestInit) => { bodies.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify(final()), { status: 200, headers: { 'content-type': 'application/json' } }); };
    await runAgent(opts(fetch, { mode: { kind: 'blind' }, prompt: 'v4' }));
    expect(bodies[0].system.at(-1)!.text).toBe(agentContext(ix, files, { kind: 'blind' }, 'v4'));
    expect(agentSystem(ix, files, { kind: 'blind' }, 'v4').at(-1)!.text).toBe(agentContext(ix, files, { kind: 'blind' }, 'v4'));
    await runAgent(opts(fetch, { mode: { kind: 'blind' } }));
    expect(sha(bodies[1].system.at(-1)!.text)).toBe(PINNED.blind);
  });
});

describe('independence: v4 independent tool descriptions say nothing of our checks (fix round 1)', () => {
  const guard = { onHit() {} };
  const defs = (mode: AgentMode, independent?: boolean) => (agentTools(ix, guard, { mode, independent }) as unknown as { name: string; description: string; input_schema?: unknown; strict?: unknown }[]).map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema, strict: t.strict }));
  // sha256 of the tool definitions per mode at 0d0f6a9 (before this fix): v3 bytes stay identical.
  const PINNED = { checks: '38edd39ee1f5273e43335e2a8b97e871f09f692247473a741a34262384cc00e4', blind: '44d8f23fc3bd8a404d20d0f076216bf465d5b881af23b53369a6cac1ec9bd5c7' };
  it('v3 tool definitions are pinned in every mode, and independent applies only with a blind mode', () => {
    expect(sha(JSON.stringify(defs({ kind: 'default' })))).toBe(PINNED.checks);
    expect(sha(JSON.stringify(defs({ kind: 'hide-checks', seed: 7 })))).toBe(PINNED.checks);
    expect(sha(JSON.stringify(defs({ kind: 'blind' })))).toBe(PINNED.blind);
    expect(sha(JSON.stringify(defs({ kind: 'blind-v3' })))).toBe(PINNED.blind);
    expect(sha(JSON.stringify(defs({ kind: 'default' }, true)))).toBe(PINNED.checks); // no findings to hide: unchanged
  });

  it('independent: list_open_leftovers is the only description that changes, and it names no finding or check', () => {
    const v3 = defs({ kind: 'blind' }); const v4 = defs({ kind: 'blind' }, true);
    const changed = v4.filter((d, i) => JSON.stringify(d) !== JSON.stringify(v3[i]));
    expect(changed.map((d) => d.name)).toEqual(['list_open_leftovers']);
    // "choose the check" in verify means a calculator method, not our checks; nothing says a check raised or names anything.
    for (const d of v4) expect(d.description, d.name).not.toMatch(/finding|no check|check names|checks raise/i);
  });

  it('runAgent sends the independent tool descriptions for prompt v4 + blind only', async () => {
    const bodies: { tools: { name: string; description: string }[] }[] = [];
    const fetch = async (_u: unknown, init?: RequestInit) => { bodies.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify(final()), { status: 200, headers: { 'content-type': 'application/json' } }); };
    await runAgent(opts(fetch, { mode: { kind: 'blind' }, prompt: 'v4' }));
    await runAgent(opts(fetch, { mode: { kind: 'blind' } }));
    await runAgent(opts(fetch, { mode: { kind: 'default' }, prompt: 'v4' }));
    const leftovers = (b: (typeof bodies)[number]) => b.tools.find((t) => t.name === 'list_open_leftovers')!.description;
    expect(leftovers(bodies[0])).not.toMatch(/finding|check/i);
    expect(leftovers(bodies[1])).toMatch(/no finding/);
    expect(leftovers(bodies[2])).toMatch(/no finding/);
  });
});

describe('harness: reads blind-v3 and runs/ outputs', () => {
  it('agentRunFiles lists the committed agent payloads (blind-v3 included) and every runs/<version>/ payload, real and altered apart; never sidecars or perturbed runs', () => {
    const root = tmpRoot();
    const ev = path.join(root, 'ai', 'eval');
    for (const f of ['agent-suggestions.json', 'agent-suggestions.run-meta.json', 'agent-suggestions.trace.json', 'agent-suggestions.blind.json', 'agent-suggestions.blind-v3.json', 'agent-suggestions.hide-7.json', 'agent-suggestions.altered.json', 'ai-suggestions.json']) writeFileSync(path.join(ev, f), '{}');
    mkdirSync(path.join(ev, 'runs', 'agent-v4'), { recursive: true });
    mkdirSync(path.join(ev, 'runs', 'agent-v3'), { recursive: true });
    for (const f of ['blind.real.1.json', 'blind.real.1.run-meta.json', 'blind.real.1.trace.json', 'blind.real.2.trace.json', 'blind.altered.1.json', 'blind.seed-1.1.json']) writeFileSync(path.join(ev, 'runs', 'agent-v4', f), '{}');
    writeFileSync(path.join(ev, 'runs', 'agent-v3', 'blind-v3.real.2.json'), '{}');
    const got = agentRunFiles(ev);
    expect(got.real).toEqual(['agent-suggestions.json', 'agent-suggestions.blind-v3.json', 'agent-suggestions.blind.json', 'agent-suggestions.hide-7.json', path.join('runs', 'agent-v3', 'blind-v3.real.2.json'), path.join('runs', 'agent-v4', 'blind.real.1.json')]);
    expect(got.altered).toEqual(['agent-suggestions.altered.json', path.join('runs', 'agent-v4', 'blind.altered.1.json')]);
  });

  it('the harness CLI uses agentRunFiles and scores blind-v3 on every ledger entry, like blind', () => {
    const src = readFileSync('ai/harness.ts', 'utf8');
    expect(src).toMatch(/agentRunFiles\(/);
    expect(src).toMatch(/mode === 'blind' \|\| mode === 'blind-v3'/);
  });
});
