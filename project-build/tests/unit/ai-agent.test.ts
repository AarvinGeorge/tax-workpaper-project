// The AI agent loop (ai/lib/agent-core.ts) over the SDK tool runner. No network and no spend: the SDK client gets an
// injected fetch that plays a scripted model and returns real Response objects.
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { LEDGER, runChecks } from '@/domain/checks/index';
import { SSN_SHAPED } from '@/domain/ai/verify';
import { AI_AUTHORITIES, AI_KINDS } from '@/domain/ai/contract';
import { SsnInToolResult, agentTools, toolNamesFor } from '../../ai/lib/agent-tools';
import {
  AGENT_BETAS, AGENT_DEFAULT_MODEL, AGENT_EFFORT, AGENT_PROMPT_VERSION, AGENT_SYSTEM_PROMPT, MAX_RETRIES, REQUEST_TIMEOUT_MS,
  agentContext, agentOutFile, agentSystemPrompt, loadContextFiles, makeClient, runAgent, validateProposal, writeRun, type AgentRunOptions,
  AGENT_V4_PROMPT_VERSION, agentPromptFrom, promptVersionFor,
} from '../../ai/lib/agent-core';
import { createHash } from 'node:crypto';
import { VERIFY_METHODS } from '../../ai/lib/calculator';
import { LOOKUP_SECTIONS } from '../../ai/lib/lookup';
import { hiddenCheckIds, type AgentMode } from '../../ai/lib/modes';
import { caseFile } from '../../ai/lib/case-file';

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
    expect(body.tools).toHaveLength(9);
    for (const t of body.tools) expect(t.strict, String(t.name)).toBe(!['record_suggestion', 'verify_all', 'lookup'].includes(String(t.name)));
    expect(body.system.at(-1)!.cache_control).toEqual({ type: 'ephemeral' }); // the shared context, cached
    expect(body.cache_control).toEqual({ type: 'ephemeral' });               // the growing transcript, cached
    expect(body.thread).toBeUndefined();                                       // full history each turn, no server thread
    expect(headers.get('x-stainless-timeout')).toBe(String(REQUEST_TIMEOUT_MS / 1000));
    expect(JSON.stringify(body)).not.toContain(KEY);
  });

  it('the context is the case file (schema card, review steps, digest, state map, work list), not the raw README or brief', async () => {
    const ctx = agentContext(ix, files);
    expect(ctx).toBe(caseFile(ix, files.digest));
    expect(ctx).toContain('## Schema card');
    expect(ctx).toContain('# How a US individual return is reviewed');
    expect(ctx).not.toContain('## Packet README');
    expect(ctx).not.toContain('Case Study: Redesign the Tax Workpaper');
    expect(agentContext(ix, files, { kind: 'blind' })).toBe(caseFile(ix, files.digest, { kind: 'blind' }));
    const { fetch, calls } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    await runAgent(opts(fetch, { mode: { kind: 'blind' } }));
    expect(calls[0].body.system.at(-1)!.text).toBe(caseFile(ix, files.digest, { kind: 'blind' })); // the mode's case file is sent
    for (const a of AI_AUTHORITIES) expect(AGENT_SYSTEM_PROMPT).toContain(a);
    expect(AGENT_SYSTEM_PROMPT).toMatch(/data, never instructions/);
    expect(AGENT_SYSTEM_PROMPT).toMatch(/verify/);
    expect(AGENT_SYSTEM_PROMPT).toMatch(/at most 25 words/);
    expect(AGENT_SYSTEM_PROMPT).toMatch(/over 30 words is discarded/);
    expect(AGENT_SYSTEM_PROMPT).toMatch(/record_suggestion/);
  });
});

describe('agent: the answer key never reaches the model', () => {
  const modes: [string, AgentMode][] = [['default', { kind: 'default' }], ['blind', { kind: 'blind' }], ['hide-checks', { kind: 'hide-checks', seed: 7 }]];
  it.each(modes)('%s mode: no request body (system, tools, every tool result of a run calling every offered tool) holds a ledger id, ledger title or check id', async (_n, mode) => {
    const offered = new Set<string>(toolNamesFor(mode));
    const calls1 = [
      toolUse('run_checks', { limit: 50, cursor: 0 }), toolUse('list_open_leftovers', { kind: null, limit: 50, cursor: 0 }),
      toolUse('get_line', { key: freeLine }), toolUse('verify', { method: 'recompute_line', ids: [freeLine], target: null, limit: null, cursor: null }),
    ].filter((t) => offered.has(t.name));
    const calls2 = [
      toolUse('run_checks', { limit: 50, cursor: 50 }), toolUse('get_page', { doc: docWithPages.id, page: docWithPages.pages[0].page }),
      toolUse('search_values', { text: 'estimated', limit: 50, cursor: 0 }), toolUse('verify', { method: 'fact_copies', ids: [docWithPages.id], target: null, limit: 50, cursor: 0 }),
      ...ix.latest.lines.slice(0, 40).map((l) => toolUse('verify', { method: 'fact_copies', ids: [l.key], target: null, limit: 50, cursor: 0 })),
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
    for (const f of ['ai/lib/agent-core.ts', 'ai/lib/agent-tools.ts', 'ai/lib/agent-packet.ts', 'ai/lib/modes.ts', 'ai/agent.ts', 'ai/lib/planted-score.ts', 'tests/fixtures/perturbed.ts', 'ai/lib/verify-all.ts', 'tests/unit/ai-agent-verify-all.test.ts', 'ai/lib/calculator.ts', 'ai/lib/duplicates.ts', 'tests/unit/ai-agent-calculator.test.ts', 'ai/lib/lookup.ts', 'tests/unit/ai-agent-lookup.test.ts', 'ai/lib/prompt-v4.ts']) {
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
    expect(AGENT_PROMPT_VERSION).toBe('agent-v3');
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

  it('accepts plain words that merely contain code-like words or field names, still refuses real code', () => {
    const ok = (over: object) => validateProposal(ix, { ...proposal(), ...over });
    // The two real rejected proposals: "return" (tax return, in return) and schema field names in compares.
    expect(ok({
      rule: 'A cash gift of 250 or more needs a written receipt that says whether the charity gave any goods or services in return.',
      compares: ['donation_receipt printed text (goods or services statement)', 'extracted amount confidence', 'SchA.11 sources'],
    }).proposal).toBeDefined();
    expect(ok({
      firesWhen: 'The K-1 tax year is missing from the prior return and the let-through income was not reported.',
      compares: ['K-1 tax year and box 1 income', 'prior-year return lines for the same entity'],
    }).proposal).toBeDefined();
    expect(ok({ firesWhen: 'The prior return (Form 1040, 2024) shows the K-1 income and the new packet does not.' }).proposal).toBeDefined();
    expect(ok({ rule: 'Compare the 2024 return [as filed] with the current lines.' }).proposal).toBeDefined();
    for (const bad of ['if (line.value > 0) return true;', 'const total = a + b', 'let x = 1', 'function check(a) { }', 'items.map(x => x.value)', 'compare(a, b);', 'x = 1;', 'return line.value;']) {
      expect(ok({ rule: bad }).reason, bad).toMatch(/code/);
      expect(ok({ compares: [bad] }).reason, bad).toMatch(/code/);
    }
  });
});

describe('agent: measurement modes', () => {
  it('blind: eight tools (every tool but run_checks), a prompt that never names run_checks, mode in the meta and the prompt version', async () => {
    const { fetch, calls } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    const res = await runAgent(opts(fetch, { mode: { kind: 'blind' } }));
    expect(res.ok).toBe(true);
    expect(calls[0].body.tools).toHaveLength(8);
    expect(calls[0].body.system[0].text).not.toMatch(/run_checks/);
    expect(agentSystemPrompt({ kind: 'default' })).toBe(AGENT_SYSTEM_PROMPT);
    expect(res.meta).toMatchObject({ mode: 'blind', seed: null, hiddenCheckIds: [] });
    expect(res.ok && res.payload.promptVersion).toBe('agent-v3-blind');
  });

  it('hide-checks: the seed and the hidden check ids in the meta (never in a request), the prompt version names the seed', async () => {
    const { fetch, calls } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    const res = await runAgent(opts(fetch, { mode: { kind: 'hide-checks', seed: 7 } }));
    expect(res.ok).toBe(true);
    expect(calls[0].body.tools).toHaveLength(9);
    expect(res.meta).toMatchObject({ mode: 'hide-checks', seed: 7, hiddenCheckIds: hiddenCheckIds(7) });
    expect(res.ok && res.payload.promptVersion).toBe('agent-v3-hide-7');
  });

  it('default mode: nine tools, prompt version agent-v3', async () => {
    const { fetch, calls } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    const res = await runAgent(opts(fetch));
    expect(calls[0].body.tools).toHaveLength(9);
    expect(calls[0].body.system[0].text).toBe(AGENT_SYSTEM_PROMPT);
    expect(res.meta).toMatchObject({ mode: 'default', seed: null, hiddenCheckIds: [] });
    expect(res.ok && res.payload.promptVersion).toBe('agent-v3');
  });

  it('the CLI writes each mode to its own file, under ai/eval/runs/<version>/ (Task 6: never the live payload without --live)', () => {
    expect(agentOutFile('/r', { kind: 'default' }, 'real')).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v3', 'default.real.1.json'));
    expect(agentOutFile('/r', { kind: 'blind' }, 'real')).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v3', 'blind.real.1.json'));
    expect(agentOutFile('/r', { kind: 'hide-checks', seed: 7 }, 'altered')).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v3', 'hide-7.altered.1.json'));
  });
});

describe('agent: prompt agent-v4 (a numbered CPA routine behind --prompt v4)', () => {
  const sha = (s: string) => createHash('sha256').update(s).digest('hex');
  const BLIND: AgentMode = { kind: 'blind' };
  const DEF: AgentMode = { kind: 'default' };

  it('v3 is untouched: the default prompt per mode is byte-identical to agent-v3 as committed before v4', () => {
    // sha256 of agentSystemPrompt(mode) taken at ec951f6, before agent-v4 existed.
    const V3 = { default: '0c35122d334fa41713611b3f1d32b35a59724e40e7f62f1c0648b2e3ac073908', blind: '84f05f07e8586e677abeb5116a718b03af209d9104db07d69d1d9ad6af75a8e4' };
    for (const m of [DEF, { kind: 'hide-checks', seed: 7 }] as AgentMode[]) { expect(sha(agentSystemPrompt(m))).toBe(V3.default); expect(agentSystemPrompt(m, 'v3')).toBe(agentSystemPrompt(m)); }
    for (const m of [BLIND, { kind: 'blind-v3' }] as AgentMode[]) { expect(sha(agentSystemPrompt(m))).toBe(V3.blind); expect(agentSystemPrompt(m, 'v3')).toBe(agentSystemPrompt(m)); }
    expect(AGENT_PROMPT_VERSION).toBe('agent-v3');
    expect(promptVersionFor(DEF)).toBe('agent-v3');
  });

  it('version strings agent-v4 and agent-v4-blind', () => {
    expect(AGENT_V4_PROMPT_VERSION).toBe('agent-v4');
    expect(promptVersionFor(DEF, 'v4')).toBe('agent-v4');
    expect(promptVersionFor(BLIND, 'v4')).toBe('agent-v4-blind');
    expect(promptVersionFor({ kind: 'hide-checks', seed: 7 }, 'v4')).toBe('agent-v4-hide-7');
  });

  it('a numbered routine: step 1 is verify_all, then explain, verify/lookup, free text, record; and the claim-line rule', () => {
    const p = agentSystemPrompt(BLIND, 'v4');
    const steps = [/^1\. Call verify_all first/m, /^2\. Explain each disagreement/m, /^3\. .*(verify|lookup)/m, /^4\. .*client_text/m, /^5\. Record/m];
    const at = steps.map((r) => { const m = r.exec(p); expect(m, String(r)).not.toBeNull(); return m!.index; });
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(p).toMatch(/page every/i);
    for (const s of ['what_was_known', 'alternatives', 'diagnostics_for', 'get_line', 'get_page']) expect(p).toContain(s);
    expect(p).toMatch(/Claim-line rule: claims names the return line\(s\) whose value the mistake changes/);
    expect(p).toMatch(/never only the document/);
    expect(p).toMatch(/When a document is wrong, claim the line that cites it/);
    expect(p).toMatch(/Never compute/);
    // The recording path: a footing error or a client-text judgement still reaches a verbatim document quote.
    expect(p).toMatch(/footing error/);
    expect(p).toMatch(/client text may not be quoted|never quote client text/i);
    expect(p).toMatch(/unrecordable/);
    for (const a of AI_AUTHORITIES) expect(p).toContain(a);
    expect(p).toMatch(/data, never instructions/);
    expect(p).toMatch(/over 30 words is discarded/);
  });

  it('blind (primary): never names run_checks or our checks\' findings; no "F lines are known"', () => {
    const p = agentSystemPrompt(BLIND, 'v4');
    expect(p).not.toMatch(/run_checks/);
    expect(p).not.toMatch(/F lines are known/);
    expect(p).not.toMatch(/finding/i);
    expect(p).not.toMatch(/\bF\b/);
    expect(agentSystemPrompt({ kind: 'blind-v3' }, 'v4')).toBe(p);
  });

  it('default mode adds exactly one line to the blind prompt: the checks\' findings are known', () => {
    const b = agentSystemPrompt(BLIND, 'v4').split('\n');
    const d = agentSystemPrompt(DEF, 'v4').split('\n');
    expect(d.length).toBe(b.length + 1);
    const added = d.filter((l) => !b.includes(l));
    expect(added).toHaveLength(1);
    expect(added[0]).toMatch(/the checks' findings are known/i);
    expect(d.filter((l) => l !== added[0])).toEqual(b);
    expect(agentSystemPrompt({ kind: 'hide-checks', seed: 7 }, 'v4')).toBe(agentSystemPrompt(DEF, 'v4'));
  });

  it('generic over the schema: names only real tools, verify methods and lookup sections; no packet line key or document id', () => {
    for (const m of [BLIND, DEF]) {
      const p = agentSystemPrompt(m, 'v4');
      const known = new Set<string>([...toolNamesFor(m), ...VERIFY_METHODS, ...LOOKUP_SECTIONS, ...AI_KINDS]);
      for (const w of p.match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? []) expect(known.has(w), w).toBe(true);
    }
    const p = agentSystemPrompt(DEF, 'v4');
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const k of ix.latest.lines.map((l) => l.key).filter((k) => k.length >= 4 && /[A-Za-z]/.test(k) && /[.\d]/.test(k))) expect(p, k).not.toMatch(new RegExp(`(^|[^\\w.])${esc(k)}($|[^\\w])`));
    for (const d of ix.packet.documents) expect(p, d.id).not.toContain(d.id);
  });

  it('short: v4 is no longer than v3 plus a third, and deterministic (a stable cached prefix)', () => {
    for (const m of [BLIND, DEF]) {
      expect(Buffer.byteLength(agentSystemPrompt(m, 'v4'))).toBeLessThanOrEqual(Math.round(Buffer.byteLength(agentSystemPrompt(m)) * 4 / 3));
      expect(agentSystemPrompt(m, 'v4')).toBe(agentSystemPrompt(m, 'v4'));
    }
  });

  it('runAgent with prompt v4: sends the v4 prompt on every turn, the same context, and records agent-v4-blind', async () => {
    const { fetch, calls } = fakeFetch((_b, n) => (n === 1 ? message([toolUse('verify_all', { kind: 'differs', limit: 5, cursor: 0 })], 'tool_use') : final({ suggestions: [], proposals: [] })));
    const res = await runAgent(opts(fetch, { mode: BLIND, prompt: 'v4' }));
    expect(res.ok).toBe(true);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const c of calls) {
      expect(c.body.system[0].text).toBe(agentSystemPrompt(BLIND, 'v4'));
      expect(c.body.system.at(-1)!.text).toBe(agentContext(ix, files, BLIND, 'v4')); // the independent wording (Task 6)
      expect(c.body.system.at(-1)!.text).toBe(caseFile(ix, files.digest, BLIND, { independent: true }));
      expect(c.body.tools.map((t) => t.name)).not.toContain('run_checks');
    }
    expect(res.meta.promptVersion).toBe('agent-v4-blind');
    expect(res.trace.promptVersion).toBe('agent-v4-blind');
    expect(res.ok && res.payload.promptVersion).toBe('agent-v4-blind');
  });

  it('without the flag the run is agent-v3, byte for byte', async () => {
    const { fetch, calls } = fakeFetch(() => final({ suggestions: [], proposals: [] }));
    const res = await runAgent(opts(fetch));
    expect(calls[0].body.system[0].text).toBe(AGENT_SYSTEM_PROMPT);
    expect(res.ok && res.payload.promptVersion).toBe('agent-v3');
  });

  it('--prompt parses v3 or v4 only (absent is v3), and a v4 run never writes the live payload file', () => {
    expect(agentPromptFrom(undefined)).toBe('v3');
    expect(agentPromptFrom('v3')).toBe('v3');
    expect(agentPromptFrom('v4')).toBe('v4');
    for (const bad of ['', 'v5', 'V4', 'agent-v4']) expect(() => agentPromptFrom(bad), bad).toThrow(/--prompt/);
    expect(agentOutFile('/r', DEF, 'real', undefined, 'v4')).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v4', 'default.real.1.json'));
    expect(agentOutFile('/r', BLIND, 'perturbed', 5, 'v4')).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v4', 'blind.seed-5.1.json'));
    expect(agentOutFile('/r', DEF, 'real', undefined, 'v3')).toBe(path.join('/r', 'ai', 'eval', 'runs', 'agent-v3', 'default.real.1.json'));
  });
});

describe('agent: writing the run', () => {
  it('a failed run writes only its trace; a good run writes the payload and its run meta', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'agent-'));
    const out = path.join(dir, 'agent-suggestions.json');
    const bad = await runAgent(opts(fakeFetch(() => message([{ type: 'text', text: 'x' }], 'max_tokens')).fetch));
    expect(writeRun(bad, out)).toBe(false);
    expect(readdirSync(dir)).toEqual(['agent-suggestions.trace.json']); // only the trace: a failed run is when it is needed
    const good = await runAgent(opts(fakeFetch(() => final({ suggestions: [row()], proposals: [] })).fetch));
    expect(writeRun(good, out)).toBe(true);
    expect(existsSync(out)).toBe(true);
    const meta = JSON.parse(readFileSync(out.replace(/\.json$/, '.run-meta.json'), 'utf8'));
    for (const k of ['requestedModel', 'servedModels', 'promptVersion', 'turns', 'toolCalls', 'usage', 'costUsd', 'seconds', 'limits', 'mode', 'onFindingClaims']) expect(meta, k).toHaveProperty(k);
    expect(meta.mode).toBe('default');
  });
});

describe('agent: the per-turn trace', () => {
  const thinking = { type: 'thinking', thinking: 'PRIVATE-THOUGHT-never-in-the-trace', signature: 'sig' };
  const twoToolTurns: Script = (_b, turn) => turn === 1
    ? message([thinking, { type: 'text', text: 'Looking at the open lines first.' }, toolUse('get_line', { key: freeLine }), toolUse('list_open_leftovers', { kind: 'all', limit: 5, cursor: 0 })], 'tool_use')
    : turn === 2 ? message([thinking, toolUse('verify', { method: 'recompute_line', ids: [freeLine], target: null, limit: null, cursor: null })], 'tool_use')
      : message([thinking, { type: 'text', text: JSON.stringify({ suggestions: [], proposals: [] }) }], 'end_turn');

  it('one entry per turn: stop reason, each tool call with its input and a result summary, usage, running cost, visible text', async () => {
    const res = await runAgent(opts(fakeFetch(twoToolTurns).fetch));
    expect(res.ok).toBe(true);
    const t = res.trace;
    expect(t.turns).toHaveLength(3);
    expect(t.turns.map((x) => x.turn)).toEqual([1, 2, 3]);
    expect(t.turns.map((x) => x.stopReason)).toEqual(['tool_use', 'tool_use', 'end_turn']);
    expect(t.turns[0].toolCalls.map((c) => c.name)).toEqual(['get_line', 'list_open_leftovers']);
    expect(t.turns[0].toolCalls[0].input).toEqual({ key: freeLine });
    expect(t.turns[0].toolCalls[0].result).toMatchObject({ error: false });
    expect(t.turns[0].toolCalls[0].result!.bytes).toBeGreaterThan(0);
    expect(t.turns[0].toolCalls[1].result).toMatchObject({ error: false, items: 5 });
    expect(t.turns[0].toolCalls[1].result!.total).toBeGreaterThan(5);
    expect(t.turns[1].toolCalls.map((c) => c.name)).toEqual(['verify']);
    expect(t.turns[0].text).toBe('Looking at the open lines first.');
    expect(t.turns[0].usage.output_tokens).toBe(200);
    expect(t.turns[2].costUsd).toBeGreaterThan(t.turns[0].costUsd);
    expect(t.endedBy).toBe('end_turn');
    expect(JSON.stringify(t)).not.toContain('PRIVATE-THOUGHT');
  });

  it('reserved final turn: a run that keeps calling tools is asked for its answer, with no tools usable, and ends with it', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'agent-trace-'));
    const out = path.join(dir, 'agent-suggestions.json');
    const always: Script = (body) => (body.tool_choice && (body.tool_choice as { type: string }).type === 'none')
      ? final({ suggestions: [], proposals: [] })
      : message([toolUse('get_line', { key: freeLine })], 'tool_use');
    const { fetch, calls } = fakeFetch(always);
    const res = await runAgent(opts(fetch, { limits: { maxIterations: 3 } }));
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(3); // two working turns, then the reserved one: never more than the limit
    const last = calls.at(-1)!.body;
    expect(last.tool_choice).toEqual({ type: 'none' });
    expect(last.tools).toHaveLength(9); // definitions unchanged, so the cached prefix holds
    expect(JSON.stringify(last.messages.at(-1))).toContain('Final turn: answer now with JSON only');
    expect(JSON.stringify(last.messages)).toContain('tool_result'); // the last working turn's calls were answered first
    expect(res.trace.endedBy).toBe('final_turn');
    expect(res.trace.turns).toHaveLength(3);
    expect(writeRun(res, out)).toBe(true);
    expect(JSON.parse(readFileSync(out.replace(/\.json$/, '.trace.json'), 'utf8')).endedBy).toBe('final_turn');
  });

  it('reserved final turn also when the cost nears its limit', async () => {
    const always: Script = (body) => (body.tool_choice && (body.tool_choice as { type: string }).type === 'none')
      ? final({ suggestions: [], proposals: [] })
      : message([toolUse('get_line', { key: freeLine })], 'tool_use');
    const { fetch, calls } = fakeFetch(always);
    const res = await runAgent(opts(fetch, { limits: { maxCostUsd: 0.1 } })); // ~0.009 a turn: 90% after about 10
    expect(res.ok).toBe(true);
    expect(res.trace.endedBy).toBe('final_turn');
    expect(calls.length).toBeLessThan(40);
    expect(calls.at(-1)!.body.tool_choice).toEqual({ type: 'none' });
  });

  it('every tool result tells the model its budget: turn k of N', async () => {
    const { fetch, calls } = fakeFetch(twoToolTurns);
    await runAgent(opts(fetch));
    const second = JSON.stringify(calls[1].body.messages);
    expect(second).toMatch(/turn 1 of 40/);
    expect(JSON.stringify(calls[2].body.messages)).toMatch(/turn 2 of 40/);
  });

  it('record_suggestion: recorded rows reach the payload though the final JSON is empty; a repeat in the final JSON is not doubled', async () => {
    const rec: Script = (_b, turn) => turn === 1 ? message([toolUse('record_suggestion', row())], 'tool_use')
      : final({ suggestions: turn === 2 ? [row()] : [], proposals: [] });
    const res = await runAgent(opts(fakeFetch(rec).fetch));
    expect(res.ok).toBe(true);
    expect(res.ok && res.payload.suggestions).toHaveLength(1);
    const empty: Script = (_b, turn) => turn === 1 ? message([toolUse('record_suggestion', row())], 'tool_use') : final({ suggestions: [], proposals: [] });
    const r2 = await runAgent(opts(fakeFetch(empty).fetch));
    expect(r2.ok && r2.payload.suggestions).toHaveLength(1);
  });

  it('a good run writes the trace beside the payload', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'agent-trace-'));
    const out = path.join(dir, 'agent-suggestions.json');
    const res = await runAgent(opts(fakeFetch(twoToolTurns).fetch));
    expect(writeRun(res, out)).toBe(true);
    expect(readdirSync(dir).sort()).toEqual(['agent-suggestions.json', 'agent-suggestions.run-meta.json', 'agent-suggestions.trace.json']);
  });

  it('no SSN shape reaches the trace: model text and tool inputs are masked, and a hit fails closed', async () => {
    const leaky: Script = (_b, turn) => turn === 1
      ? message([{ type: 'text', text: 'The number 123-45-6789 looks odd.' }, toolUse('search_values', { text: '123-45-6789', limit: 5, cursor: 0 })], 'tool_use')
      : final({ suggestions: [], proposals: [] });
    const res = await runAgent(opts(fakeFetch(leaky).fetch));
    const text = JSON.stringify(res.trace);
    expect(SSN_SHAPED.test(text)).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/SSN/); // fail closed if masking could not remove it
  });
});
