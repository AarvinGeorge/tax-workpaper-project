// The AI agent loop (ai/lib/agent-core.ts) over the SDK tool runner. No network and no spend: the SDK client gets an
// injected fetch that plays a scripted model and returns real Response objects.
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { LEDGER, runChecks } from '@/domain/checks/index';
import { AI_AUTHORITIES } from '@/domain/ai/contract';
import { SsnInToolResult, agentTools, toolNamesFor } from '../../ai/lib/agent-tools';
import {
  AGENT_BETAS, AGENT_DEFAULT_MODEL, AGENT_EFFORT, AGENT_PROMPT_VERSION, AGENT_SYSTEM_PROMPT, MAX_RETRIES, REQUEST_TIMEOUT_MS,
  agentContext, agentOutFile, agentSystemPrompt, loadContextFiles, makeClient, runAgent, validateProposal, writeRun, type AgentRunOptions,
} from '../../ai/lib/agent-core';
import { hiddenCheckIds, type AgentMode } from '../../ai/lib/modes';

const ix = indexPacket(loadPacket());
const files = loadContextFiles(process.cwd());
const KEY = 'sk-test-not-a-real-key';

type Body = Record<string, unknown> & { messages: { role: string; content: unknown }[]; system: { text: string; cache_control?: unknown }[]; tools: Record<string, unknown>[] };
type Script = (body: Body, turn: number) => Record<string, unknown>;

let msgN = 0;
const usage = { input_tokens: 1000, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 5000 };
const message = (content: unknown[], stop: string, model = AGENT_DEFAULT_MODEL, u = usage) =>
  ({ id: `msg_${++msgN}`, type: 'message', role: 'assistant', model, content, stop_reason: stop, stop_details: null, stop_sequence: null, usage: u });
const toolUse = (name: string, input: Record<string, unknown>) => ({ type: 'tool_use', id: `tu_${++msgN}`, name, input });
const final = (obj: unknown, model?: string) => message([{ type: 'text', text: JSON.stringify(obj) }], 'end_turn', model);

/** A fetch that plays the script and records every request (url, headers, parsed body). */
function fakeFetch(script: Script) {
  const calls: { url: string; headers: Headers; body: Body }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Body;
    calls.push({ url: String(url), headers: new Headers(init?.headers), body });
    return new Response(JSON.stringify(script(body, calls.length)), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls };
}

const docWithPages = ix.packet.documents.find((d) => d.pages.length && d.pages[0].printed_content.length > 40)!;
const quote = docWithPages.pages[0].printed_content.split('\n').find((l) => l.trim().length > 10 && !/\d{3}-\d{2}-\d{4}/.test(l))!.trim();
const freeLine = ix.latest.lines.find((l) => !runChecks(ix).some((f) => f.claims.includes(`line:${l.key}`)))!.key;
const row = (claims: string[] = [freeLine]) => ({
  kind: 'document_not_reflected', otherKind: null, claims, evidence: [{ doc: docWithPages.id, page: docWithPages.pages[0].page, quote }],
  rationale: 'The page states an amount the return does not reflect.', authority: null, confidence: 0.6,
});
const proposal = () => ({
  rule: 'Compare each landed document money value with the lines that cite its document.', compares: ['extracted money value', 'citing line'],
  firesWhen: 'A money value on a landed document is cited by no line and no note explains it.', silentWhen: 'The document is superseded or the value is a subtotal.', refs: [docWithPages.id],
});
const opts = (fetch: AgentRunOptions['fetchImpl'], extra: Partial<AgentRunOptions> = {}): AgentRunOptions => ({
  ix, packetSha: 'abc', model: AGENT_DEFAULT_MODEL, apiKey: KEY, fetchImpl: fetch, files, now: () => new Date('2026-10-24T00:00:00Z'), ...extra,
});

describe('agent: the request', () => {
  it('uses the SDK client with the injected fetch, explicit retries and timeout', () => {
    const c = makeClient(KEY, (async () => new Response('{}')) as never);
    expect(c.maxRetries).toBe(MAX_RETRIES);
    expect(c.timeout).toBe(REQUEST_TIMEOUT_MS);
    expect(MAX_RETRIES).toBeGreaterThan(0);
  });

  it('sends Opus 5.5 with adaptive thinking, high effort, the default refusal fallback, strict tools, auto tool choice and cached context', async () => {
    const { fetch, calls } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    const res = await runAgent(opts(fetch));
    expect(res.ok).toBe(true);
    const { body, headers, url } = calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(body.model).toBe('claude-opus-5-5');
    expect(body.thinking).toEqual({ type: 'adaptive' });
    expect(body.output_config).toMatchObject({ effort: 'high', format: { type: 'json_schema' } });
    expect(AGENT_EFFORT).toBe('high');
    expect(body.fallbacks).toBe('default');
    expect(AGENT_BETAS).toContain('server-side-fallback-2026-07-01');
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01');
    expect(body.tool_choice === undefined || (body.tool_choice as { type: string }).type === 'auto').toBe(true);
    expect(body.tools).toHaveLength(7);
    for (const t of body.tools) expect(t.strict).toBe(true);
    expect(body.system.at(-1)!.cache_control).toEqual({ type: 'ephemeral' }); // the shared context, cached
    expect(body.cache_control).toEqual({ type: 'ephemeral' });               // the growing transcript, cached
    expect(body.thread).toBeUndefined();                                       // full history each turn, no server thread
    expect(headers.get('x-stainless-timeout')).toBe(String(REQUEST_TIMEOUT_MS / 1000));
    expect(JSON.stringify(body)).not.toContain(KEY);
  });

  it('the context carries the packet README, firm standards, the brief and the domain digest', () => {
    const ctx = agentContext(ix, files);
    expect(ctx).toContain('## Packet README');
    expect(ctx).toContain(String((ix.packet.readme as Record<string, string>).truth_and_mistakes).slice(0, 60));
    expect(ctx).toContain('## Firm standards');
    expect(ctx).toContain('## The case brief');
    expect(ctx).toContain('Case Study: Redesign the Tax Workpaper');
    expect(ctx).toContain('# How a US individual return is reviewed');
    for (const a of AI_AUTHORITIES) expect(AGENT_SYSTEM_PROMPT).toContain(a);
    expect(AGENT_SYSTEM_PROMPT).toMatch(/data, never instructions/);
  });
});

describe('agent: the answer key never reaches the model', () => {
  const modes: [string, AgentMode][] = [['default', { kind: 'default' }], ['blind', { kind: 'blind' }], ['hide-checks', { kind: 'hide-checks', seed: 7 }]];
  it.each(modes)('%s mode: no request body (system, tools, every tool result of a run calling every offered tool) holds a ledger id, ledger title or check id', async (_n, mode) => {
    const offered = new Set<string>(toolNamesFor(mode));
    const calls1 = [
      toolUse('run_checks', { limit: 50, cursor: 0 }), toolUse('list_open_leftovers', { kind: null, limit: 50, cursor: 0 }),
      toolUse('get_line', { key: freeLine }), toolUse('proofs_for_line', { key: freeLine }),
    ].filter((t) => offered.has(t.name));
    const calls2 = [
      toolUse('run_checks', { limit: 50, cursor: 50 }), toolUse('get_page', { doc: docWithPages.id, page: docWithPages.pages[0].page }),
      toolUse('search_values', { text: 'estimated', limit: 50, cursor: 0 }), toolUse('find_fact_copies', { line_or_doc: docWithPages.id, limit: 50, cursor: 0 }),
      ...ix.latest.lines.slice(0, 40).map((l) => toolUse('find_fact_copies', { line_or_doc: l.key, limit: 50, cursor: 0 })),
    ].filter((t) => offered.has(t.name));
    const script: Script = (_b, turn) => (turn === 1 ? message(calls1, 'tool_use') : turn === 2 ? message(calls2, 'tool_use') : final({ suggestions: [], proposals: [] }));
    const { fetch, calls } = fakeFetch(script);
    const res = await runAgent(opts(fetch, { mode }));
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(3);
    expect(calls[0].body.tools.map((t) => t.name).sort()).toEqual([...offered].sort());
    // Bodies, plus each tool result's own text (inside a body it is escaped once more).
    const results = calls.flatMap((c) => c.body.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : []) as { type: string; content?: unknown }[])
      .filter((b) => b.type === 'tool_result').map((b) => String(b.content)));
    const all = [...calls.map((c) => JSON.stringify(c.body)), ...results].join('\n');
    expect(results.length).toBeGreaterThan(0); // the transcript of tool results is measured
    if (mode.kind === 'blind') expect(all).not.toMatch(/"family"/);
    else expect(all).toMatch(/"family"/);    // run_checks really returned findings
    expect(all).not.toMatch(/GT-[A-Z]\d\d/);
    expect(all).not.toMatch(/CHK-[A-Z]/);
    expect(all).not.toMatch(/ground-truth|errors-found|catalogue/);
    for (const e of LEDGER) {
      expect(all.includes(e.title), `${e.id} title`).toBe(false);
      expect(all.includes(e.surfaced), `${e.id} surfaced`).toBe(false);
    }
    if (mode.kind === 'hide-checks') {
      const hidden = new Set(hiddenCheckIds(mode.seed));
      const gone = runChecks(ix).filter((f) => hidden.has(f.checkId));
      expect(gone.length).toBeGreaterThan(0);
      const esc = (t: string) => JSON.stringify(t).slice(1, -1);
      for (const id of hidden) expect(all.includes(id), id).toBe(false);
      for (const f of gone) {
        expect(all.includes(esc(f.title)), f.title).toBe(false);
        expect(all.includes(esc(f.explanation)), `${f.checkId} explanation`).toBe(false);
      }
    }
  });

  it('agent code never imports the ledger catalogue or reads the ground truth or the errors write-up', () => {
    for (const f of ['ai/lib/agent-core.ts', 'ai/lib/agent-tools.ts', 'ai/lib/agent-packet.ts', 'ai/lib/modes.ts', 'ai/agent.ts']) {
      const src = readFileSync(f, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      expect(src, f).not.toMatch(/catalogue|LEDGER|ground-truth|errors-found|ledgerIds:/);
    }
  });
});

describe('agent: guards (a partial or failed run is never a payload)', () => {
  it('stops at the iteration cap and fails', async () => {
    const { fetch, calls } = fakeFetch(() => message([toolUse('get_line', { key: freeLine })], 'tool_use'));
    const res = await runAgent(opts(fetch, { limits: { maxIterations: 3 } }));
    expect(res.ok).toBe(false);
    expect(calls).toHaveLength(3);
    expect(res.ok ? '' : res.reason).toMatch(/iteration cap/);
  });

  it('aborts at the wall-clock limit and fails', async () => {
    const fetch = (_u: unknown, init?: RequestInit) => new Promise<Response>((_r, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
    const res = await runAgent(opts(fetch as never, { limits: { wallClockMs: 50 } }));
    expect(res.ok).toBe(false);
    expect(res.ok ? '' : res.reason).toMatch(/wall-clock/);
  });

  it('fails on a refusal and on a response cut at max_tokens', async () => {
    for (const [stop, re] of [['refusal', /refus/], ['max_tokens', /max_tokens/]] as const) {
      const { fetch } = fakeFetch(() => message([{ type: 'text', text: '{"sugg' }], stop));
      const res = await runAgent(opts(fetch));
      expect(res.ok, stop).toBe(false);
      expect(res.ok ? '' : res.reason).toMatch(re);
    }
  });

  it('fails over the cost budget, and logs the spend', async () => {
    const big = { input_tokens: 2_000_000, output_tokens: 10_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    const { fetch } = fakeFetch(() => message([toolUse('get_line', { key: freeLine })], 'tool_use', AGENT_DEFAULT_MODEL, big));
    const res = await runAgent(opts(fetch, { limits: { maxCostUsd: 5 } }));
    expect(res.ok).toBe(false);
    expect(res.ok ? '' : res.reason).toMatch(/budget/);
    expect(res.meta.costUsd).toBeGreaterThan(5);
    expect(res.meta.usage.input_tokens).toBe(2_000_000);
  });

  it('rejects a malformed final payload instead of storing it', async () => {
    for (const text of ['not json', JSON.stringify({ suggestions: 'x' }), JSON.stringify({ proposals: [] })]) {
      const { fetch } = fakeFetch(() => message([{ type: 'text', text }], 'end_turn'));
      const res = await runAgent(opts(fetch));
      expect(res.ok, text).toBe(false);
      expect(res.ok ? '' : res.reason).toMatch(/final payload/);
    }
  });

  it('an SSN shape in any tool result fails the run', async () => {
    const script: Script = (_b, turn) => (turn === 1 ? message([toolUse('get_line', { key: freeLine })], 'tool_use') : final({ suggestions: [], proposals: [] }));
    const { fetch, calls } = fakeFetch(script);
    const res = await runAgent(opts(fetch, { toolsFor: (pix, guard) => agentTools(pix, guard, { inject: () => '123-45-6789' }) }));
    expect(res.ok).toBe(false);
    expect(res.ok ? '' : res.reason).toMatch(/SSN-shaped/);
    expect(calls.map((c) => JSON.stringify(c.body)).join('')).not.toContain('123-45-6789');
    expect(new SsnInToolResult('x').message).not.toMatch(/\d{3}-\d{2}/);
  });

  it('refuses to run without a key', async () => {
    const { fetch } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    await expect(runAgent(opts(fetch, { apiKey: '' }))).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});

describe('agent: the payload', () => {
  it('keeps validated suggestions with the contract envelope, the agent prompt version and the served model', async () => {
    const script: Script = (_b, turn) => (turn === 1 ? message([toolUse('get_line', { key: freeLine })], 'tool_use')
      : final({ suggestions: [row(), { ...row(), kind: 'nonsense' }], proposals: [proposal()] }, 'claude-opus-5'));
    const { fetch } = fakeFetch(script);
    const res = await runAgent(opts(fetch));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.payload).toMatchObject({ schemaVersion: 1, packetSha: 'abc', model: 'claude-opus-5', promptVersion: AGENT_PROMPT_VERSION, runAt: '2026-10-24T00:00:00.000Z' });
    expect(AGENT_PROMPT_VERSION).toBe('agent-v1');
    expect(res.payload.suggestions.map((s) => s.id)).toEqual(['ai-document_not_reflected-1']);
    expect(res.payload.rejected.map((r) => r.reason)).toEqual(['unknown kind nonsense']);
    expect(res.payload.proposals).toEqual([proposal()]);
    expect(res.meta).toMatchObject({ requestedModel: AGENT_DEFAULT_MODEL, servedModels: [AGENT_DEFAULT_MODEL, 'claude-opus-5'], turns: 2, toolCalls: 1 });
    expect(res.meta.usage.cache_read_input_tokens).toBe(10_000);
    expect(res.meta.costUsd).toBeGreaterThan(0);
  });

  it('keeps a suggestion whose claims equal a deterministic finding\'s claims, and counts it in the run meta', async () => {
    const f = runChecks(ix).find((x) => x.claims.length && x.claims.every((c) => c.startsWith('line:')))!;
    const echo = row(f.claims.map((c) => c.slice(5)));
    const { fetch } = fakeFetch(() => final({ suggestions: [echo, row()], proposals: [] }));
    const res = await runAgent(opts(fetch));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.payload.suggestions).toHaveLength(2);
    expect(res.payload.rejected).toEqual([]);
    expect(res.meta.onFindingClaims).toEqual({ count: 1, ids: [res.payload.suggestions[0].id] });
  });

  it('validates proposals: words only, no code, no names, bounded', () => {
    expect(validateProposal(ix, proposal()).proposal).toEqual(proposal());
    expect(validateProposal(ix, { ...proposal(), rule: 'if (line.value > 0) return true;' }).reason).toMatch(/code/);
    expect(validateProposal(ix, { ...proposal(), rule: '```js\nx\n```' }).reason).toMatch(/code/);
    expect(validateProposal(ix, { ...proposal(), compares: [] }).reason).toMatch(/compares/);
    expect(validateProposal(ix, { ...proposal(), firesWhen: '' }).reason).toMatch(/firesWhen/);
    expect(validateProposal(ix, { ...proposal(), rule: Array(81).fill('w').join(' ') }).reason).toMatch(/words/);
    expect(validateProposal(ix, { ...proposal(), silentWhen: 'id 123-45-6789' }).reason).toMatch(/SSN/);
  });
});

describe('agent: measurement modes', () => {
  it('blind: five tools, a prompt that names neither removed tool, mode in the meta and the prompt version', async () => {
    const { fetch, calls } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    const res = await runAgent(opts(fetch, { mode: { kind: 'blind' } }));
    expect(res.ok).toBe(true);
    expect(calls[0].body.tools).toHaveLength(5);
    expect(calls[0].body.system[0].text).not.toMatch(/run_checks|find_fact_copies/);
    expect(agentSystemPrompt({ kind: 'default' })).toBe(AGENT_SYSTEM_PROMPT);
    expect(res.meta).toMatchObject({ mode: 'blind', seed: null, hiddenCheckIds: [] });
    expect(res.ok && res.payload.promptVersion).toBe('agent-v1-blind');
  });

  it('hide-checks: the seed and the hidden check ids in the meta (never in a request), the prompt version names the seed', async () => {
    const { fetch, calls } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    const res = await runAgent(opts(fetch, { mode: { kind: 'hide-checks', seed: 7 } }));
    expect(res.ok).toBe(true);
    expect(calls[0].body.tools).toHaveLength(7);
    expect(res.meta).toMatchObject({ mode: 'hide-checks', seed: 7, hiddenCheckIds: hiddenCheckIds(7) });
    expect(res.ok && res.payload.promptVersion).toBe('agent-v1-hide-7');
  });

  it('default mode is unchanged: seven tools, prompt version agent-v1', async () => {
    const { fetch, calls } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    const res = await runAgent(opts(fetch));
    expect(calls[0].body.tools).toHaveLength(7);
    expect(calls[0].body.system[0].text).toBe(AGENT_SYSTEM_PROMPT);
    expect(res.meta).toMatchObject({ mode: 'default', seed: null, hiddenCheckIds: [] });
    expect(res.ok && res.payload.promptVersion).toBe('agent-v1');
  });

  it('the CLI writes each mode to its own file', () => {
    expect(agentOutFile('/r', { kind: 'default' }, 'real')).toBe(path.join('/r', 'ai', 'eval', 'agent-suggestions.json'));
    expect(agentOutFile('/r', { kind: 'blind' }, 'real')).toBe(path.join('/r', 'ai', 'eval', 'agent-suggestions.blind.json'));
    expect(agentOutFile('/r', { kind: 'hide-checks', seed: 7 }, 'altered')).toBe(path.join('/r', 'ai', 'eval', 'agent-suggestions.hide-7.altered.json'));
  });
});

describe('agent: writing the run', () => {
  it('a failed run writes nothing; a good run writes the payload and its run meta', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'agent-'));
    const out = path.join(dir, 'agent-suggestions.json');
    const bad = await runAgent(opts(fakeFetch(() => message([{ type: 'text', text: 'x' }], 'max_tokens')).fetch));
    expect(writeRun(bad, out)).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
    const good = await runAgent(opts(fakeFetch(() => final({ suggestions: [row()], proposals: [] })).fetch));
    expect(writeRun(good, out)).toBe(true);
    expect(existsSync(out)).toBe(true);
    const meta = JSON.parse(readFileSync(out.replace(/\.json$/, '.run-meta.json'), 'utf8'));
    for (const k of ['requestedModel', 'servedModels', 'promptVersion', 'turns', 'toolCalls', 'usage', 'costUsd', 'seconds', 'limits', 'mode', 'onFindingClaims']) expect(meta, k).toHaveProperty(k);
    expect(meta.mode).toBe('default');
  });
});
